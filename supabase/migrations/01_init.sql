-- BillFlow AI: Supabase MVP Schema (7 Core Tables)
-- Paste this into your Supabase SQL Editor

-- 1. Businesses (Store owner)
CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY DEFAULT 'biz_001',
    name TEXT NOT NULL,
    gstin TEXT,
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT 'cust_001',
    business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    gstin TEXT,
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT 'prod_001',
    business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    hsn_code TEXT NOT NULL DEFAULT '3917',
    unit_price NUMERIC(12,2) NOT NULL,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    raw_message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'needs_review', -- 'confirmed', 'needs_review', 'cancelled'
    ai_confidence NUMERIC(4,2) DEFAULT 1.0,
    memory_used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00
);

-- 6. AI Extractions (Audit trail of raw LLM outputs)
CREATE TABLE IF NOT EXISTS ai_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    raw_response JSONB NOT NULL,
    confidence NUMERIC(4,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Invoices (GST-compliant invoice record)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    cgst NUMERIC(12,2) NOT NULL DEFAULT 0,
    sgst NUMERIC(12,2) NOT NULL DEFAULT 0,
    igst NUMERIC(12,2) NOT NULL DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued',
    ai_confidence NUMERIC(4,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================
-- SEED DATA (For Hackathon Demo: Rajesh Traders Memory)
-- =========================================================

-- Seed 1 Business
INSERT INTO businesses (id, name, gstin, state)
VALUES ('biz_001', 'Mahalaxmi Hardware Mart', '27AABCU9603R1ZM', 'Maharashtra')
ON CONFLICT (id) DO NOTHING;

-- Seed Customers
INSERT INTO customers (id, business_id, name, phone, gstin, state)
VALUES 
  ('cust_001', 'biz_001', 'Rajesh Traders', '+919876543210', '27AAPFU0939F1ZV', 'Maharashtra'),
  ('cust_002', 'biz_001', 'Verma Electricals', '+919811223344', '27AABCV1234D1Z5', 'Maharashtra'),
  ('cust_003', 'biz_001', 'Delhi Wholesale Mart', '+919988776655', '07AAACD9876E1ZT', 'Delhi')
ON CONFLICT (id) DO NOTHING;

-- Seed Product Catalog
INSERT INTO products (id, business_id, name, hsn_code, unit_price, gst_rate)
VALUES 
  ('prod_001', 'biz_001', 'PVC Pipe 25mm', '3917', 850.00, 18.00),
  ('prod_002', 'biz_001', 'Ultratech Cement 50kg', '2523', 380.00, 28.00),
  ('prod_003', 'biz_001', 'Havells 1.5mm Wire', '8544', 1450.00, 18.00)
ON CONFLICT (id) DO NOTHING;

-- Seed Previous Order for Rajesh Traders (Last week: 20 PVC Pipe 25mm at ₹850)
INSERT INTO orders (id, business_id, customer_id, raw_message, status, ai_confidence, memory_used, created_at)
VALUES ('ord_hist_001', 'biz_001', 'cust_001', 'Send 20 pvc pipes 25mm', 'confirmed', 0.98, false, now() - interval '7 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, gst_rate)
VALUES ('ord_hist_001', 'prod_001', 'PVC Pipe 25mm', 20, 850.00, 18.00)
ON CONFLICT DO NOTHING;

INSERT INTO invoices (order_id, customer_id, invoice_number, invoice_date, subtotal, cgst, sgst, igst, total, status)
VALUES ('ord_hist_001', 'cust_001', 'INV-2026-0001', now() - interval '7 days', 17000.00, 1530.00, 1530.00, 0, 20060.00, 'paid')
ON CONFLICT (order_id) DO NOTHING;
