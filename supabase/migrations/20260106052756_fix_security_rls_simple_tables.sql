/*
  # Security Fix Part 2: Simple Table RLS Optimization

  This migration fixes RLS policies for tables without column dependencies.
  Focuses on super_admin and simple auth checks only.

  ## Important Notes:
  - Policies remain functionally identical
  - Only performance optimization pattern changes
*/

-- =====================================================
-- FIX OCR TEST RESULTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own OCR test results" ON public.ocr_test_results;
CREATE POLICY "Users can insert own OCR test results"
  ON public.ocr_test_results
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own OCR test results" ON public.ocr_test_results;
CREATE POLICY "Users can view own OCR test results"
  ON public.ocr_test_results
  FOR SELECT
  TO authenticated
  USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all OCR test results" ON public.ocr_test_results;
CREATE POLICY "Super admins can view all OCR test results"
  ON public.ocr_test_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX CHATBOT POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can update message feedback" ON public.chatbot_messages;
CREATE POLICY "Users can update message feedback"
  ON public.chatbot_messages
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chatbot_conversations
      WHERE id = chatbot_messages.conversation_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chatbot_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.chatbot_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chatbot_conversations
      WHERE id = chatbot_messages.conversation_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Super admins can manage knowledge base" ON public.chatbot_knowledge_base;
CREATE POLICY "Super admins can manage knowledge base"
  ON public.chatbot_knowledge_base
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Users can view own conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.chatbot_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Super admins can view all conversations" ON public.chatbot_conversations;
CREATE POLICY "Super admins can view all conversations"
  ON public.chatbot_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX SUPER ADMIN NOTIFICATIONS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all notifications" ON public.super_admin_notifications;
CREATE POLICY "Super admins can view all notifications"
  ON public.super_admin_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Super admins can update notifications" ON public.super_admin_notifications;
CREATE POLICY "Super admins can update notifications"
  ON public.super_admin_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX SYSTEM CONFIG POLICY
-- =====================================================

DROP POLICY IF EXISTS "super_admin_manage_config" ON public.system_config;
CREATE POLICY "super_admin_manage_config"
  ON public.system_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX FLAT EMAIL MAPPINGS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Occupants can view their mappings" ON public.flat_email_mappings;
CREATE POLICY "Occupants can view their mappings"
  ON public.flat_email_mappings
  FOR SELECT
  TO authenticated
  USING (email = (select auth.jwt()->>'email'));

DROP POLICY IF EXISTS "Super admins can view all occupants" ON public.flat_email_mappings;
CREATE POLICY "Super admins can view all occupants"
  ON public.flat_email_mappings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX BUILDINGS BLOCKS PHASES POLICY
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all buildings" ON public.buildings_blocks_phases;
CREATE POLICY "Super admins can view all buildings"
  ON public.buildings_blocks_phases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX APARTMENTS POLICY
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all apartments" ON public.apartments;
CREATE POLICY "Super admins can view all apartments"
  ON public.apartments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX ADMINS POLICY
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all admins" ON public.admins;
CREATE POLICY "Super admins can view all admins"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX EXPECTED COLLECTIONS POLICY
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all collections" ON public.expected_collections;
CREATE POLICY "Super admins can view all collections"
  ON public.expected_collections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX SYSTEM SETTINGS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all settings" ON public.system_settings;
CREATE POLICY "Super admins can view all settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Super admins can update settings" ON public.system_settings;
CREATE POLICY "Super admins can update settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Super admins can insert settings" ON public.system_settings;
CREATE POLICY "Super admins can insert settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Super admins can delete settings" ON public.system_settings;
CREATE POLICY "Super admins can delete settings"
  ON public.system_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX FAQS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all FAQs" ON public.faqs;
CREATE POLICY "Super admins can view all FAQs"
  ON public.faqs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Admins can create FAQs" ON public.faqs;
CREATE POLICY "Admins can create FAQs"
  ON public.faqs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admin_email = (select auth.jwt()->>'email')
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can update FAQs" ON public.faqs;
CREATE POLICY "Admins can update FAQs"
  ON public.faqs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admin_email = (select auth.jwt()->>'email')
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Super admins can delete FAQs" ON public.faqs;
CREATE POLICY "Super admins can delete FAQs"
  ON public.faqs
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX HELPFUL TIPS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Super admins can view all tips" ON public.helpful_tips;
CREATE POLICY "Super admins can view all tips"
  ON public.helpful_tips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Admins can create tips" ON public.helpful_tips;
CREATE POLICY "Admins can create tips"
  ON public.helpful_tips
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admin_email = (select auth.jwt()->>'email')
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can update tips" ON public.helpful_tips;
CREATE POLICY "Admins can update tips"
  ON public.helpful_tips
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admin_email = (select auth.jwt()->>'email')
      AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Super admins can delete tips" ON public.helpful_tips;
CREATE POLICY "Super admins can delete tips"
  ON public.helpful_tips
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

-- =====================================================
-- FIX FRAUD DETECTION POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all fraud analysis" ON public.image_fraud_analysis;
CREATE POLICY "Admins can view all fraud analysis"
  ON public.image_fraud_analysis
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admin_email = (select auth.jwt()->>'email')
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Admins can update fraud analysis" ON public.image_fraud_analysis;
CREATE POLICY "Admins can update fraud analysis"
  ON public.image_fraud_analysis
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admin_email = (select auth.jwt()->>'email')
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Admins can view all perceptual hashes" ON public.image_perceptual_hashes;
CREATE POLICY "Admins can view all perceptual hashes"
  ON public.image_perceptual_hashes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admin_email = (select auth.jwt()->>'email')
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Admins can view bank patterns" ON public.bank_template_patterns;
CREATE POLICY "Admins can view bank patterns"
  ON public.bank_template_patterns
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admin_email = (select auth.jwt()->>'email')
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Admins can manage bank patterns" ON public.bank_template_patterns;
CREATE POLICY "Admins can manage bank patterns"
  ON public.bank_template_patterns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admin_email = (select auth.jwt()->>'email')
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Admins can view fraud rules" ON public.fraud_detection_rules;
CREATE POLICY "Admins can view fraud rules"
  ON public.fraud_detection_rules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE admin_email = (select auth.jwt()->>'email')
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );

DROP POLICY IF EXISTS "Super admins can manage fraud rules" ON public.fraud_detection_rules;
CREATE POLICY "Super admins can manage fraud rules"
  ON public.fraud_detection_rules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE email = (select auth.jwt()->>'email')
    )
  );
