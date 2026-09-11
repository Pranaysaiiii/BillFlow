# API Contract

This document describes the future backend contract for the AI-powered order processing flow.

## Endpoint

### POST /process-order

Purpose: receive a WhatsApp-style order message, extract structured order data, recall business memory, run anomaly checks, and return a structured result for the app to store.

### Request body

```json
{
  "businessId": "string",
  "customerId": "string | null",
  "message": "string"
}
```

### Fields

- businessId: the business account that owns the order
- customerId: the known customer, if already identified; otherwise null
- message: the raw WhatsApp-style order content received from the user

### Response body

```json
{
  "order": {},
  "extraction": {},
  "memory": {},
  "guardian": {}
}
```

### Field purposes

- order: the normalized order object created or updated from the message
- extraction: structured data extracted from the user message by the AI
- memory: prior business/customer context used by the AI to infer missing details
- guardian: anomaly and validation warnings from the invoice guardian layer

## Contract requirements

- The AI response must eventually be structured JSON, not free-form text.
- The frontend must never need to parse natural-language AI responses.
- The backend should validate and normalize all returned data before storing it.
- The app should treat this API as the server-side source of truth for order interpretation and validation.

## Example future response

```json
{
  "order": {
    "id": "ord_123",
    "status": "pending"
  },
  "extraction": {
    "customerName": "Ravi Traders",
    "items": [
      {
        "name": "Rice 25kg",
        "quantity": 2,
        "unitPrice": 1200,
        "gstRate": 5
      }
    ],
    "deliveryAddress": "Pune",
    "confidence": 0.91,
    "memoryUsed": true,
    "warnings": []
  },
  "memory": {
    "customer": "Ravi Traders",
    "lastOrderDate": "2026-09-01"
  },
  "guardian": {
    "warnings": [
      {
        "type": "missing_gstin",
        "severity": "medium",
        "message": "Customer GSTIN is missing."
      }
    ]
  }
}
```
