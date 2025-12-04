/*
  # Add Quarter Basis to Expected Collections

  - Adds quarter_basis column to expected_collections
    - 'financial' (default) - financial year quarters (Apr–Mar)
    - 'yearly' - single annual collection (no specific quarter)
*/

ALTER TABLE expected_collections
  ADD COLUMN IF NOT EXISTS quarter_basis text NOT NULL DEFAULT 'financial'
  CHECK (quarter_basis IN ('financial', 'yearly'));



