/*
  # Budget Forecasting & Collection Planning System - Phase 2: Actual Expense Tracking

  1. New Tables
    - `actual_expenses`
      - Records actual expenses incurred against forecast categories
      - Tracks invoices, receipts, and payment details
      - Links to forecast categories for variance analysis
    - `budget_alerts`
      - Automated alerts when budgets exceed thresholds
      - Tracks alert status and resolution
    - `budget_variance_snapshots`
      - Periodic snapshots of budget vs actual for trending
      - Monthly/quarterly rollups for analysis

  2. Security
    - Enable RLS on all new tables
    - Admins can record and view expenses for their apartments
    - Super admins can view all data
    - Proper audit logging

  3. Features
    - Actual expense recording with receipts/invoices
    - Variance analysis (Budget vs Actual)
    - Budget utilization tracking with percentage spent
    - Automated alerts when approaching budget limits
    - Multi-period comparison and trending
*/

-- Actual Expenses Table
CREATE TABLE IF NOT EXISTS actual_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id uuid NOT NULL REFERENCES budget_forecasts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES forecast_expense_categories(id) ON DELETE CASCADE,

  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  expense_description text NOT NULL,
  expense_amount decimal(12,2) NOT NULL CHECK (expense_amount >= 0),

  vendor_name text,
  invoice_number text,
  receipt_url text,

  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partially_paid')),
  payment_date date,
  payment_mode text CHECK (payment_mode IN ('cash', 'cheque', 'bank_transfer', 'upi', 'card')),
  payment_reference text,

  is_recurring boolean DEFAULT false,
  recurrence_period text CHECK (recurrence_period IN ('monthly', 'quarterly', 'annual')),

  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,

  recorded_by uuid REFERENCES auth.users(id),
  recorded_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Budget Alerts Table
CREATE TABLE IF NOT EXISTS budget_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id uuid NOT NULL REFERENCES budget_forecasts(id) ON DELETE CASCADE,
  category_id uuid REFERENCES forecast_expense_categories(id) ON DELETE CASCADE,

  alert_type text NOT NULL CHECK (alert_type IN ('threshold_warning', 'threshold_critical', 'exceeded')),
  threshold_percentage integer NOT NULL DEFAULT 80 CHECK (threshold_percentage > 0 AND threshold_percentage <= 150),

  budget_amount decimal(12,2) NOT NULL,
  actual_amount decimal(12,2) NOT NULL,
  utilization_percentage decimal(5,2) NOT NULL,

  alert_message text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),

  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  resolution_notes text,

  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Budget Variance Snapshots (for historical trending)
CREATE TABLE IF NOT EXISTS budget_variance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id uuid NOT NULL REFERENCES budget_forecasts(id) ON DELETE CASCADE,

  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  snapshot_period text NOT NULL CHECK (snapshot_period IN ('weekly', 'monthly', 'quarterly')),

  total_budget decimal(12,2) NOT NULL,
  total_actual decimal(12,2) NOT NULL,
  total_variance decimal(12,2) NOT NULL,
  variance_percentage decimal(5,2) NOT NULL,

  categories_summary jsonb NOT NULL DEFAULT '[]'::jsonb,

  created_at timestamptz DEFAULT now(),

  UNIQUE(forecast_id, snapshot_date, snapshot_period)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_actual_expenses_forecast ON actual_expenses(forecast_id);
CREATE INDEX IF NOT EXISTS idx_actual_expenses_category ON actual_expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_actual_expenses_date ON actual_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_actual_expenses_payment_status ON actual_expenses(payment_status);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_forecast ON budget_alerts(forecast_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_status ON budget_alerts(status);
CREATE INDEX IF NOT EXISTS idx_budget_variance_snapshots_forecast ON budget_variance_snapshots(forecast_id);

-- Enable Row Level Security
ALTER TABLE actual_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_variance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for actual_expenses

-- Admins can view expenses for their apartment forecasts
CREATE POLICY "Admins can view own apartment expenses"
  ON actual_expenses FOR SELECT
  TO authenticated
  USING (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- Super admins can view all expenses
CREATE POLICY "Super admins can view all expenses"
  ON actual_expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Admins can create expenses for their apartment forecasts
CREATE POLICY "Admins can create expenses"
  ON actual_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- Admins can update expenses for their apartment forecasts
CREATE POLICY "Admins can update expenses"
  ON actual_expenses FOR UPDATE
  TO authenticated
  USING (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  )
  WITH CHECK (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- Admins can delete expenses
CREATE POLICY "Admins can delete expenses"
  ON actual_expenses FOR DELETE
  TO authenticated
  USING (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- RLS Policies for budget_alerts

-- View policies similar to actual_expenses
CREATE POLICY "Admins can view own apartment alerts"
  ON budget_alerts FOR SELECT
  TO authenticated
  USING (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

CREATE POLICY "Super admins can view all alerts"
  ON budget_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

-- System can create alerts
CREATE POLICY "System can create alerts"
  ON budget_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can update alerts (acknowledge/resolve)
CREATE POLICY "Admins can update alerts"
  ON budget_alerts FOR UPDATE
  TO authenticated
  USING (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

-- RLS Policies for budget_variance_snapshots

CREATE POLICY "Admins can view own snapshots"
  ON budget_variance_snapshots FOR SELECT
  TO authenticated
  USING (
    forecast_id IN (
      SELECT bf.id FROM budget_forecasts bf
      WHERE bf.apartment_id IN (
        SELECT apartment_id FROM admins
        WHERE user_id = auth.uid()
        AND status = 'active'
      )
    )
  );

CREATE POLICY "Super admins can view all snapshots"
  ON budget_variance_snapshots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE user_id = auth.uid()
      AND status = 'active'
    )
  );

CREATE POLICY "System can create snapshots"
  ON budget_variance_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to calculate budget utilization for a forecast
CREATE OR REPLACE FUNCTION get_budget_utilization(p_forecast_id uuid)
RETURNS TABLE (
  category_id uuid,
  category_name text,
  budget_amount decimal,
  actual_amount decimal,
  variance_amount decimal,
  variance_percentage decimal,
  utilization_percentage decimal,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    fec.id AS category_id,
    fec.category_name,
    fec.forecast_amount AS budget_amount,
    COALESCE(SUM(ae.expense_amount), 0) AS actual_amount,
    (fec.forecast_amount - COALESCE(SUM(ae.expense_amount), 0)) AS variance_amount,
    CASE
      WHEN fec.forecast_amount > 0 THEN
        ((fec.forecast_amount - COALESCE(SUM(ae.expense_amount), 0)) / fec.forecast_amount * 100)
      ELSE 0
    END AS variance_percentage,
    CASE
      WHEN fec.forecast_amount > 0 THEN
        (COALESCE(SUM(ae.expense_amount), 0) / fec.forecast_amount * 100)
      ELSE 0
    END AS utilization_percentage,
    CASE
      WHEN fec.forecast_amount = 0 THEN 'no_budget'
      WHEN COALESCE(SUM(ae.expense_amount), 0) = 0 THEN 'not_started'
      WHEN COALESCE(SUM(ae.expense_amount), 0) > fec.forecast_amount THEN 'over_budget'
      WHEN (COALESCE(SUM(ae.expense_amount), 0) / fec.forecast_amount * 100) >= 90 THEN 'critical'
      WHEN (COALESCE(SUM(ae.expense_amount), 0) / fec.forecast_amount * 100) >= 80 THEN 'warning'
      ELSE 'on_track'
    END AS status
  FROM forecast_expense_categories fec
  LEFT JOIN actual_expenses ae ON ae.category_id = fec.id
  WHERE fec.forecast_id = p_forecast_id
    AND fec.is_enabled = true
  GROUP BY fec.id, fec.category_name, fec.forecast_amount
  ORDER BY fec.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and create budget alerts
CREATE OR REPLACE FUNCTION check_budget_alerts(p_forecast_id uuid)
RETURNS void AS $$
DECLARE
  v_category RECORD;
  v_utilization decimal;
  v_alert_type text;
  v_severity text;
  v_message text;
BEGIN
  FOR v_category IN
    SELECT * FROM get_budget_utilization(p_forecast_id)
  LOOP
    v_utilization := v_category.utilization_percentage;

    -- Determine alert type and severity
    IF v_utilization >= 100 THEN
      v_alert_type := 'exceeded';
      v_severity := 'critical';
      v_message := format('Budget exceeded for %s: ₹%s spent vs ₹%s budgeted',
        v_category.category_name,
        v_category.actual_amount,
        v_category.budget_amount);
    ELSIF v_utilization >= 90 THEN
      v_alert_type := 'threshold_critical';
      v_severity := 'critical';
      v_message := format('Critical: %s%% of budget used for %s',
        ROUND(v_utilization, 1),
        v_category.category_name);
    ELSIF v_utilization >= 80 THEN
      v_alert_type := 'threshold_warning';
      v_severity := 'warning';
      v_message := format('Warning: %s%% of budget used for %s',
        ROUND(v_utilization, 1),
        v_category.category_name);
    ELSE
      CONTINUE;
    END IF;

    -- Check if alert already exists and is active
    IF NOT EXISTS (
      SELECT 1 FROM budget_alerts
      WHERE forecast_id = p_forecast_id
        AND category_id = v_category.category_id
        AND alert_type = v_alert_type
        AND status = 'active'
    ) THEN
      -- Create new alert
      INSERT INTO budget_alerts (
        forecast_id,
        category_id,
        alert_type,
        threshold_percentage,
        budget_amount,
        actual_amount,
        utilization_percentage,
        alert_message,
        severity,
        status
      ) VALUES (
        p_forecast_id,
        v_category.category_id,
        v_alert_type,
        CASE
          WHEN v_utilization >= 100 THEN 100
          WHEN v_utilization >= 90 THEN 90
          ELSE 80
        END,
        v_category.budget_amount,
        v_category.actual_amount,
        v_utilization,
        v_message,
        v_severity,
        'active'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check budget alerts after expense insert/update
CREATE OR REPLACE FUNCTION trigger_check_budget_alerts()
RETURNS trigger AS $$
BEGIN
  PERFORM check_budget_alerts(NEW.forecast_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_budget_alert_check ON actual_expenses;
CREATE TRIGGER trigger_budget_alert_check
  AFTER INSERT OR UPDATE ON actual_expenses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_budget_alerts();

-- Function to get forecast summary with actuals
CREATE OR REPLACE FUNCTION get_forecast_summary(p_forecast_id uuid)
RETURNS TABLE (
  total_budget decimal,
  total_actual decimal,
  total_variance decimal,
  variance_percentage decimal,
  utilization_percentage decimal,
  categories_on_track integer,
  categories_warning integer,
  categories_critical integer,
  categories_over_budget integer,
  active_alerts_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COALESCE(SUM(forecast_amount), 0)
     FROM forecast_expense_categories
     WHERE forecast_id = p_forecast_id AND is_enabled = true) AS total_budget,

    (SELECT COALESCE(SUM(expense_amount), 0)
     FROM actual_expenses
     WHERE forecast_id = p_forecast_id) AS total_actual,

    ((SELECT COALESCE(SUM(forecast_amount), 0)
      FROM forecast_expense_categories
      WHERE forecast_id = p_forecast_id AND is_enabled = true) -
     (SELECT COALESCE(SUM(expense_amount), 0)
      FROM actual_expenses
      WHERE forecast_id = p_forecast_id)) AS total_variance,

    CASE
      WHEN (SELECT COALESCE(SUM(forecast_amount), 0)
            FROM forecast_expense_categories
            WHERE forecast_id = p_forecast_id AND is_enabled = true) > 0
      THEN
        (((SELECT COALESCE(SUM(forecast_amount), 0)
           FROM forecast_expense_categories
           WHERE forecast_id = p_forecast_id AND is_enabled = true) -
          (SELECT COALESCE(SUM(expense_amount), 0)
           FROM actual_expenses
           WHERE forecast_id = p_forecast_id)) /
         (SELECT COALESCE(SUM(forecast_amount), 0)
          FROM forecast_expense_categories
          WHERE forecast_id = p_forecast_id AND is_enabled = true) * 100)
      ELSE 0
    END AS variance_percentage,

    CASE
      WHEN (SELECT COALESCE(SUM(forecast_amount), 0)
            FROM forecast_expense_categories
            WHERE forecast_id = p_forecast_id AND is_enabled = true) > 0
      THEN
        ((SELECT COALESCE(SUM(expense_amount), 0)
          FROM actual_expenses
          WHERE forecast_id = p_forecast_id) /
         (SELECT COALESCE(SUM(forecast_amount), 0)
          FROM forecast_expense_categories
          WHERE forecast_id = p_forecast_id AND is_enabled = true) * 100)
      ELSE 0
    END AS utilization_percentage,

    (SELECT COUNT(*) FROM get_budget_utilization(p_forecast_id) WHERE status = 'on_track')::integer,
    (SELECT COUNT(*) FROM get_budget_utilization(p_forecast_id) WHERE status = 'warning')::integer,
    (SELECT COUNT(*) FROM get_budget_utilization(p_forecast_id) WHERE status = 'critical')::integer,
    (SELECT COUNT(*) FROM get_budget_utilization(p_forecast_id) WHERE status = 'over_budget')::integer,

    (SELECT COUNT(*)::integer FROM budget_alerts
     WHERE forecast_id = p_forecast_id AND status = 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_budget_utilization(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_budget_alerts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_forecast_summary(uuid) TO authenticated;