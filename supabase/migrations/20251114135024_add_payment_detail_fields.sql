/*
  # Add Payment Detail Fields for Admin Dashboard

  1. New Fields Added to payment_submissions
    - `payer_name` (text) - Name of the person making the payment
    - `payee_name` (text) - Name of the person/entity receiving payment
    - `bank_name` (text) - Bank name used for transaction
    - `currency` (text) - Currency of the transaction (e.g., INR, USD)
    - `platform` (text) - Payment platform (e.g., UPI, NEFT, IMPS)
    - `payment_type` (text) - Type of payment (e.g., Maintenance, One-time)
    - `sender_upi_id` (text) - UPI ID of sender
    - `receiver_account` (text) - Receiver's account number or UPI ID
    - `ifsc_code` (text) - IFSC code for bank transfers
    - `narration` (text) - Payment narration/description
    - `screenshot_source` (text) - Source of the screenshot (e.g., WhatsApp, Email)
    - `other_text` (text) - Any additional information

  2. Purpose
    - These fields will be populated by automated jobs via make.com
    - Display in expandable rows in Admin dashboard
    - All fields are nullable and TEXT type to accommodate various data formats

  3. Notes
    - Fields are optional (nullable) since existing records won't have this data
    - TEXT type chosen for flexibility with automated data input
    - No indexes needed as these are display-only fields
*/

-- Add new payment detail fields
ALTER TABLE payment_submissions
  ADD COLUMN IF NOT EXISTS payer_name TEXT,
  ADD COLUMN IF NOT EXISTS payee_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS payment_type TEXT,
  ADD COLUMN IF NOT EXISTS sender_upi_id TEXT,
  ADD COLUMN IF NOT EXISTS receiver_account TEXT,
  ADD COLUMN IF NOT EXISTS ifsc_code TEXT,
  ADD COLUMN IF NOT EXISTS narration TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_source TEXT,
  ADD COLUMN IF NOT EXISTS other_text TEXT;

-- Add helpful comments for documentation
COMMENT ON COLUMN payment_submissions.payer_name IS 'Name of the person making the payment';
COMMENT ON COLUMN payment_submissions.payee_name IS 'Name of the person/entity receiving payment';
COMMENT ON COLUMN payment_submissions.bank_name IS 'Bank name used for transaction';
COMMENT ON COLUMN payment_submissions.currency IS 'Currency of the transaction (e.g., INR, USD)';
COMMENT ON COLUMN payment_submissions.platform IS 'Payment platform (e.g., UPI, NEFT, IMPS)';
COMMENT ON COLUMN payment_submissions.payment_type IS 'Type of payment (e.g., Maintenance, One-time)';
COMMENT ON COLUMN payment_submissions.sender_upi_id IS 'UPI ID of sender';
COMMENT ON COLUMN payment_submissions.receiver_account IS 'Receiver account number or UPI ID';
COMMENT ON COLUMN payment_submissions.ifsc_code IS 'IFSC code for bank transfers';
COMMENT ON COLUMN payment_submissions.narration IS 'Payment narration/description';
COMMENT ON COLUMN payment_submissions.screenshot_source IS 'Source of the screenshot (e.g., WhatsApp, Email)';
COMMENT ON COLUMN payment_submissions.other_text IS 'Any additional information';
