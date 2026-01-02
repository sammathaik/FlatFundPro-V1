/*
  # Budget Forecasting & Collection Planning System - Phase 1

  1. New Tables
    - `budget_forecasts`
      - Main forecast records with period, year, status
      - Tracks forecast metadata and ownership
    - `forecast_expense_categories`
      - Individual expense line items within each forecast
      - Stores forecast amounts, historical references, notes
    - `forecast_status_history`
      - Audit trail of status changes
      - Tracks who changed status and when

  2. Security
    - Enable RLS on all tables
    - Admins can create and manage forecasts for their apartments
    - Super admins can view all forecasts
    - Proper audit logging

  3. Features
    - Draft, Proposed, Approved workflow
    - Historical reference tracking
    - Category-level detail with notes
    - Expense type tracking (recurring vs one-time)
*/

-- Budget Forecasts Table
CREATE TABLE IF NOT EXISTS budget_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id uuid NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,

  forecast_name text NOT NULL,
  forecast_period text NOT NULL CHECK (forecast_period IN ('quarterly', 'semi-annual', 'annual')),
  forecast_year integer NOT NULL,

  reference_period text,
  reference_year integer,

  total_forecast_amount decimal(12,2) NOT NULL DEFAULT 0,
  total_reference_amount decimal(12,2) DEFAULT 0,

  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'approved', 'archived')),

  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  proposed_at timestamptz,
  proposed_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  approval_notes text,

  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Forecast Expense Categories Table
CREATE TABLE IF NOT EXISTS forecast_expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id uuid NOT NULL REFERENCES budget_forecasts(id) ON DELETE CASCADE,

  category_name text NOT NULL,
  category_type text NOT NULL CHECK (category_type IN ('predefined', 'custom')),
  category_description text,

  forecast_amount decimal(12,2) NOT NULL DEFAULT 0,
  reference_amount decimal(12,2) DEFAULT 0,

  expense_type text NOT NULL DEFAULT 'recurring' CHECK (expense_type IN ('recurring', 'one-time')),

  inflation_percentage decimal(5,2) DEFAULT 0,

  notes text,

  breakdown jsonb DEFAULT '[]'::jsonb,

  display_order integer DEFAULT 0,
  is_enabled boolean DEFAULT true,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Forecast Status History Table
CREATE TABLE IF NOT EXISTS forecast_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id uuid NOT NULL REFERENCES budget_forecasts(id) ON DELETE CASCADE,

  from_status text,
  to_status text NOT NULL,

  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),

  notes text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_apartment ON budget_forecasts(apartment_id);
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_status ON budget_forecasts(status);
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_year ON budget_forecasts(forecast_year);
CREATE INDEX IF NOT EXISTS idx_forecast_categories_forecast ON forecast_expense_categories(forecast_id);
CREATE INDEX IF NOT EXISTS idx_forecast_status_history_forecast ON forecast_status_history(forecast_id);

-- Enable Row Level Security
ALTER TABLE budget_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forecast_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for budget_forecasts

-- Admins can view forecasts for their apartments
CREATE POLICY "Admins can view own apartment forecasts"
  ON budget_forecasts FOR SELECT
  TO authenticated
  USING (
    apartment_id IN (
      SELECT apartment_id FROM admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Super admins can view all forecasts
CREATE POLICY "Super admins can view all forecasts"
  ON budget_forecasts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Admins can create forecasts for their apartments
CREATE POLICY "Admins can create forecasts"
  ON budget_forecasts FOR INSERT
  TO authenticated
  WITH CHECK (
    apartment_id IN (
      SELECT apartment_id FROM admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Admins can update forecasts for their apartments
CREATE POLICY "Admins can update own forecasts"
  ON budget_forecasts FOR UPDATE
  TO authenticated
  USING (
    apartment_id IN (
      SELECT apartment_id FROM admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  )
  WITH CHECK (
    apartment_id IN (
      SELECT apartment_id FROM admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Admins can delete draft forecasts only
CREATE POLICY "Admins can delete draft forecasts"
  ON budget_forecasts FOR DELETE
  TO authenticated
  USING (
    status = 'draft'
    AND apartment_id IN (
      SELECT apartment_id FROM admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- RLS Policies for forecast_expense_categories

-- Can view categories if can view parent forecast
CREATE POLICY "Users can view forecast categories"
  ON forecast_expense_categories FOR SELECT
  TO authenticated
  USING (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM super_admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- Can create categories if can manage parent forecast
CREATE POLICY "Admins can create forecast categories"
  ON forecast_expense_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    forecast_id IN (
      SELECT id FROM budget_forecasts
      WHERE apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- Can update categories if can manage parent forecast
CREATE POLICY "Admins can update forecast categories"
  ON forecast_expense_categories FOR UPDATE
  TO authenticated
  USING (
    forecast_id IN (
      SELECT id FROM budget_forecasts
      WHERE apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  )
  WITH CHECK (
    forecast_id IN (
      SELECT id FROM budget_forecasts
      WHERE apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- Can delete categories if can manage parent forecast
CREATE POLICY "Admins can delete forecast categories"
  ON forecast_expense_categories FOR DELETE
  TO authenticated
  USING (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.status = 'draft'
      AND bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- RLS Policies for forecast_status_history

-- Can view status history if can view parent forecast
CREATE POLICY "Users can view forecast status history"
  ON forecast_status_history FOR SELECT
  TO authenticated
  USING (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM super_admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- System can insert status history
CREATE POLICY "System can create status history"
  ON forecast_status_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to update forecast totals
CREATE OR REPLACE FUNCTION update_forecast_totals()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE budget_forecasts
    SET
      total_forecast_amount = (
        SELECT COALESCE(SUM(forecast_amount), 0)
        FROM forecast_expense_categories
        WHERE forecast_id = OLD.forecast_id
        AND is_enabled = true
      ),
      total_reference_amount = (
        SELECT COALESCE(SUM(reference_amount), 0)
        FROM forecast_expense_categories
        WHERE forecast_id = OLD.forecast_id
        AND is_enabled = true
      ),
      updated_at = now()
    WHERE id = OLD.forecast_id;
    RETURN OLD;
  ELSE
    UPDATE budget_forecasts
    SET
      total_forecast_amount = (
        SELECT COALESCE(SUM(forecast_amount), 0)
        FROM forecast_expense_categories
        WHERE forecast_id = NEW.forecast_id
        AND is_enabled = true
      ),
      total_reference_amount = (
        SELECT COALESCE(SUM(reference_amount), 0)
        FROM forecast_expense_categories
        WHERE forecast_id = NEW.forecast_id
        AND is_enabled = true
      ),
      updated_at = now()
    WHERE id = NEW.forecast_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update forecast totals
DROP TRIGGER IF EXISTS trigger_update_forecast_totals ON forecast_expense_categories;
CREATE TRIGGER trigger_update_forecast_totals
  AFTER INSERT OR UPDATE OR DELETE ON forecast_expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_forecast_totals();

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_forecast_status_change()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO forecast_status_history (
      forecast_id,
      from_status,
      to_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      CASE
        WHEN NEW.status = 'proposed' THEN 'Forecast proposed to committee'
        WHEN NEW.status = 'approved' THEN NEW.approval_notes
        WHEN NEW.status = 'archived' THEN 'Forecast archived'
        ELSE NULL
      END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to log status changes
DROP TRIGGER IF EXISTS trigger_log_forecast_status_change ON budget_forecasts;
CREATE TRIGGER trigger_log_forecast_status_change
  AFTER UPDATE ON budget_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION log_forecast_status_change();

-- Function to get predefined expense categories
CREATE OR REPLACE FUNCTION get_predefined_expense_categories()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_array(
    jsonb_build_object(
      'name', 'Utilities & Basic Services',
      'description', 'Electricity, water, common area utilities',
      'icon', 'zap',
      'type', 'predefined',
      'default_enabled', true
    ),
    jsonb_build_object(
      'name', 'Security & Staffing',
      'description', 'Guards, housekeeping, staff salaries',
      'icon', 'shield',
      'type', 'predefined',
      'default_enabled', true
    ),
    jsonb_build_object(
      'name', 'Maintenance & AMC',
      'description', 'Lifts, pumps, equipment maintenance contracts',
      'icon', 'wrench',
      'type', 'predefined',
      'default_enabled', true
    ),
    jsonb_build_object(
      'name', 'Repairs & Contingency',
      'description', 'Emergency repairs, minor fixes, buffer',
      'icon', 'tool',
      'type', 'predefined',
      'default_enabled', true
    ),
    jsonb_build_object(
      'name', 'Administrative & Statutory',
      'description', 'Audits, registrations, insurance, legal',
      'icon', 'file-text',
      'type', 'predefined',
      'default_enabled', false
    ),
    jsonb_build_object(
      'name', 'Capital / Sinking Fund',
      'description', 'Major repairs, future capital projects',
      'icon', 'piggy-bank',
      'type', 'predefined',
      'default_enabled', false
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_predefined_expense_categories() TO authenticated;
GRANT EXECUTE ON FUNCTION update_forecast_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION log_forecast_status_change() TO authenticated;
