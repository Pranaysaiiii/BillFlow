# Supabase Backend

This folder is reserved for the shared backend configuration and server-side logic.

## Intended tables

- businesses
- customers
- products
- orders
- order_items
- invoices
- ai_extractions

## Relationships

business
├── customers
├── products
├── orders
│   └── order_items
└── invoices

- orders should connect to customers
- invoices should connect to orders and customers
- AI extraction should connect to orders

## Current scope

This project is intentionally minimal and does not yet include production-grade database logic, advanced constraints, or full business rules. The goal is to define the shared data structure clearly enough for collaboration and later implementation.

## Future responsibilities

- PostgreSQL schema via migrations
- Edge Functions for AI processing and orchestration
- secure access patterns for server-side integrations
- app-specific queries and data validation
