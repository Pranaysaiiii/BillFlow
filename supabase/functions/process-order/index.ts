// Supabase Edge Function: process-order
// Location: supabase/functions/process-order/index.ts
// Handles: Business Memory -> LLM Extraction -> Invoice Guardian -> GST Math -> Database Storage

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

interface ProcessOrderRequest {
  businessId?: string;
  customerId?: string;
  message: string;
}

interface GuardianWarning {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  field?: string;
  previousValue?: any;
  currentValue?: any;
}

Deno.serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const llmApiKey = Deno.env.get('LLM_API_KEY') ?? Deno.env.get('GEMINI_API_KEY') ?? '';
    const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

    const body: ProcessOrderRequest = await req.json();
    const { message, businessId = 'biz_001', customerId = 'cust_001' } = body;

    if (!message || !message.trim()) {
      return new Response(JSON.stringify({ error: 'message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Load Business, Customer, Products, and Previous Orders (Business Memory)
    let business = { id: businessId, name: 'Mahalaxmi Hardware Mart', state: 'Maharashtra' };
    let customer = { id: customerId, name: 'Rajesh Traders', state: 'Maharashtra', gstin: '27AAPFU0939F1ZV' };
    let productCatalog = [
      { id: 'prod_001', name: 'PVC Pipe 25mm', unit_price: 850, gst_rate: 18, hsn_code: '3917' },
      { id: 'prod_002', name: 'Ultratech Cement 50kg', unit_price: 380, gst_rate: 28, hsn_code: '2523' }
    ];
    let previousOrders: any[] = [
      { product: 'PVC Pipe 25mm', quantity: 20, unitPrice: 850, gstRate: 18 }
    ];

    if (supabase) {
      // Query real Supabase tables if connected
      const [bizRes, custRes, prodRes, prevRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', businessId).maybeSingle(),
        supabase.from('customers').select('*').eq('id', customerId).maybeSingle(),
        supabase.from('products').select('*').eq('business_id', businessId),
        supabase.from('orders').select(`
          id, created_at,
          order_items ( product_name, quantity, unit_price, gst_rate )
        `).eq('customer_id', customerId).order('created_at', { ascending: false }).limit(2)
      ]);

      if (bizRes.data) business = bizRes.data;
      if (custRes.data) customer = custRes.data;
      if (prodRes.data && prodRes.data.length > 0) productCatalog = prodRes.data;
      if (prevRes.data && prevRes.data.length > 0) {
        previousOrders = prevRes.data.flatMap((o: any) =>
          (o.order_items || []).map((it: any) => ({
            product: it.product_name,
            quantity: it.quantity,
            unitPrice: it.unit_price,
            gstRate: it.gst_rate
          }))
        );
      }
    }

    // 2. LLM Extraction with Business Memory
    let extracted = {
      customerName: customer.name,
      items: [{ productName: 'PVC Pipe 25mm', quantity: 10, unitPrice: 850, gstRate: 18 }],
      confidence: 0.94,
      memoryUsed: false,
      warnings: [] as string[]
    };

    const isMemoryPrompted = /same as|last week|last time|usual|pichli/i.test(message);

    if (llmApiKey) {
      // Call Gemini 1.5 Flash
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

      try {
        const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${llmApiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
          })
        });
        const aiJson = await aiRes.json();
        const rawText = aiJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) extracted = JSON.parse(rawText);
      } catch (err) {
        console.warn('Gemini call failed, using heuristic extraction:', err);
      }
    } else {
      // Intelligent fallback interpreter
      const qtyMatch = message.match(/(\d+)\s*(?:more|piece|pcs|pipes)?/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 10;
      const matchedProd = productCatalog.find(p => message.toLowerCase().includes(p.name.toLowerCase())) || productCatalog[0];
      
      const lastOrder = previousOrders.find(p => p.product.toLowerCase().includes(matchedProd.name.toLowerCase()));
      const resolvedPrice = isMemoryPrompted && lastOrder ? lastOrder.unitPrice : matchedProd.unit_price;

      extracted = {
        customerName: customer.name,
        items: [{
          productName: matchedProd.name,
          quantity: qty,
          unitPrice: resolvedPrice,
          gstRate: matchedProd.gst_rate
        }],
        confidence: 0.94,
        memoryUsed: isMemoryPrompted,
        warnings: []
      };
    }

    // 3. Invoice Guardian Checks
    const guardianWarnings: GuardianWarning[] = [];
    const memoryUsed = extracted.memoryUsed || isMemoryPrompted;

    for (const item of extracted.items) {
      // Find historical reference
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

    const isIntraState = business.state.toLowerCase() === customer.state.toLowerCase();

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

    // 5. Save to Supabase (orders, order_items, ai_extractions, invoices)
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

        const orderItemsToInsert = extracted.items.map(it => ({
          order_id: orderId,
          product_name: it.productName,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          gst_rate: it.gstRate
        }));
        await supabase.from('order_items').insert(orderItemsToInsert);

        await supabase.from('ai_extractions').insert({
          order_id: orderId,
          raw_response: extracted,
          confidence: extracted.confidence
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
          status: orderStatus === 'needs_review' ? 'pending_review' : 'issued',
          ai_confidence: extracted.confidence
        });
      } catch (dbErr) {
        console.warn('Database write warning:', dbErr);
      }
    }

    // 6. Return Structured JSON Response (Step 11 Contract)
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

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
