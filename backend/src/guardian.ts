import { Customer, GuardianReport, GuardianWarning, ProcessedInvoiceItem } from '../../shared/types';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function runInvoiceGuardian(
  customer: Customer,
  items: ProcessedInvoiceItem[],
  aiConfidence: number,
  memoryUsed: boolean
): GuardianReport {
  const warnings: GuardianWarning[] = [];

  // 1. Confidence score check
  if (aiConfidence < 0.70) {
    warnings.push({
      code: 'LOW_CONFIDENCE',
      severity: 'warning',
      message: `AI parsing confidence is low (${Math.round(aiConfidence * 100)}%). Please verify quantities and item details.`
    });
  }

  // 2. GSTIN format verification
  if (customer.gstin) {
    if (!GSTIN_REGEX.test(customer.gstin.trim())) {
      warnings.push({
        code: 'INVALID_GSTIN',
        severity: 'critical',
        field: 'customer.gstin',
        message: `GSTIN "${customer.gstin}" is invalid. Expected standard 15-character GSTIN.`
      });
    }
  } else {
    warnings.push({
      code: 'INVALID_GSTIN',
      severity: 'info',
      field: 'customer.gstin',
      message: 'No GSTIN provided for this customer. Treated as B2C unregistered supply.'
    });
  }

  // 3. Price & Quantity Checks
  for (const item of items) {
    if (item.unitPrice <= 0) {
      warnings.push({
        code: 'MISSING_PRICE',
        severity: 'critical',
        field: item.productName,
        message: `Item "${item.productName}" has ₹0 price. Price must be set before dispatch.`
      });
    }

    if (item.quantity <= 0) {
      warnings.push({
        code: 'PRICE_ANOMALY',
        severity: 'critical',
        field: item.productName,
        message: `Quantity for "${item.productName}" must be greater than 0.`
      });
    }

    if (item.unitPrice > 100000) {
      warnings.push({
        code: 'PRICE_ANOMALY',
        severity: 'warning',
        field: item.productName,
        message: `Unit price for "${item.productName}" is unusually high (₹${item.unitPrice}). Please confirm.`
      });
    }
  }

  const hasCriticalWarning = warnings.some(w => w.severity === 'critical');
  const requiresHumanReview = hasCriticalWarning || aiConfidence < 0.75;
  const isCompliant = !hasCriticalWarning;

  let summary = 'Order passed Guardian checks and is GST-ready.';
  if (requiresHumanReview) {
    summary = `Guardian flagged ${warnings.length} item(s) requiring shopkeeper review.`;
  } else if (memoryUsed) {
    summary = 'Guardian verified order. Applied historical pricing and auto-calculated GST.';
  }

  return {
    isCompliant,
    requiresHumanReview,
    confidenceScore: aiConfidence,
    warnings,
    memoryUsed,
    summary
  };
}
