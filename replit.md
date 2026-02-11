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
10. **User & Role Management** - User management with CRUD, role assignment, inline role creation with description, edit/delete roles
11. **Integrations** - Medical device connections (ultrasound, X-ray, ECG, printer)
12. **Reports** - Revenue trends, expense breakdowns, service analytics
13. **Settings** - Tabbed interface (Application Metadata / Currency & Localization / Company Details / Activity Logs), dual currency selection with exchange rate, company receipt details, activity logging
14. **Appointments** - View/manage all appointments with status filters, edit status, delete
15. **Doctor Management** - Doctor profiles with specialization, qualification, schedule, consultation fee, CRUD operations, card view
16. **Salary Management** - Comprehensive payroll system with 5-tab layout (Dashboard/Employee Profiles/Loans & Advances/Payroll/Salary Ledger), employee salary profiles with allowance structure (housing/transport/meal/other), loan/advance tracking with installment schedules and progress bars, automated payroll run engine with payslip generation and loan deduction calculation, KPI dashboard (active employees/monthly gross/outstanding loans/deductions/paid/pending), department breakdown charts, alerts for overdue loans and pending payments, CSV export for payroll and ledger, mark as paid/finalize workflow, category and department management
17. **Authentication** - Login/Logout/Change Password with bcrypt password hashing, staff account listing

## Database
- PostgreSQL with Drizzle ORM
- Schema auto-pushed on startup
- Seed data auto-populated on first run

## Design System
- **Color Palette**: Vibrant, colorful UI with consistent color coding across all modules
  - Blue: primary actions, totals, navigation
  - Emerald: success, active, paid, money values
  - Amber: pending, warnings, edit actions
  - Violet: special categories, print actions
  - Red: destructive, cancelled, inactive
  - Cyan/Pink/Sky: accent variations for variety
- **Stats Cards**: Each metric uses distinct iconColor and iconBg props (e.g., text-blue-500 + bg-blue-500/10)
- **Status Badges**: Inline colored spans with bg/text/border pattern (e.g., bg-emerald-500/10 text-emerald-700 border-emerald-500/20)
- **Charts**: Vibrant chart palette (blue, emerald, amber, violet, pink, cyan), gradient area fills
- **Dark Mode**: All colors include dark variants (e.g., dark:text-blue-400)

## Recent Changes
- 2026-02-11: Added shared DateFilterBar component (client/src/components/date-filter.tsx) with useDateFilter hook, isDateInRange utility. Periods: All/Today/Yesterday/This Week/Last Week/This Month/Last Month/Custom date range
- 2026-02-11: Integrated date filtering across 7 pages: Dashboard (revenue chart, recent visits), Billing/POS (bills table, stats), Appointments (cards, stats), Lab Tests (table, stats), Expenses (table, stats), Bank Transactions (transactions, bills), Investments (table, stats)
- 2026-02-10: Comprehensive colorful redesign across all 18+ pages - vibrant stat cards, colorful status badges, colored action icons, gradient charts, colorful section headers, distinct payment method colors, and polished empty states
- 2026-02-10: Redesigned Settings with 4-tab layout (Application Metadata/Currency & Localization/Company Details/Activity Logs), dual currency selection, exchange rate, company receipt details, activity logging for user/role/settings changes
- 2026-02-10: Renamed Staff & Roles to User & Role Management, vertical layout with inline role creation form, role description field, edit/delete roles
- 2026-02-10: Redesigned Salary Management with 5-tab layout (Dashboard/Profiles/Loans/Payroll/Ledger), new DB tables (salary_profiles, salary_loans, loan_installments, payroll_runs, payslips), KPI dashboard, employee profile cards, loan/advance CRUD with progress bars, automated payroll run with payslip generation & loan deductions, CSV export, alerts
- 2026-02-10: Redesigned Bank Transactions with tabbed interface (Bill Collections/Bank Transactions), payment method summary cards (ABA, Acleda, Cash, Card, WeChat, GPay) with totals/counts/percentages, filterable bill payment records table, 4-card summary stats
- 2026-02-10: Added New Appointment dialog to OPD Management with patient selection, department, doctor, consultation mode, date/time, reason, notes, payment mode
- 2026-02-10: Redesigned OPD to patient-centric grid/list view with patient cards (photo, type badge, last visit, gender, location), Add Appointment action, three-dot menu
- 2026-02-10: Added full-page Patient Registration (/register-patient) with photo upload, personal info (first/last name, DOB, gender, blood type), address/city, patient type, emergency contact, medical history, allergies
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
