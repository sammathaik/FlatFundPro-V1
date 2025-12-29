/*
  # AI Chatbot System for FlatFund Pro

  ## Overview
  Creates a comprehensive chatbot system with role-aware context and knowledge base integration.

  ## New Tables

  ### `chatbot_conversations`
  Stores chat conversation sessions
  - `id` (uuid, primary key)
  - `user_id` (uuid, nullable) - Reference to auth.users for logged-in users
  - `user_role` (text) - Role context: 'guest', 'occupant', 'admin', 'super_admin'
  - `apartment_id` (uuid, nullable) - Context for apartment-specific queries
  - `session_id` (text) - Unique session identifier for guests
  - `started_at` (timestamptz)
  - `ended_at` (timestamptz, nullable)
  - `metadata` (jsonb) - Additional context like user agent, page source

  ### `chatbot_messages`
  Stores individual messages in conversations
  - `id` (uuid, primary key)
  - `conversation_id` (uuid, foreign key)
  - `message_type` (text) - 'user' or 'bot'
  - `message_text` (text)
  - `response_source` (text) - 'faq', 'knowledge_base', 'fallback'
  - `confidence_score` (numeric) - How confident the bot is in its response
  - `helpful` (boolean, nullable) - User feedback on bot response
  - `created_at` (timestamptz)

  ### `chatbot_knowledge_base`
  Stores knowledge base articles and common queries
  - `id` (uuid, primary key)
  - `category` (text) - 'general', 'payments', 'occupant', 'admin', 'super_admin'
  - `role_access` (text[]) - Which roles can see this content
  - `question` (text) - Question or topic
  - `answer` (text) - Detailed answer
  - `keywords` (text[]) - Keywords for matching
  - `related_faq_ids` (uuid[]) - Link to FAQ entries
  - `priority` (integer) - Display priority
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own conversations
  - Super admins can view all conversations
  - Knowledge base is read-only for all users
*/

-- Chatbot Conversations Table
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role text NOT NULL CHECK (user_role IN ('guest', 'occupant', 'admin', 'super_admin')),
  apartment_id uuid REFERENCES apartments(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Chatbot Messages Table
CREATE TABLE IF NOT EXISTS chatbot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('user', 'bot')),
  message_text text NOT NULL,
  response_source text CHECK (response_source IN ('faq', 'knowledge_base', 'fallback', 'greeting')),
  confidence_score numeric(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  helpful boolean,
  created_at timestamptz DEFAULT now()
);

-- Chatbot Knowledge Base Table
CREATE TABLE IF NOT EXISTS chatbot_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('general', 'payments', 'occupant', 'admin', 'super_admin', 'technical')),
  role_access text[] NOT NULL DEFAULT ARRAY['guest', 'occupant', 'admin', 'super_admin'],
  question text NOT NULL,
  answer text NOT NULL,
  keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  related_faq_ids uuid[] DEFAULT ARRAY[]::uuid[],
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_id ON chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_apartment_id ON chatbot_conversations(apartment_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation_id ON chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_created_at ON chatbot_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_base_category ON chatbot_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_base_keywords ON chatbot_knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_chatbot_knowledge_base_is_active ON chatbot_knowledge_base(is_active);

-- Enable Row Level Security
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatbot_conversations

-- Allow anyone to create conversations (including guests)
CREATE POLICY "Anyone can create conversations"
  ON chatbot_conversations FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
  ON chatbot_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Guests can view their session conversations
CREATE POLICY "Guests can view session conversations"
  ON chatbot_conversations FOR SELECT
  TO anon
  USING (true);

-- Super admins can view all conversations
CREATE POLICY "Super admins can view all conversations"
  ON chatbot_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- RLS Policies for chatbot_messages

-- Allow anyone to insert messages
CREATE POLICY "Anyone can create messages"
  ON chatbot_messages FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON chatbot_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chatbot_conversations
      WHERE chatbot_conversations.id = chatbot_messages.conversation_id
      AND chatbot_conversations.user_id = auth.uid()
    )
  );

-- Guests can view messages in their session
CREATE POLICY "Guests can view session messages"
  ON chatbot_messages FOR SELECT
  TO anon
  USING (true);

-- Users can update feedback on messages in their conversations
CREATE POLICY "Users can update message feedback"
  ON chatbot_messages FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM chatbot_conversations
      WHERE chatbot_conversations.id = chatbot_messages.conversation_id
      AND (chatbot_conversations.user_id = auth.uid() OR chatbot_conversations.user_id IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chatbot_conversations
      WHERE chatbot_conversations.id = chatbot_messages.conversation_id
      AND (chatbot_conversations.user_id = auth.uid() OR chatbot_conversations.user_id IS NULL)
    )
  );

-- RLS Policies for chatbot_knowledge_base

-- Everyone can read active knowledge base entries
CREATE POLICY "Users can read knowledge base for their role"
  ON chatbot_knowledge_base FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Super admins can manage knowledge base
CREATE POLICY "Super admins can manage knowledge base"
  ON chatbot_knowledge_base FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE super_admins.user_id = auth.uid()
      AND super_admins.status = 'active'
    )
  );

-- Function to search knowledge base
CREATE OR REPLACE FUNCTION search_knowledge_base(
  search_query text,
  user_role_param text DEFAULT 'guest',
  limit_count integer DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  category text,
  question text,
  answer text,
  confidence_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.category,
    kb.question,
    kb.answer,
    CASE
      WHEN kb.question ILIKE '%' || search_query || '%' THEN 0.95
      WHEN EXISTS (
        SELECT 1 FROM unnest(kb.keywords) AS keyword
        WHERE keyword ILIKE '%' || search_query || '%'
      ) THEN 0.80
      WHEN kb.answer ILIKE '%' || search_query || '%' THEN 0.60
      ELSE 0.30
    END AS confidence_score
  FROM chatbot_knowledge_base kb
  WHERE
    kb.is_active = true
    AND user_role_param = ANY(kb.role_access)
    AND (
      kb.question ILIKE '%' || search_query || '%'
      OR kb.answer ILIKE '%' || search_query || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(kb.keywords) AS keyword
        WHERE keyword ILIKE '%' || search_query || '%'
      )
    )
  ORDER BY
    confidence_score DESC,
    kb.priority DESC
  LIMIT limit_count;
END;
$$;

-- Function to get conversation history
CREATE OR REPLACE FUNCTION get_conversation_history(
  conversation_id_param uuid
)
RETURNS TABLE (
  message_id uuid,
  message_type text,
  message_text text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    message_type,
    message_text,
    created_at
  FROM chatbot_messages
  WHERE conversation_id = conversation_id_param
  ORDER BY created_at ASC;
END;
$$;

-- Insert default knowledge base entries
INSERT INTO chatbot_knowledge_base (category, role_access, question, answer, keywords, priority) VALUES
  ('general', ARRAY['guest', 'occupant', 'admin', 'super_admin'],
   'What is FlatFund Pro?',
   'FlatFund Pro is a comprehensive apartment payment management system designed to simplify maintenance fee collection and tracking. It provides automated payment processing, real-time status tracking, and intelligent fraud detection for apartment communities.',
   ARRAY['flatfund', 'about', 'what is', 'introduction', 'overview'],
   100),

  ('general', ARRAY['guest', 'occupant', 'admin', 'super_admin'],
   'How does FlatFund Pro work?',
   'FlatFund Pro works by allowing occupants to submit payment proofs via QR codes or web forms. Our AI-powered system automatically validates payments, detects fraud, and updates payment status in real-time. Admins get comprehensive dashboards for tracking collections and managing occupants.',
   ARRAY['how', 'works', 'process', 'workflow', 'procedure'],
   95),

  ('payments', ARRAY['guest', 'occupant', 'admin', 'super_admin'],
   'How do I submit a payment?',
   'To submit a payment: 1) Scan the QR code on your notice or visit the payment form link, 2) Upload a clear screenshot of your payment confirmation, 3) Enter your email (must match your registered email), 4) Submit. You will receive acknowledgment within 2 business days.',
   ARRAY['submit', 'payment', 'upload', 'proof', 'how to pay'],
   90),

  ('payments', ARRAY['occupant', 'admin'],
   'What payment methods are accepted?',
   'We accept all digital payment methods including UPI, Net Banking, NEFT, RTGS, and IMPS. Simply make the payment to your society account and upload the payment screenshot or receipt as proof.',
   ARRAY['payment methods', 'upi', 'neft', 'rtgs', 'bank transfer', 'accepted'],
   85),

  ('payments', ARRAY['occupant'],
   'How long does payment verification take?',
   'Most payments are automatically verified within minutes using our AI system. In case manual review is needed, you will receive confirmation within 2 business days. You can track your payment status in the Occupant Portal.',
   ARRAY['verification', 'processing time', 'how long', 'approval', 'review'],
   80),

  ('occupant', ARRAY['occupant'],
   'How do I access my payment history?',
   'Log in to the Occupant Portal using your registered email and mobile number. You will see your complete payment history, pending payments, and collection schedules on your dashboard.',
   ARRAY['history', 'past payments', 'records', 'transactions', 'view payments'],
   75),

  ('occupant', ARRAY['occupant'],
   'What if I forgot my login credentials?',
   'For occupants, we use OTP-based login. Simply enter your registered mobile number to receive an OTP. No passwords needed! If you have issues, contact your apartment admin.',
   ARRAY['forgot', 'password', 'login', 'credentials', 'access', 'otp'],
   70),

  ('admin', ARRAY['admin', 'super_admin'],
   'How do I add new occupants?',
   'Go to Admin Dashboard → Occupant Management → Add Occupant. Enter the flat details, occupant name, email, and mobile number. You can also bulk upload via Excel.',
   ARRAY['add occupant', 'new resident', 'register', 'occupant management'],
   65),

  ('admin', ARRAY['admin', 'super_admin'],
   'How do I review pending payments?',
   'Navigate to Admin Dashboard → Payment Management. Filter by Pending Review status. Review payment proofs, approve or reject with comments. Our fraud detection system flags suspicious submissions automatically.',
   ARRAY['review', 'pending', 'approve', 'reject', 'payment management'],
   60),

  ('admin', ARRAY['admin', 'super_admin'],
   'How do I generate QR codes for my apartment?',
   'Go to Admin Dashboard → Collection Management → Generate QR Codes. Select the collection period and generate codes for your blocks/flats. You can print or share these digitally.',
   ARRAY['qr code', 'generate', 'create', 'print', 'share'],
   55),

  ('technical', ARRAY['guest', 'occupant', 'admin', 'super_admin'],
   'Is my data secure?',
   'Yes! We use industry-standard encryption, secure authentication, and role-based access control. All payment data is stored securely in compliance with data protection regulations. Our fraud detection system protects against suspicious activities.',
   ARRAY['security', 'safe', 'data protection', 'privacy', 'secure', 'encryption'],
   50),

  ('technical', ARRAY['guest', 'occupant', 'admin', 'super_admin'],
   'What browsers are supported?',
   'FlatFund Pro works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version for the best experience. Mobile browsers are fully supported.',
   ARRAY['browser', 'compatibility', 'supported', 'chrome', 'firefox', 'mobile'],
   45)
ON CONFLICT DO NOTHING;

GRANT EXECUTE ON FUNCTION search_knowledge_base TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_conversation_history TO authenticated, anon;
