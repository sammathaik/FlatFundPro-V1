/*
  # Drop Unused and Duplicate Indexes

  1. Unused Indexes
    - Remove indexes that are not being used by queries
    - Reduces storage overhead and write performance impact
    
  2. Duplicate Indexes
    - Remove redundant indexes that provide identical functionality
    - Keeps only one of each duplicate pair
*/

-- Drop unused indexes (these are not being used based on query patterns)
DROP INDEX IF EXISTS idx_hash_index_first_payment;
DROP INDEX IF EXISTS idx_occupant_otp_codes_email;
DROP INDEX IF EXISTS idx_occupant_otp_codes_mobile;
DROP INDEX IF EXISTS idx_occupant_otp_codes_email_created;
DROP INDEX IF EXISTS idx_actual_expenses_recorded_by;
DROP INDEX IF EXISTS idx_admin_notifications_resolved_by_user_id;
DROP INDEX IF EXISTS idx_bank_template_patterns_created_by;
DROP INDEX IF EXISTS idx_budget_alerts_acknowledged_by;
DROP INDEX IF EXISTS idx_budget_alerts_category_id;
DROP INDEX IF EXISTS idx_budget_forecasts_approved_by;
DROP INDEX IF EXISTS idx_budget_forecasts_created_by;
DROP INDEX IF EXISTS idx_budget_forecasts_proposed_by;
DROP INDEX IF EXISTS idx_collection_status_shares_created_by;
DROP INDEX IF EXISTS idx_communication_access_audit_accessed_by_user_id;
DROP INDEX IF EXISTS idx_communication_access_audit_communication_log_id;
DROP INDEX IF EXISTS idx_communication_logs_triggered_by_user_id;
DROP INDEX IF EXISTS idx_communication_preferences_updated_by_user_id;
DROP INDEX IF EXISTS idx_email_reminders_created_by;
DROP INDEX IF EXISTS idx_faqs_created_by;
DROP INDEX IF EXISTS idx_forecast_status_history_changed_by;
DROP INDEX IF EXISTS idx_occupant_notifications_flat_id;
DROP INDEX IF EXISTS idx_payment_document_classifications_classified_by_user_id;
DROP INDEX IF EXISTS idx_payment_reminders_notification_id;
DROP INDEX IF EXISTS idx_super_admin_notifications_related_lead_id;
DROP INDEX IF EXISTS idx_super_admin_notifications_resolved_by_user_id;
DROP INDEX IF EXISTS idx_system_settings_updated_by;
DROP INDEX IF EXISTS idx_image_signals_duplicate;
DROP INDEX IF EXISTS idx_image_signals_analyzed;

-- Drop duplicate indexes (keep one of each pair)
-- For expected_collections: keep idx_expected_collections_apartment_active, drop idx_expected_collections_active
DROP INDEX IF EXISTS idx_expected_collections_active;

-- For flat_numbers: keep idx_flat_numbers_block_id, drop idx_flat_numbers_block
DROP INDEX IF EXISTS idx_flat_numbers_block;
