/*
  # Update Help Content with Committee Review Features

  Adds comprehensive FAQ entries and helpful tips about the new Committee Payment Review and Approval System.

  ## Changes
  
  1. **Add FAQs** about committee review process, actions, audit trail, and notifications
  2. **Add Helpful Tips** for using committee review effectively with best practices
*/

-- Delete any existing committee-related help content to avoid duplicates
DELETE FROM faqs WHERE question ILIKE '%committee%' OR question ILIKE '%review panel%' OR question ILIKE '%four actions%';
DELETE FROM helpful_tips WHERE title ILIKE '%committee%' OR content ILIKE '%committee review%';

-- Add comprehensive FAQs about Committee Review System
INSERT INTO faqs (category, question, answer, order_position, is_published, view_count, helpful_count) VALUES
('payments', 'What is the Committee Review feature?', 
'The Committee Review feature allows committee members to review, verify, edit, and approve payment submissions. It provides four action options: approve as submitted, edit and approve, submit on behalf of residents, or mark as unverifiable. All actions are logged in a complete audit trail for transparency.',
10, true, 0, 0),

('payments', 'What are the four committee actions available?',
'1. Approve as submitted - Accept payment exactly as resident submitted
2. Edit and approve - Correct details based on bank statement or verification
3. Submit on behalf - Enter payment confirmed through bank reconciliation
4. Mark as unverifiable - Unable to verify payment, requires resident follow-up',
11, true, 0, 0),

('payments', 'When should I use Edit and approve?',
'Use Edit and approve when OCR extracted wrong amount or date, screenshot was unclear but payment is verified, resident provided correct details verbally, or bank statement shows different details. Always provide a clear reason for the edit in the mandatory reason field.',
12, true, 0, 0),

('payments', 'When should I use Submit on behalf?',
'Use Submit on behalf when payment is confirmed via bank reconciliation, resident cannot submit online, adding bulk payments from bank statement, or payment proof not available but bank transfer confirmed. Payment proof is optional for committee-entered submissions.',
13, true, 0, 0),

('payments', 'What is the payment audit trail?',
'The audit trail is a complete, immutable history of all actions taken on a payment. It records who made changes, when they were made, what was changed (before and after values), and the reason provided. This ensures full transparency and accountability for all committee actions.',
14, true, 0, 0),

('payments', 'Are residents notified when payment is approved?',
'Yes. When a committee member approves a payment, the system automatically sends an email confirmation to the resident and a WhatsApp message (only if resident has opted-in). Both notifications are non-blocking and will not prevent approval if they fail.',
15, true, 0, 0),

('payments', 'Why is a reason required for committee actions?',
'Reasons are mandatory for governance and transparency. They document why actions were taken, build trust with residents, provide context for future reference, ensure accountability, and assist in audits. Good examples: Confirmed via bank statement dated Jan 15 2024 or OCR error corrected amount verified with resident',
16, true, 0, 0),

('payments', 'Can I approve a payment flagged for fraud?',
'Yes. Committee members can approve fraud-flagged payments if verified through other means such as bank statements or resident confirmation. The fraud alert is shown in the review panel, and you must provide a reason explaining why you are overriding the flag. This override is logged in the audit trail.',
17, true, 0, 0),

('payments', 'What happens to original submission when I edit?',
'When you edit and approve a payment, the original values are preserved in a special original values field. The audit trail also stores before and after snapshots. Nothing is ever lost - you can always see what was originally submitted and what changes were made.',
18, true, 0, 0),

('payments', 'How do I access the Committee Review panel?',
'From the Payment Management page, find the payment you want to review, click the three-dot menu, and select Committee Review. This opens the comprehensive review panel with three sections: Original Submission, Committee Action Panel, and Editable Details (if applicable).',
19, true, 0, 0);

-- Add helpful tips for using Committee Review effectively
INSERT INTO helpful_tips (tip_type, title, content, icon, color, order_position, is_active) VALUES
('important', 'Check Fraud Scores Before Approval', 
'Always review the fraud score and OCR confidence before approving payments. These automated checks help identify potential issues that may require additional verification.',
'shield', 'blue', 30, true),

('best_practice', 'Be Specific in Approval Reasons', 
'Instead of generic reasons like approved, write specific details such as Confirmed via bank statement dated Jan 15 2024 or OCR extracted wrong amount verified with resident. This creates a better audit trail.',
'file-text', 'green', 31, true),

('did_you_know', 'Committee Submissions Skip Proof', 
'When entering payments from bank reconciliation using Submit on behalf, you can skip uploading payment proof. The system trusts committee-entered submissions and marks them with a special badge.',
'user-check', 'purple', 32, true),

('quick_tip', 'Review Payment Audit History', 
'Click Committee Review and expand the Audit History section to see all previous actions on a payment. This helps maintain consistency and understand the complete payment journey.',
'clock', 'blue', 33, true),

('best_practice', 'Use Mark as Unverifiable Thoughtfully', 
'Use Mark as unverifiable instead of rejecting payments. This keeps the payment in Received status for resident follow-up without using negative language, maintaining a positive relationship.',
'alert-circle', 'yellow', 34, true),

('did_you_know', 'Automatic Email Notifications', 
'Residents receive professional email confirmations after approval. The email includes all approved details and notes that payment was Committee Verified. WhatsApp notifications are sent only if residents have opted-in.',
'mail', 'green', 35, true),

('quick_tip', 'Bulk Bank Reconciliation', 
'For multiple verified payments from bank statements, use Submit on behalf for each entry. The system will mark them with a Submitted by Committee badge for easy identification and tracking.',
'layers', 'purple', 36, true),

('did_you_know', 'Original Values Always Preserved', 
'Section 1 of the review panel always shows exactly what was originally submitted. This reference helps you make informed decisions and compare submitted data with bank records.',
'eye', 'blue', 37, true),

('important', 'Reason Field is Mandatory', 
'For Edit and approve, Submit on behalf, and Mark as unverifiable actions, you must provide a reason. This is required for governance and transparency and cannot be skipped.',
'alert-triangle', 'red', 38, true),

('quick_tip', 'Confirmation Dialog Prevents Errors', 
'Before any committee action is saved, you will see a confirmation dialog showing your selected action and reason. This prevents accidental submissions and gives you a final chance to review your decision.',
'check-circle', 'green', 39, true);
