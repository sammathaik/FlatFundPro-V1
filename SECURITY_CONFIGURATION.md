# Security Configuration Guide

## Overview

This document outlines security configurations and recommendations for FlatFund Pro.

---

## ✅ Completed Security Fixes (November 8, 2025)

### 1. Added Missing Foreign Key Indexes

**Issue:** Three foreign keys in `payment_submissions` table lacked covering indexes, leading to suboptimal query performance.

**Resolution:** Added the following indexes:
- `idx_payment_submissions_block_id` - For joins with buildings_blocks_phases
- `idx_payment_submissions_flat_id` - For joins with flat_numbers
- `idx_payment_submissions_reviewed_by` - For joins with admins

**Impact:**
- ✅ Significantly faster JOIN operations
- ✅ Improved query performance for payment listings
- ✅ Better performance when filtering by block or flat
- ✅ Optimized admin review queries

### 2. Removed Unused Indexes

**Issue:** Five unused indexes were consuming storage and slowing down write operations.

**Resolution:** Removed the following unused indexes:
- `idx_apartments_city` - City rarely queried alone
- `idx_apartments_country` - Country rarely queried alone
- `idx_payment_submissions_quarter` - Quarter filtering doesn't benefit from index
- `idx_payment_submissions_transaction_ref` - Transaction ref rarely searched
- `idx_payment_submissions_comments` - Full-text search index not used

**Impact:**
- ✅ Reduced storage overhead
- ✅ Faster INSERT/UPDATE/DELETE operations on payments
- ✅ Improved database maintenance performance
- ✅ No negative impact on query performance

### 3. Fixed Function Search Path Security Issues

**Issue:** Functions `calculate_payment_quarter()` and `set_payment_quarter()` had mutable search_path, creating SQL injection risk.

**Resolution:** Recreated both functions with:
- `SECURITY DEFINER` attribute
- Explicit `SET search_path = public`
- Proper security context

**Impact:**
- ✅ Prevented potential SQL injection via search path manipulation
- ✅ Functions now execute in secure, predictable environment
- ✅ Compliance with PostgreSQL security best practices

**Technical Details:**
```sql
CREATE OR REPLACE FUNCTION calculate_payment_quarter(...)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
-- Function body
$$;
```

---

## ⚠️ Recommended: Leaked Password Protection

### What Is It?

Supabase Auth can prevent users from using compromised passwords by checking them against the **Have I Been Pwned** database, which contains billions of passwords that have been exposed in data breaches.

### Current Status

**Status:** ⚠️ DISABLED (Supabase Default)

This feature is currently disabled in your Supabase project. While not critical for a development environment, it's strongly recommended for production.

### Why Enable It?

**Security Benefits:**
1. **Prevents Compromised Passwords** - Blocks passwords that have appeared in known data breaches
2. **Reduces Account Takeover Risk** - Attackers often try leaked passwords first
3. **User Protection** - Prevents users from unknowingly using unsafe passwords
4. **Compliance** - Helps meet security best practices and compliance requirements
5. **Zero Performance Impact** - Check happens only during registration/password change

**Real-World Impact:**
- Passwords like "Password123!" may seem strong but could be in the leaked database
- Users often reuse passwords across sites - if one site is breached, all accounts are at risk
- This is an extra layer of defense that costs nothing to implement

### How to Enable

#### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your FlatFund Pro project

2. **Navigate to Authentication Settings**
   - Click **"Authentication"** in the left sidebar
   - Click **"Policies"** tab (or **"Settings"**)

3. **Enable Leaked Password Protection**
   - Find the setting: **"Enable leaked password protection"**
   - Toggle it **ON**
   - Click **"Save"**

4. **Test the Feature**
   - Try creating a test user with a known weak password like `password123`
   - You should see an error message preventing the signup

#### Option 2: Via Supabase CLI (If Available)

```bash
supabase auth update --enable-leaked-password-protection
```

---

## 🔒 Additional Security Recommendations

### 1. Password Requirements

**Current Implementation:**
- Minimum 8 characters (Supabase default)
- No complexity requirements

**Recommended for Production:**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- Check against common password lists

**How to Implement:**
You can add password validation in your signup forms before sending to Supabase.

### 2. Rate Limiting

**What It Is:**
Limit how many login attempts or signups can occur from a single IP address.

**Why Enable:**
- Prevents brute force attacks
- Prevents automated signup abuse
- Reduces spam and bot activity

**How to Enable:**
Supabase has built-in rate limiting. Check your project's Authentication settings.

### 3. Email Verification

**Current Status:** ✅ Disabled for test users (using Auto Confirm)

**Recommended for Production:**
- Enable email verification for all new signups
- Prevents fake email addresses
- Ensures users have access to their email

**How to Enable:**
1. Supabase Dashboard → Authentication → Settings
2. Toggle OFF: "Enable email confirmations"
3. Configure email templates

### 4. Session Management

**Current Configuration:**
- JWT expiry: 1 hour (Supabase default)
- Refresh token expiry: 30 days

**Recommended:**
- Keep defaults for most applications
- For high-security apps, reduce session duration
- Implement "Remember Me" option if needed

### 5. Multi-Factor Authentication (MFA)

**Current Status:** ⚠️ Not implemented

**Recommended for Production:**
- Enable MFA for Super Admins
- Optional MFA for Apartment Admins
- Significantly reduces account takeover risk

**Supabase Support:**
Supabase supports TOTP-based MFA. See: https://supabase.com/docs/guides/auth/auth-mfa

---

## 🎯 Security Checklist

### Development Environment

- [x] Row Level Security (RLS) enabled on all tables
- [x] Proper RLS policies for data isolation
- [x] Storage bucket policies configured
- [x] Unused indexes removed
- [ ] Leaked password protection enabled (recommended)

### Before Production Deployment

**Critical (Must Do):**
- [ ] Enable leaked password protection
- [ ] Enable email verification
- [ ] Change all test user passwords
- [ ] Remove test users or mark inactive
- [ ] Review and test all RLS policies
- [ ] Set up proper backup procedures
- [ ] Configure custom email templates
- [ ] Set up error monitoring

**Recommended (Should Do):**
- [ ] Enable rate limiting
- [ ] Implement MFA for admins
- [ ] Set up audit logging alerts
- [ ] Configure password complexity rules
- [ ] Set up security monitoring
- [ ] Document security procedures
- [ ] Conduct security review/penetration test

**Optional (Nice to Have):**
- [ ] IP whitelisting for admin access
- [ ] Geolocation-based access controls
- [ ] Advanced threat detection
- [ ] Security headers (CSP, HSTS, etc.)

---

## 📚 Resources

### Supabase Security Documentation
- Auth Security: https://supabase.com/docs/guides/auth/auth-helpers/auth-ui
- RLS Policies: https://supabase.com/docs/guides/auth/row-level-security
- MFA: https://supabase.com/docs/guides/auth/auth-mfa
- Rate Limiting: https://supabase.com/docs/guides/platform/going-into-prod

### Password Security
- Have I Been Pwned: https://haveibeenpwned.com/
- OWASP Password Guidelines: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

### General Security Best Practices
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Web Security Checklist: https://www.sqreen.com/checklists/saas-cto-security-checklist

---

## 🆘 Security Incident Response

### If You Suspect a Security Issue

1. **Immediate Actions:**
   - Document what you observed
   - Check audit logs for suspicious activity
   - Review recent user signups and logins

2. **Supabase Dashboard:**
   - Authentication → Users → Check for suspicious accounts
   - Database → Query activity logs
   - Storage → Check for unauthorized uploads

3. **Mitigation Steps:**
   - Disable compromised accounts
   - Reset passwords if needed
   - Review and strengthen RLS policies
   - Update security configurations

4. **Contact Support:**
   - Supabase Support: support@supabase.io
   - Include project ID and detailed description

### Regular Security Audits

**Weekly:**
- Review new user signups
- Check payment submissions for anomalies

**Monthly:**
- Review audit logs
- Check for unused user accounts
- Verify RLS policies are working

**Quarterly:**
- Update dependencies
- Review security configurations
- Test backup and recovery procedures

---

## 📞 Questions?

For security-related questions:
1. Check Supabase documentation first
2. Review this security guide
3. Contact Supabase support for platform-specific issues
4. Consult a security professional for custom requirements

---

## ✅ Summary

**Current Security Status: GOOD for Development**

Your FlatFund Pro application has strong foundational security:
- ✅ RLS enabled and properly configured
- ✅ Storage policies secured
- ✅ Database optimized (unused indexes removed)
- ✅ Proper authentication flows

**Before Production:**
- ⚠️ Enable leaked password protection
- ⚠️ Enable email verification
- ⚠️ Review and complete production checklist

**Priority:** Enable leaked password protection now via Supabase Dashboard - it takes 30 seconds and significantly improves security!
