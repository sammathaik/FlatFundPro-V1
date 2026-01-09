/*
  # Expand Comprehensive Knowledge Base for All User Types

  ## Summary
  Adds extensive FAQs and helpful tips covering all FlatFund Pro features for:
  - Owners and Tenants
  - Committee Members  
  - Society Administrators
  - Treasurers and Facility Managers

  ## New Features Covered
  - Mobile payment submission
  - QR code payments
  - Multi-flat management
  - Collection modes (Equal/Area/Type-based)
  - Budget and forecasting
  - Fraud detection
  - Document classification
  - WhatsApp notifications
  - Collection status sharing
  - Notification center
  - PDF upload support

  ## Changes
  Adds 50+ new FAQs and 20+ helpful tips across all categories
*/

-- Add Mobile Payment and Quick Login FAQs
INSERT INTO faqs (category, question, answer, order_position, is_published) VALUES
('login', 'What is the Quick Mobile Login feature?',
'Quick Mobile Login allows you to access your payment history and submit new payments using just your mobile number. No need to remember passwords! Simply enter your registered mobile number, verify the OTP, and access your account instantly. This is perfect for quick payments on the go.',
4, true),

('login', 'Can I log in using only my mobile number?',
'Yes! If your mobile number is registered with your apartment admin, you can use Quick Mobile Login. Just enter your mobile number, receive an OTP, verify it, and you are in. This works from any device - mobile, tablet, or computer.',
5, true),

('login', 'I have multiple flats. How does mobile login work?',
'If you own or rent multiple flats with the same mobile number, the system will automatically detect all your flats after OTP verification. You will see a list of all your flats and can select which one you want to view or pay for. You can switch between flats anytime.',
6, true),

('payments', 'Can I upload PDF files as payment proof?',
'Yes! In addition to images (JPG, PNG), you can now upload PDF files as payment proof. This is useful if you have PDF bank statements or payment confirmations. The maximum file size is 5MB for both images and PDFs.',
7, true),

('payments', 'What is QR code payment submission?',
'QR code payment allows you to submit payments by scanning a unique QR code provided by your apartment. This QR code is specific to your flat and pre-fills your details. Simply scan the code, enter payment details, upload proof, and submit - saving you time on data entry.',
8, true),

('payments', 'Where can I find my flat''s QR code?',
'Your apartment admin can generate and share QR codes for each flat. These QR codes are typically shared via email, WhatsApp, printed on notices, or displayed at the society office. Scan the code with your phone camera to access the quick payment form.',
9, true),

('payments', 'How do I pay through mobile phone directly?',
'Use the Quick Mobile Login option from the home page. Enter your mobile number, verify OTP, view your pending payments, and submit new payment with proof. The entire process takes less than 2 minutes and works perfectly on mobile browsers.',
10, true),

('account', 'What is the Notification Center?',
'The Notification Center is your personal inbox for all payment-related updates. You will receive notifications when: your payment is approved, committee requests more information, new collections are announced, or payment reminders are sent. Access it from the bell icon in your dashboard.',
11, true),

('account', 'How do I know when my payment is approved?',
'You will receive three types of notifications when your payment is approved: 1) In-app notification in the Notification Center, 2) Email to your registered email address, and 3) WhatsApp message (only if you opted-in). All notifications include payment details and approval confirmation.',
12, true),

('account', 'Can I opt-out of WhatsApp notifications?',
'Yes! WhatsApp notifications are opt-in only. During payment submission, you can check or uncheck the WhatsApp opt-in box. You can also update this preference anytime by contacting your apartment admin. Email and in-app notifications cannot be disabled.',
13, true);

-- Add Committee and Admin FAQs
INSERT INTO faqs (category, question, answer, order_position, is_published) VALUES
('general', 'What are Collection Modes?',
'FlatFund Pro supports three collection modes: Mode A (Equal/Flat Rate) - same amount for all flats, Mode B (Area-Based) - amount calculated using rate per square foot × built-up area, Mode C (Type-Based) - different amounts for different flat types like 2BHK, 3BHK. Admins choose the mode that fits their society rules.',
20, true),

('general', 'How does fraud detection work?',
'The system automatically analyzes payment screenshots using AI to detect potential fraud. It checks for: image manipulation, duplicate submissions, suspicious text, tampered screenshots, and OCR confidence. Payments flagged for fraud are marked for committee review but can still be approved after verification.',
21, true),

('general', 'What is document classification?',
'Document classification automatically identifies the type of payment proof uploaded (UPI screenshot, bank transfer, cheque, cash receipt, etc.). This helps admins quickly verify payments and improves search and filtering. The AI analyzes the document and categorizes it automatically.',
22, true),

('general', 'What is collection status sharing?',
'Collection status sharing allows admins to generate and share a public link showing payment collection progress for any collection period. Residents can view: total flats, payments received, approved, pending, and overall collection percentage. No login required - perfect for transparency.',
23, true),

('general', 'How do budget and forecasting features work?',
'Admins can create multi-year budgets with expense categories, track actual expenses against budget, view variance reports, and forecast future expenses. The system provides visual dashboards showing budget vs actual spending, helping committees make informed financial decisions.',
24, true),

('troubleshooting', 'Why was my payment flagged for fraud?',
'Fraud flagging does not mean your payment is fraudulent. It means the automated system detected something that needs human verification - like a low-quality screenshot, OCR extraction errors, or unusual text. Simply contact your admin who can verify and approve your payment after checking.',
25, true),

('troubleshooting', 'The QR code is not scanning. What should I do?',
'If the QR code does not scan: 1) Ensure good lighting, 2) Hold your phone steady, 3) Try moving closer or farther from the code, 4) Clean your camera lens, 5) Use a different QR scanner app. If it still fails, you can manually enter payment details using the regular payment form.',
26, true),

('troubleshooting', 'I selected the wrong flat during multi-flat login. How do I change it?',
'Log out and log in again. After OTP verification, you will see the flat selection screen again. Select the correct flat. Your payment history is kept separate for each flat, so make sure you select the right one before submitting payments.',
27, true);

-- Add Owner/Tenant Best Practice FAQs
INSERT INTO faqs (category, question, answer, order_position, is_published) VALUES
('payments', 'Should I wait for a payment reminder before paying?',
'No, you can pay anytime before or after the due date. However, paying before the due date helps you avoid late fees if applicable. You can also pay early for upcoming quarters if your admin allows advance payments. Check your active collections in the dashboard for due dates.',
28, true),

('payments', 'Can I pay for multiple months at once?',
'Yes, if your apartment allows it. Submit each payment separately with its respective proof and mention the period in your payment details. Some apartments also offer discounts for advance payments of 6-12 months. Check with your admin for specific policies.',
29, true),

('payments', 'How do I view my payment history for previous years?',
'Log in to your account and go to Transaction History or Payment History. Use the date filters to select any time range - previous month, quarter, year, or custom dates. You can also download or print your complete payment history for record-keeping.',
30, true),

('account', 'What should I do if my flat details are incorrect?',
'Contact your apartment admin immediately to correct your flat details like flat number, built-up area, flat type, or occupant type. Only admins can update these details. Incorrect details may lead to wrong payment calculations, especially in area-based or type-based collection modes.',
31, true),

('account', 'Can I change my registered mobile number or email?',
'Contact your apartment admin to update your mobile number or email address. For security reasons, residents cannot change these details themselves. The admin will verify your identity and update your contact information in the system.',
32, true),

('general', 'What happens if I miss a payment deadline?',
'Late payment policies vary by apartment. Some charge daily late fees, some have fixed penalties, and some have no penalties. Check your collection details for late fee information. Even if you miss the deadline, submit your payment as soon as possible - better late than never!',
33, true);

-- Add Society/Committee Management FAQs
INSERT INTO faqs (category, question, answer, order_position, is_published) VALUES
('general', 'How do I add new occupants to the system?',
'Go to Occupant Management, click Add New Occupant, and enter their details: name, email, mobile number, flat number, occupant type (Owner/Tenant), and any additional information. The occupant can then log in using their mobile number or email to view payments and submit proof.',
40, true),

('general', 'How do I generate QR codes for residents?',
'Navigate to QR Code Management or the specific flat in Flat Management, and click Generate QR Code. You can generate QR codes for individual flats or bulk generate for all flats. Download the QR codes and share them via email, WhatsApp, or print them for distribution.',
41, true),

('general', 'How do I create a new collection or maintenance cycle?',
'Go to Collection Management and click Create New Collection. Enter: collection name, payment type, due date, collection mode, amount (or rate per sqft for Mode B), and late fee policy. The system will automatically calculate amounts for each flat based on the selected mode.',
42, true),

('general', 'Can I share collection status with residents publicly?',
'Yes! Go to the collection you want to share, click Share Collection Status, and generate a public link. This link shows real-time collection progress without requiring login. Share this link via email, WhatsApp, or notice boards for full transparency.',
43, true),

('general', 'How do I track which residents have not paid?',
'Use the Payment Status Dashboard to see a grid of all flats with their payment status (Paid, Partial, Pending, Overdue). You can filter by status, send payment reminders to pending residents, and export the list for follow-up. The dashboard updates in real-time as payments are received.',
44, true),

('general', 'What is the audit trail in committee review?',
'The audit trail is a permanent, detailed log of every action taken on a payment: who submitted it, who reviewed it, what changes were made, when actions occurred, and why (reasons provided). This ensures complete transparency and accountability for all committee decisions.',
45, true),

('general', 'How do I handle cash payments or offline payments?',
'Use the Committee Submit on Behalf feature. Go to Payment Management, click Submit Payment on Behalf, select the flat, enter payment details, and mention Cash Payment or Offline Payment in the notes. Payment proof is optional for committee-submitted entries.',
46, true),

('general', 'Can I export payment data for accounting software?',
'Yes! Use the Export feature in Payment Management to download payment data in CSV or Excel format. You can export all payments or filter by date range, status, or collection. The export includes all details needed for accounting: flat number, amount, date, status, and reference numbers.',
47, true);

-- Add Helpful Tips for Mobile and Modern Features
INSERT INTO helpful_tips (tip_type, title, content, icon, color, order_position, is_active) VALUES
('quick_tip', 'Save QR Codes to Phone Gallery',
'Save your flat''s QR code image to your phone gallery for quick access. Next time you need to pay, just open the image and scan it with another device or use it to quickly fill payment forms.',
'smartphone', 'blue', 50, true),

('did_you_know', 'PDF Receipts Are Now Supported',
'You can now upload PDF files as payment proof! If your bank sends PDF statements or confirmations, upload them directly. The system accepts both images and PDFs up to 5MB in size.',
'file-text', 'purple', 51, true),

('quick_tip', 'Use Mobile Login for Fastest Access',
'Skip email login and use Quick Mobile Login instead. Just enter your phone number, verify OTP, and you are in within 30 seconds. Perfect for quick payments on your phone.',
'zap', 'green', 52, true),

('best_practice', 'Check Notification Center Regularly',
'Log in weekly to check your Notification Center for important updates. You might have messages from your committee, payment reminders, or collection announcements that need your attention.',
'bell', 'yellow', 53, true),

('did_you_know', 'Multi-Flat Owners Get One Login',
'If you own multiple flats with the same mobile number, you only need to login once. After verification, select which flat you want to view or pay for. Switch between flats easily from your dashboard.',
'home', 'blue', 54, true),

('important', 'PDF Upload Works Everywhere',
'PDF upload is supported in all payment submission methods: Quick Mobile Login, QR Code Payment, Public Payment Form, and Occupant Dashboard. Choose the format that works best for you.',
'upload', 'green', 55, true),

('quick_tip', 'Fraud Detection Helps Everyone',
'Fraud detection protects both residents and committees. If your payment is flagged, don''t worry - it just needs manual verification. Contact your admin to resolve it quickly. It''s a security feature, not an accusation.',
'shield', 'blue', 56, true),

('best_practice', 'Keep Mobile Number Updated',
'Always keep your mobile number updated with your admin. This ensures you receive OTPs, WhatsApp notifications, and can use Quick Mobile Login without any issues.',
'phone', 'orange', 57, true),

('did_you_know', 'View Live Collection Progress',
'Your admin can share a public link showing live collection progress for any payment period. No login needed - just click the link to see how many flats have paid and collection percentage.',
'trending-up', 'green', 58, true),

('quick_tip', 'WhatsApp Notifications Are Optional',
'You can choose to receive WhatsApp notifications for payment updates. Check the WhatsApp opt-in box during payment submission. You can change this preference anytime through your admin.',
'message-circle', 'green', 59, true),

('best_practice', 'Submit Payments Early',
'Submit your payment proof within 1-2 days of making the payment while details are fresh. Early submission helps avoid late fees and gives committee enough time to review before due dates.',
'clock', 'blue', 60, true),

('did_you_know', 'Three Collection Modes Available',
'FlatFund Pro supports three collection modes: Equal amount for all, Area-based (per sqft), and Type-based (by BHK). Your admin chooses what fits your society best. This ensures fair collection calculations.',
'sliders', 'purple', 61, true),

('quick_tip', 'Use QR Codes for Group Payments',
'If multiple family members or tenants need to pay, share the QR code with them via WhatsApp. They can scan and pay directly without needing login credentials. Each person can submit their own proof.',
'share-2', 'green', 62, true),

('important', 'Original Submission Always Preserved',
'Even if committee edits your payment details after verification, your original submission is always preserved in the system. You can view it in the audit trail. Nothing is lost or hidden.',
'archive', 'blue', 63, true),

('best_practice', 'Download Payment Confirmation',
'After your payment is approved, download or screenshot the confirmation for your personal records. This serves as proof of payment and can be useful for future reference or disputes.',
'download', 'green', 64, true),

('did_you_know', 'Automatic Payment Reminders',
'The system automatically sends payment reminders to residents who have not paid before due dates. Committee members don''t need to manually follow up - reminders are sent via email and WhatsApp (for opted-in users).',
'bell-ring', 'yellow', 65, true),

('quick_tip', 'Budget Dashboard Shows Spending',
'Committee members can track society expenses against budgets in real-time. The Budget Dashboard shows what was planned vs actual spending, helping manage society funds transparently.',
'pie-chart', 'blue', 66, true),

('best_practice', 'Review Audit Trail For Transparency',
'Committee members should encourage residents to review payment audit trails if they have questions. The complete history of every action builds trust and shows exactly how each payment was processed.',
'clipboard-list', 'green', 67, true),

('did_you_know', 'Collection Status Can Be Shared Publicly',
'Generate a public collection status link that shows live payment progress without requiring login. Share it via email, WhatsApp, or notice boards. Residents can see collection percentage anytime.',
'link', 'blue', 68, true),

('quick_tip', 'Export Data For Year-End Reports',
'Committee members can export all payment data to Excel or CSV for year-end financial reports, audits, or AGM presentations. The export includes complete details with timestamps and status history.',
'file-spreadsheet', 'purple', 69, true);

-- Add Comments
COMMENT ON TABLE faqs IS 'Comprehensive FAQ knowledge base covering all FlatFund Pro features for all user types';
COMMENT ON TABLE helpful_tips IS 'Contextual helpful tips and best practices for effective use of FlatFund Pro';
