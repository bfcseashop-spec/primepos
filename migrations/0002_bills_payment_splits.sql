-- Add payment_splits column to bills for split payment support
-- Run with: psql $DATABASE_URL -f migrations/0002_bills_payment_splits.sql
-- Safe to run multiple times (uses IF NOT EXISTS via DO block)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'payment_splits'
  ) THEN
    ALTER TABLE "bills" ADD COLUMN "payment_splits" jsonb;
  END IF;
END $$;
