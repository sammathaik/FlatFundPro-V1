#!/bin/bash

echo "========================================="
echo "  FlatFund Pro - Documentation Cleanup"
echo "========================================="
echo ""

# Create docs structure
echo "Creating documentation directories..."
mkdir -p docs/implementation-guides
mkdir -p docs/testing-guides
mkdir -p docs/debug-reports
mkdir -p docs/sql-scripts
mkdir -p docs/system-guides
mkdir -p docs/archived
echo "✓ Directories created"
echo ""

# Count files before
BEFORE=$(find . -maxdepth 1 -name "*.md" -o -name "*.sql" | wc -l)
echo "Files in root before cleanup: $BEFORE"
echo ""

echo "Moving files..."
echo ""

# Move implementation guides
echo "  → Implementation guides..."
mv *_IMPLEMENTATION_*.md docs/implementation-guides/ 2>/dev/null
mv *_GUIDE.md docs/implementation-guides/ 2>/dev/null
mv *_ENHANCEMENT*.md docs/implementation-guides/ 2>/dev/null
mv ADMIN_GUIDE.md docs/implementation-guides/ 2>/dev/null

# Move testing guides
echo "  → Testing guides..."
mv TEST_*.md docs/testing-guides/ 2>/dev/null
mv *_TEST_*.md docs/testing-guides/ 2>/dev/null
mv *_TESTING_*.md docs/testing-guides/ 2>/dev/null
mv CHATBOT_QUICK_TEST.md docs/testing-guides/ 2>/dev/null
mv BUILDING_MANAGEMENT_TEST_GUIDE.md docs/testing-guides/ 2>/dev/null

# Move debug reports
echo "  → Debug reports and fixes..."
mv DEBUG_*.md docs/debug-reports/ 2>/dev/null
mv DIAGNOSE_*.md docs/debug-reports/ 2>/dev/null
mv CHECK_*.md docs/debug-reports/ 2>/dev/null
mv FIX_*.md docs/debug-reports/ 2>/dev/null
mv *_FIX_*.md docs/debug-reports/ 2>/dev/null
mv *_FIX.md docs/debug-reports/ 2>/dev/null

# Move SQL files
echo "  → SQL scripts..."
mv *.sql docs/sql-scripts/ 2>/dev/null

# Move system/setup guides
echo "  → System guides..."
mv SETUP_*.md docs/system-guides/ 2>/dev/null
mv START_*.md docs/system-guides/ 2>/dev/null
mv DEPLOYMENT*.md docs/system-guides/ 2>/dev/null
mv SECURITY_*.md docs/system-guides/ 2>/dev/null
mv CREATE_*.md docs/system-guides/ 2>/dev/null
mv BROWSER_ACCESS_GUIDE.md docs/system-guides/ 2>/dev/null
mv HOW_TO_*.md docs/system-guides/ 2>/dev/null
mv LOCALHOST_SETUP.md docs/system-guides/ 2>/dev/null

# Move archived/old docs
echo "  → Archived documentation..."
mv *_SUMMARY.md docs/archived/ 2>/dev/null
mv *_COMPLETE.md docs/archived/ 2>/dev/null
mv *_BEFORE_AFTER.md docs/archived/ 2>/dev/null
mv *_COMPARISON.md docs/archived/ 2>/dev/null
mv *_ANALYSIS.md docs/archived/ 2>/dev/null
mv QUICK_*.md docs/archived/ 2>/dev/null
mv *_ASSESSMENT.md docs/archived/ 2>/dev/null
mv ACTION_PLAN.md docs/archived/ 2>/dev/null
mv *_HEADER_*.md docs/archived/ 2>/dev/null
mv *_NAVIGATION_*.md docs/archived/ 2>/dev/null
mv CORRECTED_*.md docs/archived/ 2>/dev/null
mv VIEW_CHANGES.md docs/archived/ 2>/dev/null
mv ISSUES_FIXED_SUMMARY.md docs/archived/ 2>/dev/null
mv LOGO_*.md docs/archived/ 2>/dev/null
mv MARKETING_*.md docs/archived/ 2>/dev/null
mv THEME_*.md docs/archived/ 2>/dev/null
mv UX_*.md docs/archived/ 2>/dev/null
mv FIND_*.md docs/archived/ 2>/dev/null
mv VERIFY_*.md docs/archived/ 2>/dev/null
mv *_AUDIT_*.md docs/archived/ 2>/dev/null
mv *_NOTIFICATION*.md docs/archived/ 2>/dev/null
mv *_PROOF*.md docs/archived/ 2>/dev/null
mv *_REQUIRED.md docs/archived/ 2>/dev/null
mv *_FOUND.md docs/archived/ 2>/dev/null
mv *_RESOLVED.md docs/archived/ 2>/dev/null
mv *_APPLIED.md docs/archived/ 2>/dev/null
mv *_FIXED.md docs/archived/ 2>/dev/null

# Move remaining miscellaneous docs
echo "  → Miscellaneous documentation..."
mv PAYMENT_*.md docs/implementation-guides/ 2>/dev/null
mv EMAIL_*.md docs/implementation-guides/ 2>/dev/null
mv WHATSAPP_*.md docs/implementation-guides/ 2>/dev/null
mv NOTIFICATION_*.md docs/implementation-guides/ 2>/dev/null
mv OCCUPANT_*.md docs/implementation-guides/ 2>/dev/null
mv COLLECTION_*.md docs/implementation-guides/ 2>/dev/null
mv GUPSHUP_*.md docs/implementation-guides/ 2>/dev/null
mv QR_*.md docs/implementation-guides/ 2>/dev/null
mv AI_*.md docs/implementation-guides/ 2>/dev/null
mv CHATBOT_*.md docs/implementation-guides/ 2>/dev/null
mv FRAUD_*.md docs/implementation-guides/ 2>/dev/null
mv OCR_*.md docs/implementation-guides/ 2>/dev/null
mv CLASSIFICATION_*.md docs/implementation-guides/ 2>/dev/null
mv COMMITTEE_*.md docs/implementation-guides/ 2>/dev/null
mv COMMUNICATION_*.md docs/implementation-guides/ 2>/dev/null
mv BUDGET_*.md docs/implementation-guides/ 2>/dev/null
mv FLAT_*.md docs/implementation-guides/ 2>/dev/null
mv SUPER_ADMIN_*.md docs/implementation-guides/ 2>/dev/null
mv SUBSCRIBER_*.md docs/implementation-guides/ 2>/dev/null
mv AUTOMATIC_*.md docs/implementation-guides/ 2>/dev/null
mv TEXT_*.md docs/implementation-guides/ 2>/dev/null
mv ENHANCED_*.md docs/implementation-guides/ 2>/dev/null
mv EXTERNAL_*.md docs/implementation-guides/ 2>/dev/null
mv STATUS_*.md docs/implementation-guides/ 2>/dev/null
mv PHASE*.md docs/implementation-guides/ 2>/dev/null
mv LEAD_*.md docs/implementation-guides/ 2>/dev/null
mv APPROVAL_*.md docs/implementation-guides/ 2>/dev/null
mv DUPLICATE_*.md docs/implementation-guides/ 2>/dev/null
mv PENDING_*.md docs/implementation-guides/ 2>/dev/null
mv NEW_*.md docs/implementation-guides/ 2>/dev/null
mv SHARE_*.md docs/implementation-guides/ 2>/dev/null
mv DATABASE_*.md docs/system-guides/ 2>/dev/null
mv MOBILE_*.md docs/implementation-guides/ 2>/dev/null
mv PUBLIC_*.md docs/implementation-guides/ 2>/dev/null
mv PROFESSIONAL_*.md docs/archived/ 2>/dev/null

# Keep these in root
# - README.md (project overview - if exists)
# - CHANGELOG.md (if exists)
# - CONTRIBUTING.md (if exists)
# - LICENSE.md (if exists)

echo ""
AFTER=$(find . -maxdepth 1 -name "*.md" -o -name "*.sql" | wc -l)
echo "Files in root after cleanup: $AFTER"
echo ""

MOVED=$((BEFORE - AFTER))
echo "========================================="
echo "  ✓ Cleanup Complete!"
echo "========================================="
echo ""
echo "Files moved: $MOVED"
echo ""
echo "Documentation organized into:"
echo "  • docs/implementation-guides/ - Feature implementations and guides"
echo "  • docs/testing-guides/ - Testing procedures and scripts"
echo "  • docs/debug-reports/ - Debug logs and fix reports"
echo "  • docs/sql-scripts/ - Database queries and scripts"
echo "  • docs/system-guides/ - Setup and deployment guides"
echo "  • docs/archived/ - Historical documentation"
echo ""
echo "Root directory is now clean!"
echo ""
echo "Next steps:"
echo "  1. Verify files are in correct locations"
echo "  2. Commit changes: git add docs/ && git commit -m 'docs: organize documentation'"
echo "  3. Test Bolt performance (should be much faster!)"
echo ""
