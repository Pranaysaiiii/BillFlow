<<<<<<< HEAD
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
=======
# BillFlow AI — API Contract & Endpoint Documentation

## Base URL
- Local Backend: `http://localhost:3001`
- Cloud/Tunnel: `https://your-tunnel-url.loca.lt` (if using Localtunnel/Ngrok for Expo Mobile)

---

## 1. POST `/api/process-order`
Takes raw natural language text (from WhatsApp message or speech-to-text), extracts order items via AI, resolves customer context and pricing via **Business Memory**, runs compliance audits through **Invoice Guardian**, and deterministically calculates Indian GST (CGST + SGST or IGST).

### Request
```json
{
  "rawText": "Bhai Sharma Hardware ko 10 pvc pipes 25mm bhej do, same rate as last week urgent",
  "customerHint": "Sharma Hardware",
  "senderPhone": "+919876543210",
  "businessState": "Maharashtra"
}
```

### Response (`200 OK`)
```json
{
  "success": true,
  "orderId": "ord_1726030000000",
  "invoiceNumber": "INV-2026-0042",
  "createdAt": "2026-09-11T10:30:00.000Z",
  "customer": {
    "name": "Sharma Hardware",
    "phone": "+919876543210",
    "gstin": "27AAPFU0939F1ZV",
    "state": "Maharashtra"
  },
  "items": [
    {
      "productName": "PVC Pipe 25mm",
      "hsnCode": "3917",
      "quantity": 10,
      "unitPrice": 850,
      "subtotal": 8500,
      "gstRate": 18,
      "cgst": 765,
      "sgst": 765,
      "igst": 0,
      "total": 10030,
      "memoryApplied": [
        {
          "field": "unitPrice",
          "resolvedValue": 850,
          "reason": "Retrieved historical unit price ₹850 from invoice INV-2026-0021 on 2026-09-04"
        }
      ]
    }
  ],
  "subtotal": 8500,
  "cgstTotal": 765,
  "sgstTotal": 765,
  "igstTotal": 0,
  "grandTotal": 10030,
  "guardianReport": {
    "isCompliant": true,
    "requiresHumanReview": false,
    "confidenceScore": 0.95,
    "warnings": [],
    "memoryUsed": true,
    "summary": "Guardian verified order. Applied historical pricing and auto-calculated GST."
  },
  "rawInput": "Bhai Sharma Hardware ko 10 pvc pipes 25mm bhej do, same rate as last week urgent"
}
```

---

## 2. GET `/api/invoices`
Returns all processed invoices for Developer 3's web dashboard.

### Response (`200 OK`)
```json
{
  "invoices": [
    {
      "orderId": "ord_1726030000000",
      "invoiceNumber": "INV-2026-0042",
      "customerName": "Sharma Hardware",
      "grandTotal": 10030,
      "status": "confirmed",
      "createdAt": "2026-09-11T10:30:00.000Z",
      "requiresHumanReview": false,
      "confidenceScore": 0.95
    }
  ]
}
```

---

## 3. POST `/api/invoices/:orderId/confirm`
Approves and locks an invoice when the shopkeeper clicks "Confirm & Dispatch".
>>>>>>> 12d1e5d (chore: initialize BillFlow AI repository)
