/*
  # Create FAQs and Helpful Tips System

  ## Summary
  Creates a comprehensive FAQ and helpful tips system for occupants to get answers to common questions about using the payment portal and understanding the payment process.

  ## 1. New Tables

  ### `faqs`
  - `id` (uuid, primary key) - Unique identifier
  - `category` (text, not null) - FAQ category (e.g., 'payments', 'login', 'troubleshooting', 'general')
  - `question` (text, not null) - The FAQ question
  - `answer` (text, not null) - The detailed answer
  - `order_position` (integer, default 0) - Display order within category
  - `is_published` (boolean, default true) - Whether FAQ is visible to users
  - `view_count` (integer, default 0) - Number of times viewed
  - `helpful_count` (integer, default 0) - Number of users who found it helpful
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
  - `created_by` (uuid) - Admin who created the FAQ

  ### `helpful_tips`
  - `id` (uuid, primary key) - Unique identifier
  - `tip_type` (text, not null) - Type of tip (e.g., 'quick_tip', 'important', 'did_you_know')
  - `title` (text, not null) - Tip title
  - `content` (text, not null) - Tip content
  - `icon` (text) - Icon name for display
  - `color` (text) - Color theme for the tip card
  - `order_position` (integer, default 0) - Display order
  - `is_active` (boolean, default true) - Whether tip is visible
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ## 2. Security
  - Enable RLS on both tables
  - All authenticated users can view published FAQs and active tips
  - Only super admins and apartment admins can create/update/delete FAQs and tips
  - Track view counts and helpful counts for analytics

  ## 3. Indexes
  - Index on category for fast filtering
  - Index on is_published for filtering visible FAQs
  - Index on order_position for sorting
  - Index on tip_type for filtering tips

  ## 4. Initial Data
  - Seed common FAQs about payments, login, and troubleshooting
  - Seed helpful tips for occupants
*/

-- Create faqs table
CREATE TABLE IF NOT EXISTS faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('payments', 'login', 'account', 'troubleshooting', 'general')),
  question text NOT NULL,
  answer text NOT NULL,
  order_position integer DEFAULT 0,
  is_published boolean DEFAULT true,
  view_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create helpful_tips table
CREATE TABLE IF NOT EXISTS helpful_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tip_type text NOT NULL CHECK (tip_type IN ('quick_tip', 'important', 'did_you_know', 'best_practice')),
  title text NOT NULL,
  content text NOT NULL,
  icon text DEFAULT 'info',
  color text DEFAULT 'blue',
  order_position integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_published ON faqs(is_published);
CREATE INDEX IF NOT EXISTS idx_faqs_order ON faqs(order_position);
CREATE INDEX IF NOT EXISTS idx_helpful_tips_type ON helpful_tips(tip_type);
CREATE INDEX IF NOT EXISTS idx_helpful_tips_active ON helpful_tips(is_active);
CREATE INDEX IF NOT EXISTS idx_helpful_tips_order ON helpful_tips(order_position);

-- Enable RLS
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE helpful_tips ENABLE ROW LEVEL SECURITY;

-- FAQs Policies

-- All authenticated users can view published FAQs
CREATE POLICY "Authenticated users can view published FAQs"
  ON faqs FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Super admins can view all FAQs
CREATE POLICY "Super admins can view all FAQs"
  ON faqs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN super_admins sa ON sa.user_id = a.user_id
      WHERE a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- Super admins and apartment admins can create FAQs
CREATE POLICY "Admins can create FAQs"
  ON faqs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Super admins and apartment admins can update FAQs
CREATE POLICY "Admins can update FAQs"
  ON faqs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Super admins can delete FAQs
CREATE POLICY "Super admins can delete FAQs"
  ON faqs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN super_admins sa ON sa.user_id = a.user_id
      WHERE a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- Helpful Tips Policies

-- All authenticated users can view active tips
CREATE POLICY "Authenticated users can view active tips"
  ON helpful_tips FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Super admins can view all tips
CREATE POLICY "Super admins can view all tips"
  ON helpful_tips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN super_admins sa ON sa.user_id = a.user_id
      WHERE a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- Super admins and apartment admins can manage tips
CREATE POLICY "Admins can create tips"
  ON helpful_tips FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
  );

CREATE POLICY "Admins can update tips"
  ON helpful_tips FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.user_id = auth.uid()
      AND admins.status = 'active'
    )
  );

CREATE POLICY "Super admins can delete tips"
  ON helpful_tips FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins a
      JOIN super_admins sa ON sa.user_id = a.user_id
      WHERE a.user_id = auth.uid()
      AND a.status = 'active'
    )
  );

-- Function to increment FAQ view count
CREATE OR REPLACE FUNCTION increment_faq_views(faq_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE faqs
  SET view_count = view_count + 1
  WHERE id = faq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark FAQ as helpful
CREATE OR REPLACE FUNCTION mark_faq_helpful(faq_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE faqs
  SET helpful_count = helpful_count + 1
  WHERE id = faq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_faq_views TO authenticated;
GRANT EXECUTE ON FUNCTION mark_faq_helpful TO authenticated;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER faqs_updated_at
  BEFORE UPDATE ON faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_updated_at();

CREATE TRIGGER helpful_tips_updated_at
  BEFORE UPDATE ON helpful_tips
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_updated_at();

-- Insert default FAQs
INSERT INTO faqs (category, question, answer, order_position, is_published) VALUES
  ('login', 'How do I access the occupant portal?', 'To access the occupant portal, you need to use the mobile number that your apartment admin has registered for your flat. Click on "Occupant Login" on the home page, enter your mobile number, and you will receive an OTP to verify your identity. Once verified, you can view all your payment history and submit new payments.', 1, true),
  
  ('login', 'I forgot my mobile number. What should I do?', 'Please contact your apartment admin to verify the mobile number registered for your flat. The admin can check the occupant management section to confirm or update your mobile number.', 2, true),
  
  ('login', 'Why am I not receiving the OTP?', 'If you are not receiving the OTP, please check: 1) Your mobile number is correctly entered, 2) Your phone has good network coverage, 3) You have not blocked messages from unknown numbers. If the problem persists, contact your apartment admin to verify that the correct mobile number is registered for your flat.', 3, true),
  
  ('payments', 'How do I submit a payment?', 'After logging in, click on "Submit Payment" and fill in all required details including: your name, flat number, payment amount, payment date, and upload a screenshot of your payment confirmation. Make sure the payment screenshot is clear and shows all transaction details.', 1, true),
  
  ('payments', 'What payment details should I include in the screenshot?', 'Your payment screenshot should clearly show: 1) Transaction ID or reference number, 2) Date and time of payment, 3) Amount paid, 4) Recipient name or account, 5) Your name or UPI ID. This helps the admin verify your payment quickly.', 2, true),
  
  ('payments', 'Can I submit multiple payments at once?', 'Yes, you can submit multiple payment records. However, each payment submission requires its own screenshot. If you made payments for different quarters or purposes, submit them separately for better tracking.', 3, true),
  
  ('payments', 'How long does it take for my payment to be verified?', 'Once you submit a payment, your apartment admin will review it within 24-48 hours. You can check the status of your payment in the "Payment History" section. Payments go through three stages: Received → Reviewed → Approved.', 4, true),
  
  ('payments', 'What payment methods are accepted?', 'Most apartments accept UPI, bank transfers (NEFT/RTGS/IMPS), and online banking. Check with your apartment admin for specific payment instructions and account details.', 5, true),
  
  ('payments', 'Can I edit my payment submission after submitting?', 'No, you cannot edit a payment submission once it is submitted. If you made a mistake, please contact your apartment admin who can make corrections on your behalf.', 6, true),
  
  ('account', 'How can I view my payment history?', 'After logging in to the occupant portal, your payment history is displayed on the main dashboard. You can see all your submitted payments, their status, amounts, and dates. Use the filters to search by date range or payment type.', 1, true),
  
  ('account', 'Can I download my payment receipts?', 'Yes, once your payment is approved by the admin, you can download or view the payment screenshot you submitted. Keep these for your records.', 2, true),
  
  ('account', 'What if I have multiple flats in the same apartment?', 'If you own or rent multiple flats, you can log in using the mobile number registered for any of your flats. The system will automatically show you all flats associated with your mobile number, and you can view payment history for each flat separately.', 3, true),
  
  ('troubleshooting', 'The payment screenshot is not uploading. What should I do?', 'If your screenshot is not uploading, check: 1) The file size is not too large (should be under 5MB), 2) The file format is supported (JPG, PNG, PDF), 3) Your internet connection is stable. Try compressing the image if it is too large, or take a new clearer screenshot.', 1, true),
  
  ('troubleshooting', 'I submitted a wrong payment amount. What should I do?', 'Contact your apartment admin immediately with the correct details. The admin can update the payment information in the system. It is better to inform them before they review the payment.', 2, true),
  
  ('troubleshooting', 'My payment shows as Received but has not been Approved yet. Why?', 'Your payment goes through a review process: Received (submitted by you) → Reviewed (admin has seen it) → Approved (admin confirmed it is correct). This process typically takes 24-48 hours. If it takes longer, please contact your apartment admin.', 3, true),
  
  ('general', 'How do I know what amount to pay?', 'Your apartment admin will communicate the payment amounts, due dates, and payment periods through notices or messages. You can also check the active collections in your portal dashboard which shows the expected payment details.', 1, true),
  
  ('general', 'When are maintenance payments due?', 'Payment due dates vary by apartment. Your admin sets the schedule, which is typically quarterly (every 3 months). Check the active collections in your dashboard or contact your admin for specific due dates.', 2, true),
  
  ('general', 'Who should I contact if I have questions?', 'For any questions about your payments, account, or apartment-specific matters, please contact your apartment admin. Their contact information should be available through your apartment association or notice board.', 3, true),
  
  ('general', 'Is my payment information secure?', 'Yes, all your payment information is stored securely in an encrypted database. Only you and your apartment admin can view your payment details. We follow industry-standard security practices to protect your data.', 4, true);

-- Insert helpful tips
INSERT INTO helpful_tips (tip_type, title, content, icon, color, order_position, is_active) VALUES
  ('quick_tip', 'Keep Your Screenshots Clear', 'Always ensure your payment screenshots are clear and readable. Take screenshots immediately after making the payment when all details are visible on the screen. Avoid cropping important information like transaction ID, date, and amount.', 'camera', 'blue', 1, true),
  
  ('important', 'Verify Payment Details Before Submitting', 'Double-check all details before submitting: flat number, payment amount, payment date, and payment type. Incorrect information can delay the approval process.', 'alert-circle', 'red', 2, true),
  
  ('did_you_know', 'You Can Track Your Payment Status', 'Did you know you can track the status of your payments in real-time? Log in anytime to see if your payment has been received, reviewed, or approved by your admin.', 'info', 'purple', 3, true),
  
  ('best_practice', 'Submit Payments Promptly', 'Submit your payment proof within 24 hours of making the payment. This helps your admin maintain accurate records and ensures timely approval.', 'check-circle', 'green', 4, true),
  
  ('quick_tip', 'Save Confirmation Messages', 'Save all payment confirmation messages and emails from your bank or UPI app. These serve as backup proof if needed for verification.', 'save', 'blue', 5, true),
  
  ('important', 'One Payment, One Screenshot', 'Submit each payment separately with its own screenshot. Do not combine multiple payments in one submission as it makes verification difficult.', 'file-text', 'orange', 6, true),
  
  ('did_you_know', 'Payment History Never Expires', 'Your complete payment history is permanently stored in the system. You can view payments from any previous quarter or year anytime you need.', 'clock', 'purple', 7, true),
  
  ('best_practice', 'Pay Before Due Date', 'Try to make payments a few days before the due date to avoid last-minute issues with bank systems or network problems.', 'calendar', 'green', 8, true);
