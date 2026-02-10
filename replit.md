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
5. **Medicine Management** - Inventory with low-stock alerts
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
- 2026-02-10: Initial MVP implementation with all 12 modules
