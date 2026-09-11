<<<<<<< HEAD
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
=======
// BillFlow AI - Shared Contract & Types
export type OrderStatus = 'draft' | 'pending_review' | 'confirmed' | 'cancelled';

export interface Customer {
  id?: string;
  name: string;
  phone?: string;
  gstin?: string;
  state: string; // e.g. "Maharashtra", "Delhi"
}

export interface RawOrderItem {
  productName: string;
  quantity: number;
  unitPrice?: number;
  hsnCode?: string;
  notes?: string;
}

export interface ExtractedOrderAI {
  customerName?: string;
  customerPhone?: string;
  items: RawOrderItem[];
  rawText: string;
  confidence: number;
  intentNotes?: string;
}

export interface ProcessedInvoiceItem {
  id?: string;
  productName: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  gstRate: number; // 5, 12, 18, 28 (%)
>>>>>>> 12d1e5d (chore: initialize BillFlow AI repository)
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
<<<<<<< HEAD
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
=======
  memoryApplied?: {
    field: string;
    originalValue?: any;
    resolvedValue: any;
    reason: string;
  }[];
}

export interface GuardianWarning {
  code: 'LOW_CONFIDENCE' | 'PRICE_ANOMALY' | 'MISSING_PRICE' | 'INVALID_GSTIN' | 'UNMATCHED_ITEM';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  field?: string;
}

export interface GuardianReport {
  isCompliant: boolean;
  requiresHumanReview: boolean;
  confidenceScore: number;
  warnings: GuardianWarning[];
  memoryUsed: boolean;
  summary: string;
}

export interface ProcessOrderRequest {
  rawText: string;
  customerHint?: string;
  senderPhone?: string;
  businessState?: string;
}

export interface ProcessOrderResponse {
  success: boolean;
  orderId: string;
  invoiceNumber: string;
  createdAt: string;
  customer: Customer;
  items: ProcessedInvoiceItem[];
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  guardianReport: GuardianReport;
  rawInput: string;
}

export interface InvoiceRecord extends ProcessOrderResponse {
  status: OrderStatus;
  paymentStatus: 'unpaid' | 'paid' | 'partial';
>>>>>>> 12d1e5d (chore: initialize BillFlow AI repository)
}
