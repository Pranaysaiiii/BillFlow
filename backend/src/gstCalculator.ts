import { ProcessedInvoiceItem, RawOrderItem } from '../../shared/types';

export interface CalculationContext {
  sellerState: string;
  customerState: string;
}

export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

const PRODUCT_CATALOG_DEFAULTS: Record<string, { hsn: string; defaultGstRate: number; defaultPrice?: number }> = {
  'pvc pipe': { hsn: '3917', defaultGstRate: 18, defaultPrice: 850 },
  'pvc pipe 25mm': { hsn: '3917', defaultGstRate: 18, defaultPrice: 850 },
  'cement': { hsn: '2523', defaultGstRate: 28, defaultPrice: 380 },
  'steel rod': { hsn: '7214', defaultGstRate: 18, defaultPrice: 65 },
  'paint': { hsn: '3208', defaultGstRate: 18, defaultPrice: 1200 },
  'switch': { hsn: '8536', defaultGstRate: 18, defaultPrice: 110 },
  'wire': { hsn: '8544', defaultGstRate: 18, defaultPrice: 1450 }
};

export function lookupProductDefaults(productName: string) {
  const normalized = productName.toLowerCase().trim();
  for (const [key, val] of Object.entries(PRODUCT_CATALOG_DEFAULTS)) {
    if (normalized.includes(key)) {
      return val;
    }
  }
  return { hsn: '9988', defaultGstRate: 18 };
}

export function calculateItemGST(
  item: RawOrderItem,
  context: CalculationContext,
  unitPrice: number
): ProcessedInvoiceItem {
  const isIntraState = context.sellerState.toLowerCase().trim() === context.customerState.toLowerCase().trim();
  const defaults = lookupProductDefaults(item.productName);
  
  const hsnCode = item.hsnCode || defaults.hsn;
  const gstRate = defaults.defaultGstRate;

  const quantity = Math.max(1, item.quantity);
  const subtotal = roundToTwo(quantity * unitPrice);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isIntraState) {
    const halfRate = gstRate / 2;
    cgst = roundToTwo((subtotal * halfRate) / 100);
    sgst = roundToTwo((subtotal * halfRate) / 100);
  } else {
    igst = roundToTwo((subtotal * gstRate) / 100);
  }

  const total = roundToTwo(subtotal + cgst + sgst + igst);

  return {
    productName: item.productName,
    hsnCode,
    quantity,
    unitPrice,
    subtotal,
    gstRate,
    cgst,
    sgst,
    igst,
    total,
    memoryApplied: []
  };
}

export function calculateInvoiceTotals(items: ProcessedInvoiceItem[]) {
  const subtotal = roundToTwo(items.reduce((sum, item) => sum + item.subtotal, 0));
  const cgstTotal = roundToTwo(items.reduce((sum, item) => sum + item.cgst, 0));
  const sgstTotal = roundToTwo(items.reduce((sum, item) => sum + item.sgst, 0));
  const igstTotal = roundToTwo(items.reduce((sum, item) => sum + item.igst, 0));
  const grandTotal = roundToTwo(subtotal + cgstTotal + sgstTotal + igstTotal);

  return {
    subtotal,
    cgstTotal,
    sgstTotal,
    igstTotal,
    grandTotal
  };
}
