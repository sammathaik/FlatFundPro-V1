/*
  # Security Fix Part 1: Foreign Key Indexes and Cleanup

  This migration addresses index-related security and performance issues:

  ## 1. Unindexed Foreign Keys (28 additions)
  - Adds indexes to all foreign key columns for optimal query performance

  ## 2. Unused Indexes Cleanup (50+ removals)
  - Removes indexes that are not being used to reduce overhead

  ## 3. Duplicate Index Removal
  - Removes duplicate index on flat_numbers table

  ## Important Notes:
  - This is Part 1 focusing on indexes only
  - All changes are backward compatible
  - No data loss occurs
  - Improves query performance significantly
*/

-- =====================================================
-- SECTION 1: ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

-- actual_expenses
CREATE INDEX IF NOT EXISTS idx_actual_expenses_recorded_by
  ON public.actual_expenses(recorded_by);

-- admin_notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_related_classification_id
  ON public.admin_notifications(related_classification_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_related_occupant_id
  ON public.admin_notifications(related_occupant_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_related_payment_id
  ON public.admin_notifications(related_payment_id);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_resolved_by_user_id
  ON public.admin_notifications(resolved_by_user_id);

-- bank_template_patterns
CREATE INDEX IF NOT EXISTS idx_bank_template_patterns_created_by
  ON public.bank_template_patterns(created_by);

-- budget_alerts
CREATE INDEX IF NOT EXISTS idx_budget_alerts_acknowledged_by
  ON public.budget_alerts(acknowledged_by);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_category_id
  ON public.budget_alerts(category_id);

-- budget_forecasts
CREATE INDEX IF NOT EXISTS idx_budget_forecasts_approved_by
  ON public.budget_forecasts(approved_by);

CREATE INDEX IF NOT EXISTS idx_budget_forecasts_created_by
  ON public.budget_forecasts(created_by);

CREATE INDEX IF NOT EXISTS idx_budget_forecasts_proposed_by
  ON public.budget_forecasts(proposed_by);

-- collection_status_shares
CREATE INDEX IF NOT EXISTS idx_collection_status_shares_created_by
  ON public.collection_status_shares(created_by);

-- communication_access_audit
CREATE INDEX IF NOT EXISTS idx_communication_access_audit_accessed_by_user_id
  ON public.communication_access_audit(accessed_by_user_id);

CREATE INDEX IF NOT EXISTS idx_communication_access_audit_communication_log_id
  ON public.communication_access_audit(communication_log_id);

-- communication_logs
CREATE INDEX IF NOT EXISTS idx_communication_logs_triggered_by_user_id
  ON public.communication_logs(triggered_by_user_id);

-- communication_preferences
CREATE INDEX IF NOT EXISTS idx_communication_preferences_updated_by_user_id
  ON public.communication_preferences(updated_by_user_id);

-- email_reminders
CREATE INDEX IF NOT EXISTS idx_email_reminders_created_by
  ON public.email_reminders(created_by);

-- faqs
CREATE INDEX IF NOT EXISTS idx_faqs_created_by
  ON public.faqs(created_by);

-- forecast_status_history
CREATE INDEX IF NOT EXISTS idx_forecast_status_history_changed_by
  ON public.forecast_status_history(changed_by);

-- image_fraud_analysis
CREATE INDEX IF NOT EXISTS idx_image_fraud_analysis_duplicate_of_payment_id
  ON public.image_fraud_analysis(duplicate_of_payment_id);

-- occupant_notifications
CREATE INDEX IF NOT EXISTS idx_occupant_notifications_flat_id
  ON public.occupant_notifications(flat_id);

-- payment_document_classifications
CREATE INDEX IF NOT EXISTS idx_payment_document_classifications_classified_by_user_id
  ON public.payment_document_classifications(classified_by_user_id);

-- payment_reminders
CREATE INDEX IF NOT EXISTS idx_payment_reminders_block_id
  ON public.payment_reminders(block_id);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_flat_id
  ON public.payment_reminders(flat_id);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_notification_id
  ON public.payment_reminders(notification_id);

-- super_admin_notifications
CREATE INDEX IF NOT EXISTS idx_super_admin_notifications_related_lead_id
  ON public.super_admin_notifications(related_lead_id);

CREATE INDEX IF NOT EXISTS idx_super_admin_notifications_resolved_by_user_id
  ON public.super_admin_notifications(resolved_by_user_id);

-- system_settings
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_by
  ON public.system_settings(updated_by);

-- =====================================================
-- SECTION 2: DROP UNUSED INDEXES
-- =====================================================

-- Budget-related unused indexes
DROP INDEX IF EXISTS public.idx_budget_forecasts_status;
DROP INDEX IF EXISTS public.idx_budget_forecasts_year;
DROP INDEX IF EXISTS public.idx_forecast_status_history_forecast;
DROP INDEX IF EXISTS public.idx_actual_expenses_date;
DROP INDEX IF EXISTS public.idx_actual_expenses_payment_status;
DROP INDEX IF EXISTS public.idx_budget_alerts_forecast;
DROP INDEX IF EXISTS public.idx_budget_variance_snapshots_forecast;

-- Collection-related unused indexes
DROP INDEX IF EXISTS public.idx_collection_status_shares_collection;
DROP INDEX IF EXISTS public.idx_collection_status_shares_apartment;

-- Fraud detection unused indexes
DROP INDEX IF EXISTS public.idx_fraud_analysis_risk_score;
DROP INDEX IF EXISTS public.idx_fraud_analysis_flagged;
DROP INDEX IF EXISTS public.idx_fraud_analysis_status;
DROP INDEX IF EXISTS public.idx_phash_value;
DROP INDEX IF EXISTS public.idx_phash_flagged;
DROP INDEX IF EXISTS public.idx_bank_patterns_active;
DROP INDEX IF EXISTS public.idx_fraud_rules_active;

-- Email reminders unused indexes
DROP INDEX IF EXISTS public.idx_email_reminders_sent_at;
DROP INDEX IF EXISTS public.idx_email_reminders_apartment;
DROP INDEX IF EXISTS public.idx_email_reminders_collection;

-- Payment submissions unused indexes
DROP INDEX IF EXISTS public.idx_payment_submissions_validation_status;
DROP INDEX IF EXISTS public.idx_payment_submissions_validation_score;
DROP INDEX IF EXISTS public.idx_payment_submissions_submission_source;
DROP INDEX IF EXISTS public.idx_payment_submissions_admin_action_type;
DROP INDEX IF EXISTS public.idx_payment_submissions_committee_verified;

-- OCR test results unused indexes
DROP INDEX IF EXISTS public.idx_ocr_test_results_created_by;
DROP INDEX IF EXISTS public.idx_ocr_test_results_winner;

-- Flat numbers unused indexes
DROP INDEX IF EXISTS public.idx_flat_numbers_flat_type;

-- Expected collections unused indexes
DROP INDEX IF EXISTS public.idx_expected_collections_flat_type_rates;

-- Classification unused indexes
DROP INDEX IF EXISTS public.idx_classifications_confidence;
DROP INDEX IF EXISTS public.idx_classifications_created_at;

-- Notification unused indexes
DROP INDEX IF EXISTS public.idx_notifications_unread;
DROP INDEX IF EXISTS public.idx_super_admin_notifications_is_read;
DROP INDEX IF EXISTS public.idx_super_admin_notifications_severity;
DROP INDEX IF EXISTS public.idx_admin_notifications_metadata;

-- Chatbot unused indexes
DROP INDEX IF EXISTS public.idx_chatbot_conversations_user_id;
DROP INDEX IF EXISTS public.idx_chatbot_conversations_session_id;
DROP INDEX IF EXISTS public.idx_chatbot_conversations_apartment_id;
DROP INDEX IF EXISTS public.idx_chatbot_messages_conversation_id;
DROP INDEX IF EXISTS public.idx_chatbot_messages_created_at;
DROP INDEX IF EXISTS public.idx_chatbot_knowledge_base_keywords;

-- Notification outbox unused indexes
DROP INDEX IF EXISTS public.idx_notification_outbox_sent_at;
DROP INDEX IF EXISTS public.idx_notification_outbox_recipient_phone;
DROP INDEX IF EXISTS public.idx_notification_outbox_status;
DROP INDEX IF EXISTS public.idx_notification_outbox_template_name;

-- Payment reminder unused indexes
DROP INDEX IF EXISTS public.idx_reminder_schedule_apartment;
DROP INDEX IF EXISTS public.idx_reminder_schedule_active;
DROP INDEX IF EXISTS public.idx_reminder_schedule_dates;
DROP INDEX IF EXISTS public.idx_payment_reminders_sent_at;

-- Audit trail unused indexes
DROP INDEX IF EXISTS public.idx_payment_audit_trail_apartment;
DROP INDEX IF EXISTS public.idx_payment_audit_trail_performed_by;
DROP INDEX IF EXISTS public.idx_payment_audit_trail_action_type;

-- Communication logs unused indexes
DROP INDEX IF EXISTS public.idx_communication_logs_flat_number;
DROP INDEX IF EXISTS public.idx_communication_logs_status;

-- System settings unused index
DROP INDEX IF EXISTS public.idx_system_settings_key;

-- Occupant sessions unused index
DROP INDEX IF EXISTS public.idx_occupant_sessions_apartment_id;

-- =====================================================
-- SECTION 3: DROP DUPLICATE INDEX
-- =====================================================

-- Keep idx_flat_numbers_block_id, drop idx_flats_block
DROP INDEX IF EXISTS public.idx_flats_block;
