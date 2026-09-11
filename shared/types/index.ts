export type OrderStatus = 'pending' | 'needs_review' | 'approved' | 'invoiced';
export type InvoiceStatus = 'draft' | 'approved' | 'paid' | 'cancelled';
export type GuardianSeverity = 'low' | 'medium' | 'high';

export interface Business {
  id: string;
  name: string;
  gstin: string | null;
  state: string;
  address: string;
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  address: string | null;
  state: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  hsn_code: string | null;
  unit: string;
  default_price: number;
  gst_rate: number;
  created_at: string;
}

export interface Order {
  id: string;
  business_id: string;
  customer_id: string | null;
  raw_message: string;
  status: OrderStatus;
  ai_confidence: number | null;
  memory_used: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
}

export interface Invoice {
  id: string;
  business_id: string;
  order_id: string;
  customer_id: string | null;
  invoice_number: string;
  invoice_date: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  status: InvoiceStatus;
  ai_confidence: number | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  amount: number;
}

export interface AIExtraction {
  customerName: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    gstRate: number;
  }>;
  deliveryAddress: string | null;
  confidence: number;
  memoryUsed: boolean;
  warnings: string[];
}

export interface GuardianWarning {
  type: string;
  severity: GuardianSeverity;
  message: string;
  previousValue: string | number | null;
  currentValue: string | number | null;
}
