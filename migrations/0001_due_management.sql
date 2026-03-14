-- Due Management tables for PrimePOS (patients/bills)
-- Run with: psql $DATABASE_URL -f migrations/0001_due_management.sql
-- Or: npm run db:migrate

-- due_payments: records of payments received from patients against their dues
CREATE TABLE IF NOT EXISTS "due_payments" (
  "id" serial PRIMARY KEY,
  "patient_id" integer NOT NULL REFERENCES "patients"("id"),
  "payment_date" timestamp NOT NULL,
  "amount" numeric(10, 2) NOT NULL,
  "unapplied_amount" numeric(10, 2) NOT NULL DEFAULT 0,
  "payment_method" text NOT NULL,
  "reference" text,
  "note" text,
  "payment_slips" text,
  "recorded_by" text,
  "created_at" timestamp DEFAULT now()
);

-- due_payment_allocations: links payments to specific bills
CREATE TABLE IF NOT EXISTS "due_payment_allocations" (
  "id" serial PRIMARY KEY,
  "payment_id" integer NOT NULL REFERENCES "due_payments"("id"),
  "bill_id" integer NOT NULL REFERENCES "bills"("id"),
  "amount" numeric(10, 2) NOT NULL,
  "created_at" timestamp DEFAULT now()
);
