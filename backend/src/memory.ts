import { createClient } from '@supabase/supabase-js';
import { Customer, RawOrderItem } from '../../shared/types';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Local customer fallback cache for fast reliable demo
const LOCAL_CUSTOMER_CACHE: Record<string, Customer> = {
  'sharma hardware': {
    name: 'Sharma Hardware',
    phone: '+919876543210',
    gstin: '27AAPFU0939F1ZV',
    state: 'Maharashtra'
  },
  'verma electricals': {
    name: 'Verma Electricals',
    phone: '+919811223344',
    gstin: '27AABCV1234D1Z5',
    state: 'Maharashtra'
  },
  'delhi wholesale mart': {
    name: 'Delhi Wholesale Mart',
    phone: '+919988776655',
    gstin: '07AAACD9876E1ZT',
    state: 'Delhi'
  }
};

const LOCAL_PURCHASE_HISTORY: Array<{
  customerName: string;
  productName: string;
  unitPrice: number;
  lastInvoiceNumber: string;
  lastDate: string;
}> = [
  {
    customerName: 'sharma hardware',
    productName: 'pvc pipe 25mm',
    unitPrice: 850,
    lastInvoiceNumber: 'INV-2026-0021',
    lastDate: '2026-09-04'
  },
  {
    customerName: 'sharma hardware',
    productName: 'cement',
    unitPrice: 380,
    lastInvoiceNumber: 'INV-2026-0018',
    lastDate: '2026-08-28'
  },
  {
    customerName: 'verma electricals',
    productName: 'wire',
    unitPrice: 1450,
    lastInvoiceNumber: 'INV-2026-0015',
    lastDate: '2026-08-20'
  }
];

export async function lookupCustomer(nameOrPhone: string): Promise<Customer | null> {
  const normalized = nameOrPhone.toLowerCase().trim();

  // 1. Try Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${normalized}%,phone.eq.${nameOrPhone}`)
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        return {
          id: data.id,
          name: data.name,
          phone: data.phone,
          gstin: data.gstin,
          state: data.state || 'Maharashtra'
        };
      }
    } catch (err) {
      console.warn('Supabase customer lookup fallback:', err);
    }
  }

  // 2. Local fallback cache
  for (const [key, customer] of Object.entries(LOCAL_CUSTOMER_CACHE)) {
    if (normalized.includes(key) || (customer.phone && customer.phone.includes(normalized))) {
      return customer;
    }
  }

  return null;
}

export interface ResolvedMemoryItem {
  resolvedUnitPrice: number;
  memoryUsed: boolean;
  reason?: string;
  previousInvoice?: string;
}

export async function resolveItemPriceWithMemory(
  customerName: string,
  rawItem: RawOrderItem,
  fullText: string
): Promise<ResolvedMemoryItem> {
  // If price is explicitly stated in order, use it directly
  if (rawItem.unitPrice && rawItem.unitPrice > 0) {
    return {
      resolvedUnitPrice: rawItem.unitPrice,
      memoryUsed: false
    };
  }

  const normalizedCustomer = customerName.toLowerCase().trim();
  const normalizedProduct = rawItem.productName.toLowerCase().trim();

  // 1. Try Supabase historical invoice lookup
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          invoice_number,
          created_at,
          invoice_items (
            product_name,
            unit_price
          )
        `)
        .ilike('customer_name', `%${normalizedCustomer}%`)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data && data.length > 0 && !error) {
        for (const inv of data) {
          const matchedItem = (inv.invoice_items as any[])?.find((it: any) =>
            it.product_name.toLowerCase().includes(normalizedProduct) ||
            normalizedProduct.includes(it.product_name.toLowerCase())
          );
          if (matchedItem && matchedItem.unit_price) {
            return {
              resolvedUnitPrice: Number(matchedItem.unit_price),
              memoryUsed: true,
              reason: `Retrieved historical unit price ₹${matchedItem.unit_price} from past invoice ${inv.invoice_number}`,
              previousInvoice: inv.invoice_number
            };
          }
        }
      }
    } catch (err) {
      console.warn('Supabase memory lookup fallback:', err);
    }
  }

  // 2. Check local fallback purchase history
  const match = LOCAL_PURCHASE_HISTORY.find(
    entry => entry.customerName === normalizedCustomer &&
             (entry.productName.includes(normalizedProduct) || normalizedProduct.includes(entry.productName))
  );

  if (match) {
    return {
      resolvedUnitPrice: match.unitPrice,
      memoryUsed: true,
      reason: `Retrieved historical unit price ₹${match.unitPrice} from invoice ${match.lastInvoiceNumber} on ${match.lastDate}`,
      previousInvoice: match.lastInvoiceNumber
    };
  }

  // 3. Fallback catalog default
  const defaultCatalogPrices: Record<string, number> = {
    'pvc pipe': 850,
    'cement': 380,
    'wire': 1450,
    'steel': 65
  };

  for (const [key, price] of Object.entries(defaultCatalogPrices)) {
    if (normalizedProduct.includes(key)) {
      return {
        resolvedUnitPrice: price,
        memoryUsed: true,
        reason: `Auto-filled standard catalog base price of ₹${price}`
      };
    }
  }

  return {
    resolvedUnitPrice: 0,
    memoryUsed: false,
    reason: 'Price could not be determined from input or business memory'
  };
}
