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
4. **Service Management** - Consultation fees, radiology costs, image upload, category management, View/Edit/Delete actions
5. **Lab Test Management** - Laboratory test catalog with test name, category, sample type, price, status, CRUD operations, barcode generation, category filter, search
6. **Medicine Management** - Enhanced inventory with unit types (Box/Pieces/Liter/Jar/Bottle), complex pricing (box price, qty per box, auto-calculated per-med price), dual selling prices (local/foreigner), stock alerts, CRUD operations, category/status filters, search, Print Label & Barcode actions, List/Grid view toggle, category management
7. **Expense Management** - Track clinic expenses by category
8. **Bank Transactions** - Deposits, withdrawals, transfers
9. **Investment Management** - Track clinic investments and returns
10. **Staff & Roles** - Staff management with granular role permissions
11. **Integrations** - Medical device connections (ultrasound, X-ray, ECG, printer)
12. **Reports** - Revenue trends, expense breakdowns, service analytics
13. **Settings** - Clinic info, billing config, ID prefixes

## Database
- PostgreSQL with Drizzle ORM
- Schema auto-pushed on startup
- Seed data auto-populated on first run

## Recent Changes
- 2026-02-10: Enhanced Lab Test Management with multi-select Category/Sample Type, status workflow (Processing/Complete/Sample Missing/Cancel), live processing timer, Refer Name column
- 2026-02-10: Enhanced Lab Test Management with unique test IDs (LAB-0001), patient selection, report file upload/download/print (PDF/Excel/CSV), referrer name tracking, created date
- 2026-02-10: Added Lab Test Management module with full CRUD, barcode, category filter, search, summary stats
- 2026-02-10: Added '+ Category' button to Service Management with category management dialog
- 2026-02-10: Added Service image upload, View/Edit/Delete actions with image thumbnails
- 2026-02-10: Added Medicine filters (category dropdown, status filter: In Stock/Low Stock/Out of Stock), enhanced search (name/generic/batch/manufacturer), Print Label & Barcode actions, enhanced summary stats (Total Items, In Stock, Low Stock, Out of Stock, Purchase Value, Sales Value)
- 2026-02-10: Added Medicine toolbar with Category management, List/Grid view toggle, Refresh button
- 2026-02-10: Enhanced Medicine module with complex pricing (box price / qty per box = per med price), unit types, dual selling prices (local/foreigner), stock count with alerts, full CRUD
- 2026-02-10: Enhanced Billing module with colorful UI, payment method badges, status badges, summary stats, professional invoice
- 2026-02-10: Initial MVP implementation with all 12 modules
