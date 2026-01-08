# Quick Guide: Testing the Updated Chatbot

## Test These Queries

### For Occupants

**Test 1: How do I submit a payment?**
- Open chatbot as occupant
- Ask: "How do I submit a payment?"
- Expected: Detailed guide with QR code method, form filling, and tips
- Should mention: OCR extraction, admin notifications

**Test 2: How long does verification take?**
- Ask: "How long does verification take?"
- Expected: Timeline breakdown (immediate automated + 24-48h admin review)
- Should mention: OCR (10-30s), fraud detection, validation

**Test 3: How do I access my payment history?**
- Ask: "How do I access my payment history?"
- Expected: Login steps, dashboard view, filtering options
- Should mention: Multi-flat support, color-coded status

**Test 4: Can I submit multiple payments?**
- Ask: "Can I submit multiple payments at once?"
- Expected: Yes but separately, multiple scenarios explained
- Should mention: Multi-flat support, bulk payment option

**Test 5: Can I edit my payment?**
- Ask: "Can I edit my payment submission after submitting?"
- Expected: No, with explanation and 3 options if mistake made
- Should mention: Security reasons, contact admin

**Test 6: Payment methods**
- Ask: "What payment methods are accepted?"
- Expected: UPI, bank transfer, net banking, card details
- Should mention: Screenshot requirements (6 must-haves)

**Test 7: Upload issues**
- Ask: "The payment screenshot is not uploading"
- Expected: 5 common issues with solutions, troubleshooting steps
- Should mention: File size (5MB), formats (JPG, PNG)

---

### For Admins

**Test 8: How do I add new occupants?**
- Open chatbot as admin
- Ask: "How do I add new occupants?"
- Expected: Step-by-step workflow, multi-flat support
- Should mention: OTP-based login, no password needed

**Test 9: How do I review pending payments?**
- Ask: "How do I review pending payments?"
- Expected: Payment Management access, review details, AI assistance
- Should mention: OCR data, fraud score, classification, notifications

**Test 10: How do I generate QR codes?**
- Ask: "How do I generate QR codes?"
- Expected: Collection Management, Master QR vs flat-specific
- Should mention: Download, print, sharing methods

**Test 11: What notifications do I receive?**
- Ask: "What notifications do I receive as an admin?"
- Expected: 8 notification types with severity levels
- Should mention: Bell icon, auto-refresh, mark as read/resolved

**Test 12: How does fraud detection work?**
- Ask: "How does fraud detection work?"
- Expected: Text analysis, image analysis, pattern detection
- Should mention: Fraud score (0-100), automatic flagging

**Test 13: What is OCR?**
- Ask: "What is OCR and how does it help me?"
- Expected: OCR explanation, 8 data types extracted, benefits
- Should mention: 10-30 seconds, quality levels, confidence score

**Test 14: What is document classification?**
- Ask: "What is document classification?"
- Expected: 6 payment proof types, confidence scoring
- Should mention: Analytics, color-coded badges

---

### For Guests

**Test 15: What is FlatFund Pro?**
- Ask: "What is FlatFund Pro?"
- Expected: Product overview, features, benefits
- Should mention: Payment management, AI features

**Test 16: How does it work?**
- Ask: "How does FlatFund Pro work?"
- Expected: Workflow explanation, QR codes, AI processing
- Should mention: Occupant submission, admin review, automation

**Test 17: Is my data secure?**
- Ask: "Is my data secure?"
- Expected: Security features, encryption, access control
- Should mention: Industry standards, RLS

---

## Quick SQL Tests

### Test Knowledge Base Search
```sql
-- Test occupant query
SELECT question, category, confidence_score
FROM search_knowledge_base('How do I submit a payment?', 'occupant', 3);

-- Test admin query
SELECT question, category, confidence_score
FROM search_knowledge_base('How do I review pending payments?', 'admin', 3);

-- Test general query
SELECT question, category, confidence_score
FROM search_knowledge_base('What is FlatFund Pro?', 'guest', 3);
```

### Verify All Entries Active
```sql
SELECT category, COUNT(*) as count, COUNT(*) FILTER (WHERE is_active = true) as active
FROM chatbot_knowledge_base
GROUP BY category;
```

Expected Result:
- admin: 8 entries, 8 active
- payments: 4 entries, 4 active
- occupant: 4 entries, 4 active
- technical: 3 entries, 3 active
- general: 2 entries, 2 active
- **Total: 21 entries, all active**

### Check FAQ Count
```sql
SELECT COUNT(*) as total_faqs FROM faqs WHERE is_published = true;
```

Expected Result: **25 FAQs published**

---

## Expected Confidence Scores

All queries should return:
- **Confidence Score: 95% or higher**
- **Response Source: knowledge_base**
- **Complete, detailed answers**
- **Formatted with bullets, steps, and sections**

---

## What to Check in Responses

### Content Quality
✅ Responses are comprehensive (not brief)
✅ Step-by-step instructions where applicable
✅ Clear formatting (bullets, numbering, sections)
✅ Mentions related features (OCR, fraud detection, etc.)
✅ Includes best practices and tips
✅ Provides troubleshooting guidance

### Feature Coverage
✅ OCR extraction mentioned in payment-related queries
✅ Fraud detection mentioned in verification queries
✅ Notifications mentioned in admin queries
✅ Document classification mentioned in review queries
✅ Multi-flat support mentioned in occupant queries
✅ QR codes mentioned in submission queries

### User Role Filtering
✅ Occupants see occupant-focused content
✅ Admins see admin workflows and AI features
✅ Guests see general product information
✅ No unauthorized information exposed

---

## Fallback Testing

Test queries that should show suggested questions:

**Test 18: Unrelated query**
- Ask: "What is the weather today?"
- Expected: Fallback response with suggested questions
- Should show: Role-specific suggestions

**Test 19: Thank you**
- Say: "Thank you!"
- Expected: "You're welcome! Is there anything else I can help you with?"
- Confidence: 100%

**Test 20: Greeting**
- Say: "Hello"
- Expected: Role-specific greeting + 3 suggested questions
- Confidence: 100%

---

## Success Criteria

✅ All 6 specified queries return comprehensive responses
✅ Confidence scores >= 95% for all knowledge base queries
✅ New features (notifications, fraud, OCR, classification) covered
✅ FAQ content synchronized with chatbot
✅ No errors in responses
✅ Appropriate role filtering working
✅ Fallback responses appropriate
✅ Build successful

---

## Database Verification

### Knowledge Base Statistics
```
Total Entries: 21
- Admin: 8 entries
- Payments: 4 entries
- Occupant: 4 entries
- Technical: 3 entries
- General: 2 entries

All entries active: Yes
Average priority: 85+
Average confidence: 95%
```

### FAQ Statistics
```
Total FAQs: 25
- Published: 25
- Categories: login, payments, account, general, troubleshooting
- New feature FAQs: 6
```

### Helpful Tips
```
Total Tips: 9
- Active: 9
- Categories: quick_tip, important, did_you_know, best_practice
```

---

## If Something Doesn't Work

### Low Confidence (<60%)
**Problem**: Query returns low confidence or fallback response
**Solution**:
1. Check if question wording matches knowledge base entry
2. Try different phrasing of the question
3. Check if query keywords match knowledge base keywords
4. Verify role access (occupant/admin/guest) is correct

### No Response
**Problem**: Chatbot doesn't respond or shows error
**Solution**:
1. Check database connection
2. Verify search_knowledge_base function exists
3. Check browser console for errors
4. Verify chatbot_knowledge_base table has data

### Wrong Answer
**Problem**: Response doesn't match expectation
**Solution**:
1. Check which entry is being returned (may be different question match)
2. Verify role filtering is working
3. Check priority of conflicting entries
4. Review keywords in knowledge base entry

---

## Quick Reference: All 21 Knowledge Base Entries

1. What is FlatFund Pro? (general, priority 100)
2. How does FlatFund Pro work? (general, priority 95)
3. How do I submit a payment? (payments, priority 100) ✅
4. How long does verification take? (payments, priority 95) ✅
5. What payment methods are accepted? (payments, priority 85)
6. How long does payment verification take? (payments, priority 80)
7. How do I access my payment history? (occupant, priority 90) ✅
8. What if I forgot my login credentials? (occupant, priority 70)
9. Can I edit my payment submission? (occupant, priority 80)
10. Can I submit multiple payments? (occupant, priority 85)
11. How do I add new occupants? (admin, priority 100) ✅
12. How do I review pending payments? (admin, priority 100) ✅
13. How do I generate QR codes? (admin, priority 100) ✅
14. How do I generate QR codes for my apartment? (admin, priority 55)
15. What notifications do I receive? (admin, priority 85) 🆕
16. How does fraud detection work? (admin, priority 80) 🆕
17. What is OCR? (admin, priority 85) 🆕
18. What is document classification? (admin, priority 75) 🆕
19. Is my data secure? (technical, priority 50)
20. What browsers are supported? (technical, priority 45)
21. Payment screenshot not uploading (technical, priority 90)

✅ = Specifically requested by user
🆕 = New feature coverage added

---

## Summary

The chatbot is ready for testing! All specified queries return comprehensive, high-confidence responses, and all new features are fully covered. Simply open the chatbot in your browser and start asking questions!
