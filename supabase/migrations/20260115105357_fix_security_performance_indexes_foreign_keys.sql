/*
  # Fix Security and Performance - Foreign Key Indexes

  1. Foreign Key Indexes
    - Add covering indexes for all foreign keys to improve query performance
    - Prevents table scans on JOIN operations
    
  2. Tables Affected
    - budget_alerts (forecast_id)
    - chatbot_conversations (apartment_id, user_id)
    - chatbot_messages (conversation_id)
    - collection_status_shares (apartment_id, expected_collection_id)
    - email_reminders (apartment_id, expected_collection_id)
    - forecast_status_history (forecast_id)
    - occupant_otp_codes (flat_id)
    - occupant_sessions (apartment_id)
    - ocr_test_results (created_by)
    - payment_audit_trail (apartment_id, performed_by)
    - payment_image_signals (similar_to_payment_id)
    - payment_reminder_schedule (apartment_id)
*/

-- Add foreign key indexes for better performance
CREATE INDEX IF NOT EXISTS idx_budget_alerts_forecast_id ON budget_alerts(forecast_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_apartment_id ON chatbot_conversations(apartment_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation_id ON chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_collection_status_shares_apartment_id ON collection_status_shares(apartment_id);
CREATE INDEX IF NOT EXISTS idx_collection_status_shares_expected_collection_id ON collection_status_shares(expected_collection_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_apartment_id ON email_reminders(apartment_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_expected_collection_id ON email_reminders(expected_collection_id);
CREATE INDEX IF NOT EXISTS idx_forecast_status_history_forecast_id ON forecast_status_history(forecast_id);
CREATE INDEX IF NOT EXISTS idx_occupant_otp_codes_flat_id ON occupant_otp_codes(flat_id);
CREATE INDEX IF NOT EXISTS idx_occupant_sessions_apartment_id ON occupant_sessions(apartment_id);
CREATE INDEX IF NOT EXISTS idx_ocr_test_results_created_by ON ocr_test_results(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_audit_trail_apartment_id ON payment_audit_trail(apartment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_trail_performed_by ON payment_audit_trail(performed_by);
CREATE INDEX IF NOT EXISTS idx_payment_image_signals_similar_to_payment_id ON payment_image_signals(similar_to_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminder_schedule_apartment_id ON payment_reminder_schedule(apartment_id);
