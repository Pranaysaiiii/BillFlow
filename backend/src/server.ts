import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || 'https://jircrzvfwzlywzxvyfzw.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const llmApiKey = process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Mock database memory for instantaneous hackathon testing
const mockDB = {
  businesses: [
    { id: 'biz_001', name: 'Mahalaxmi Hardware Mart', state: 'Maharashtra', gstin: '27AABCU9603R1ZM' }
  ],
  customers: [
    { id: 'cust_001', businessId: 'biz_001', name: 'Rajesh Traders', state: 'Maharashtra', gstin: '27AAPFU0939F1ZV', phone: '+919876543210' },
    { id: 'cust_002', businessId: 'biz_001', name: 'Verma Electricals', state: 'Maharashtra', gstin: '27AABCV1234D1Z5', phone: '+919811223344' },
    { id: 'cust_003', businessId: 'biz_001', name: 'Delhi Wholesale Mart', state: 'Delhi', gstin: '07AAACD9876E1ZT', phone: '+919988776655' }
  ],
  products: [
    { id: 'prod_001', businessId: 'biz_001', name: 'PVC Pipe 25mm', unit_price: 850, gst_rate: 18, hsn_code: '3917' },
    { id: 'prod_002', businessId: 'biz_001', name: 'Ultratech Cement 50kg', unit_price: 380, gst_rate: 28, hsn_code: '2523' },
    { id: 'prod_003', businessId: 'biz_001', name: 'Havells 1.5mm Wire', unit_price: 1450, gst_rate: 18, hsn_code: '8544' }
  ],
  previousOrders: [
    { customerId: 'cust_001', product: 'PVC Pipe 25mm', quantity: 20, unitPrice: 850, gstRate: 18, date: '2026-09-04' }
  ],
  orders: [] as any[],
  invoices: [] as any[]
};

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BillFlow AI Edge Backend',
    supabaseConnected: !!supabase,
    timestamp: new Date().toISOString()
  });
});

// Process Order Core Logic (Reused by server & tests)
export async function processOrderLogic(body: {
  businessId?: string;
  customerId?: string;
  message?: string;
  rawText?: string;
}) {
  const message = body.message || body.rawText || '';
  const businessId = body.businessId || 'biz_001';
  const customerId = body.customerId || 'cust_001';

  if (!message || !message.trim()) {
    throw new Error('Message is required');
  }

  // 1. Read Business Memory (Business, Customer, Products, Previous Orders)
  let business = mockDB.businesses.find(b => b.id === businessId) || mockDB.businesses[0];
  let customer = mockDB.customers.find(c => c.id === customerId) || mockDB.customers[0];
  let productCatalog = mockDB.products.filter(p => p.businessId === businessId);
  let previousOrders = mockDB.previousOrders.filter(p => p.customerId === customerId);

  if (supabase) {
    try {
      const [bRes, cRes, pRes, oRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', businessId).maybeSingle(),
        supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
        supabase.from('products').select('*').eq('business_id', businessId),
        supabase.from('orders').select('id, created_at, order_items ( product_name, quantity, unit_price, gst_rate )').eq('customer_id', customerId).limit(2)
      ]);
      if (bRes.data) business = bRes.data;
      if (cRes.data) customer = cRes.data;
      if (pRes.data && pRes.data.length > 0) productCatalog = pRes.data;
      if (oRes.data && oRes.data.length > 0) {
        previousOrders = oRes.data.flatMap((o: any) =>
          (o.order_items || []).map((it: any) => ({
            product: it.product_name,
            quantity: it.quantity,
            unitPrice: it.unit_price,
            gstRate: it.gst_rate
          }))
        );
      }
    } catch (err) {
      console.warn('Supabase read warning, using memory cache:', err);
    }
  }

  // 2. LLM Extraction with Memory Context
  const isMemoryPrompted = /same as|last week|last time|usual|pichli/i.test(message);

  let extracted = {
    customerName: customer.name,
    items: [] as Array<{ productName: string; quantity: number; unitPrice: number; gstRate: number }>,
    confidence: 0.94,
    memoryUsed: isMemoryPrompted,
    warnings: [] as string[]
  };

  if (llmApiKey) {
    try {
      const prompt = `You are an order extraction engine for an Indian small-business invoicing system.
Convert the customer's message into structured JSON.
Use the supplied business memory when the message refers to previous orders.
Never invent a product, price, GST rate, or customer detail.
If required information cannot be determined, report a warning.
Return JSON only matching:
{
  "customerName": string,
  "items": [{"productName": string, "quantity": number, "unitPrice": number, "gstRate": number}],
  "confidence": number,
  "memoryUsed": boolean,
  "warnings": string[]
}

CUSTOMER: ${JSON.stringify(customer)}
PRODUCT CATALOG: ${JSON.stringify(productCatalog)}
PREVIOUS ORDERS: ${JSON.stringify(previousOrders)}
NEW MESSAGE: "${message}"`;

      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${llmApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
        })
      });
      const aiJson: any = await aiRes.json();
      const rawText = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) extracted = JSON.parse(rawText);
    } catch (e) {
      console.warn('LLM call failed, using deterministic parser');
    }
  }

  // Fallback deterministic interpreter if items empty
  if (extracted.items.length === 0) {
    const qtyMatch = message.match(/(\d+)\s*(?:more|piece|pcs|pipes|bags)?/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 10;
    const matchedProd = productCatalog.find(p => message.toLowerCase().includes(p.name.toLowerCase())) || productCatalog[0];
    
    // Check if price was explicitly overridden in text (e.g. "@ 1500", "at 1500", or "price 1500")
    const priceOverrideMatch = message.match(/(?:@|at|rate|price|rs|₹)\s*(\d+)/i);
    const priceOverride = priceOverrideMatch ? parseInt(priceOverrideMatch[1], 10) : undefined;

    const lastOrder = previousOrders.find(p => p.product.toLowerCase().includes(matchedProd.name.toLowerCase()));
    const unitPrice = priceOverride || (isMemoryPrompted && lastOrder ? lastOrder.unitPrice : matchedProd.unit_price);

    extracted.items.push({
      productName: matchedProd.name,
      quantity: qty,
      unitPrice,
      gstRate: matchedProd.gst_rate
    });
    extracted.memoryUsed = isMemoryPrompted && !priceOverride;
  }

  // 3. Invoice Guardian Checks
  const guardianWarnings: any[] = [];
  const memoryUsed = extracted.memoryUsed;

  for (const item of extracted.items) {
    const prev = previousOrders.find(p => p.product.toLowerCase().includes(item.productName.toLowerCase()));
    if (prev && item.unitPrice !== prev.unitPrice) {
      guardianWarnings.push({
        type: 'price_change',
        severity: 'high',
        message: `Price changed from ₹${prev.unitPrice} to ₹${item.unitPrice}`,
        previousValue: prev.unitPrice,
        currentValue: item.unitPrice
      });
    }

    if (item.quantity <= 0) {
      guardianWarnings.push({
        type: 'invalid_quantity',
        severity: 'high',
        message: `Quantity for "${item.productName}" must be greater than 0.`
      });
    }
  }

  if (!customer.gstin) {
    guardianWarnings.push({
      type: 'missing_gstin',
      severity: 'medium',
      message: 'Customer GSTIN is missing. Invoice treated as unregistered B2C.'
    });
  }

  const guardianStatus = guardianWarnings.some(w => w.severity === 'high') ? 'warning' : 'ok';
  const orderStatus = guardianStatus === 'warning' ? 'needs_review' : 'confirmed';

  // 4. Deterministic GST Calculation
  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  const isIntraState = business.state.toLowerCase().trim() === customer.state.toLowerCase().trim();

  for (const item of extracted.items) {
    const lineSubtotal = Math.round((item.quantity * item.unitPrice) * 100) / 100;
    subtotal += lineSubtotal;

    const gstAmount = Math.round((lineSubtotal * item.gstRate / 100) * 100) / 100;
    if (isIntraState) {
      cgst += Math.round((gstAmount / 2) * 100) / 100;
      sgst += Math.round((gstAmount / 2) * 100) / 100;
    } else {
      igst += gstAmount;
    }
  }

  const total = Math.round((subtotal + cgst + sgst + igst) * 100) / 100;
  const orderId = `order-${Date.now()}`;

  // 5. Clean Structured JSON Response (Step 11 Contract)
  const responsePayload = {
    order: {
      id: orderId,
      status: orderStatus
    },
    extraction: {
      customerName: extracted.customerName,
      items: extracted.items,
      confidence: extracted.confidence
    },
    memory: {
      used: memoryUsed,
      source: memoryUsed ? 'previous_order' : 'none'
    },
    guardian: {
      status: guardianStatus,
      warnings: guardianWarnings
    },
    invoice: {
      subtotal,
      cgst,
      sgst,
      igst,
      total
    }
  };

  // 6. Save in memory/Supabase
  mockDB.orders.unshift({ id: orderId, ...responsePayload });

  if (supabase) {
    try {
      await supabase.from('orders').insert({
        id: orderId,
        business_id: business.id,
        customer_id: customer.id,
        raw_message: message,
        status: orderStatus,
        ai_confidence: extracted.confidence,
        memory_used: memoryUsed
      });

      await supabase.from('invoices').insert({
        order_id: orderId,
        customer_id: customer.id,
        invoice_number: `INV-2026-${Date.now().toString().slice(-4)}`,
        subtotal,
        cgst,
        sgst,
        igst,
        total,
        status: orderStatus === 'needs_review' ? 'pending_review' : 'issued'
      });
    } catch (e) {
      console.warn('Supabase async write:', e);
    }
  }

  return responsePayload;
}

// POST /process-order (and /api/process-order for flexibility)
app.post(['/process-order', '/api/process-order'], async (req, res) => {
  try {
    const result = await processOrderLogic(req.body);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /invoices (and /api/invoices for Web Dashboard)
app.get(['/invoices', '/api/invoices'], async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
      if (data && !error && data.length > 0) return res.json({ invoices: data });
    } catch (e) {
      console.warn('Supabase invoice fetch error:', e);
    }
  }
  return res.json({ invoices: mockDB.orders });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 BillFlow AI Backend running on port ${PORT}`);
    console.log(`👉 Endpoint: POST http://localhost:${PORT}/process-order`);
    console.log(`👉 Invoices: GET  http://localhost:${PORT}/invoices`);
    console.log(`=========================================`);
  });
}
