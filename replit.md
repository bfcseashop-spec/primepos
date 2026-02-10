# ClinicPOS - Clinic Management System

## Overview
A comprehensive Clinic POS (Point of Sale) System built with React, Express, and PostgreSQL. Features include OPD management, billing, service management, medicine inventory, expense tracking, bank transactions, investment management, staff management with role-based permissions, medical device integrations, analytics reports, and clinic settings.

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: Wouter (frontend), Express (backend)
- **State Management**: TanStack React Query

## Project Structure
```
client/src/
  pages/          - All page components (dashboard, opd, billing, etc.)
  components/     - Reusable components (sidebar, stats-card, data-table, etc.)
  components/ui/  - Shadcn UI components
  hooks/          - Custom hooks
  lib/            - Utilities and query client
server/
  index.ts        - Express server entry
  routes.ts       - API routes
  storage.ts      - Database storage layer (DatabaseStorage class)
  db.ts           - Database connection
  seed.ts         - Seed data
shared/
  schema.ts       - Drizzle schema + types for all entities
```

## Key Modules
1. **Dashboard** - Overview stats, revenue chart, recent visits
2. **OPD Management** - Patient registration + visit management
3. **Billing** - Create bills with services/medicines, payment tracking
4. **Service Management** - Consultation fees, lab tests, radiology costs
5. **Medicine Management** - Enhanced inventory with unit types (Box/Pieces/Liter/Jar/Bottle), complex pricing (box price, qty per box, auto-calculated per-med price), dual selling prices (local/foreigner), stock alerts, CRUD operations, category/status filters, search, Print Label & Barcode actions, List/Grid view toggle, category management
6. **Expense Management** - Track clinic expenses by category
7. **Bank Transactions** - Deposits, withdrawals, transfers
8. **Investment Management** - Track clinic investments and returns
9. **Staff & Roles** - Staff management with granular role permissions
10. **Integrations** - Medical device connections (ultrasound, X-ray, ECG, printer)
11. **Reports** - Revenue trends, expense breakdowns, service analytics
12. **Settings** - Clinic info, billing config, ID prefixes

## Database
- PostgreSQL with Drizzle ORM
- Schema auto-pushed on startup
- Seed data auto-populated on first run

## Recent Changes
- 2026-02-10: Added Medicine filters (category dropdown, status filter: In Stock/Low Stock/Out of Stock), enhanced search (name/generic/batch/manufacturer), Print Label & Barcode actions, enhanced summary stats (Total Items, In Stock, Low Stock, Out of Stock, Purchase Value, Sales Value)
- 2026-02-10: Added Medicine toolbar with Category management, List/Grid view toggle, Refresh button
- 2026-02-10: Enhanced Medicine module with complex pricing (box price / qty per box = per med price), unit types, dual selling prices (local/foreigner), stock count with alerts, full CRUD
- 2026-02-10: Enhanced Billing module with colorful UI, payment method badges, status badges, summary stats, professional invoice
- 2026-02-10: Initial MVP implementation with all 12 modules
