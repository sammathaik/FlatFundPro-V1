# Enhanced Collection Management System Guide

## Overview

The Enhanced Collection Management System now fully supports all three apartment collection modes (A, B, and C), allowing administrators to create payment collections that align with their apartment's maintenance policy.

## Key Changes Summary

### 1. Terminology Update
- **"Owner Name"** changed to **"Resident Name"** across all interfaces
- More accurate since residents can be either owners or tenants
- Applied to flat management, analytics, and all exports

### 2. Collection Mode Support
The Expected Collections module now supports:
- **Mode A**: Equal/Flat Rate (all flats pay the same amount)
- **Mode B**: Area-Based (payment calculated per square foot)
- **Mode C**: Type-Based (payment varies by flat type)

## Database Schema Changes

### Expected Collections Table - New Columns

```sql
-- Mode A: Flat Rate
amount_due NUMERIC(10, 2)  -- Nullable, used only for Mode A

-- Mode B: Area-Based
rate_per_sqft NUMERIC(10, 2)  -- Rate per square foot

-- Mode C: Type-Based
flat_type_rates JSONB  -- JSON object: {"1BHK": 3000, "2BHK": 5000, ...}
```

### Validation Constraint
At least one pricing method must be specified:
- `amount_due` OR
- `rate_per_sqft` OR
- `flat_type_rates`

This ensures every collection has valid pricing configuration.

## User Interface Enhancements

### Apartment Collection Policy Display

When creating or editing a payment collection, administrators see:

```
┌────────────────────────────────────────────────────────┐
│ ℹ️ Apartment Collection Policy: Mode [A/B/C]          │
│                                                         │
│ [Mode-specific description]                            │
└────────────────────────────────────────────────────────┘
```

This information box clearly shows:
- Current apartment's collection mode
- Plain English explanation of what the mode means
- Cannot be changed at collection level (apartment-wide policy)

### Mode A: Equal/Flat Rate

**Form Fields:**
```
┌─────────────────────────────────┐
│ Amount Due per Flat *           │
│ ₹ [___________]                 │
│ Fixed amount charged to all flats│
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Daily Fine (optional)           │
│ ₹ [___________]                 │
└─────────────────────────────────┘
```

**Display in Collection List:**
```
Pricing: ₹5,000 per flat
```

**How It Works:**
- Every flat in the apartment pays the exact same amount
- Simple and straightforward
- Common for apartments with uniform flat sizes

**Example:**
- Amount Due: ₹5,000
- Result: All flats (whether 1BHK or 3BHK) pay ₹5,000

### Mode B: Area-Based

**Form Fields:**
```
┌─────────────────────────────────┐
│ Rate per Square Foot *          │
│ ₹ [___________]                 │
│ Amount multiplied by flat's     │
│ built-up area                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Daily Fine (optional)           │
│ ₹ [___________]                 │
└─────────────────────────────────┘
```

**Display in Collection List:**
```
Pricing: ₹5/sq.ft
```

**How It Works:**
- Rate is multiplied by each flat's built-up area
- Flat must have `built_up_area` field populated
- Proportional payment based on space occupied

**Example:**
- Rate per sq.ft: ₹5
- Flat with 1,000 sq.ft: ₹5 × 1,000 = ₹5,000
- Flat with 1,500 sq.ft: ₹5 × 1,500 = ₹7,500

**Important:** Flats must have `built_up_area` configured in Building Management.

### Mode C: Type-Based

**Form Fields:**
```
┌────────────────────────────────────────────────────┐
│ Flat Type Rates *                                  │
│                                                    │
│  Studio     ₹ [_______]    1BHK      ₹ [_______]  │
│  2BHK       ₹ [_______]    3BHK      ₹ [_______]  │
│  4BHK       ₹ [_______]    5BHK      ₹ [_______]  │
│  Penthouse  ₹ [_______]    Duplex    ₹ [_______]  │
│                                                    │
│ Enter amount for each flat type                   │
└────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│ Daily Fine (optional)           │
│ ₹ [___________]                 │
└─────────────────────────────────┘
```

**Display in Collection List:**
```
Pricing: Type-Based Rates
```

**How It Works:**
- Each flat type has a predefined rate
- Flat must have `flat_type` field populated
- Payment determined by looking up flat's type

**Example:**
```json
{
  "Studio": 2500,
  "1BHK": 3000,
  "2BHK": 5000,
  "3BHK": 7000,
  "4BHK": 9000,
  "5BHK": 11000,
  "Penthouse": 15000,
  "Duplex": 12000
}
```

- A 2BHK flat pays: ₹5,000
- A 3BHK flat pays: ₹7,000
- A Penthouse pays: ₹15,000

**Important:** Flats must have `flat_type` configured in Building Management.

## Workflow Examples

### Scenario 1: Admin Creates Mode A Collection

1. Admin navigates to Expected Collections
2. Clicks "Create Collection"
3. Sees: "Apartment Collection Policy: Mode A - Equal/Flat Rate"
4. Fills in:
   - Payment Type: Maintenance
   - Collection Name: Q1 FY25 Maintenance
   - Due Date: 2025-04-30
   - Amount Due per Flat: ₹5,000
   - Daily Fine: ₹50 (optional)
5. Saves collection
6. **Result:** All flats see ₹5,000 maintenance due

### Scenario 2: Admin Creates Mode B Collection

1. Admin navigates to Expected Collections
2. Clicks "Create Collection"
3. Sees: "Apartment Collection Policy: Mode B - Area-Based"
4. Fills in:
   - Payment Type: Maintenance
   - Collection Name: Q1 FY25 Maintenance
   - Due Date: 2025-04-30
   - Rate per Square Foot: ₹6.00
   - Daily Fine: ₹50 (optional)
5. Saves collection
6. **Result:**
   - Flat with 1,000 sq.ft sees: ₹6,000 due
   - Flat with 1,200 sq.ft sees: ₹7,200 due
   - Flat with 1,500 sq.ft sees: ₹9,000 due

### Scenario 3: Admin Creates Mode C Collection

1. Admin navigates to Expected Collections
2. Clicks "Create Collection"
3. Sees: "Apartment Collection Policy: Mode C - Type-Based"
4. Fills in:
   - Payment Type: Maintenance
   - Collection Name: Q1 FY25 Maintenance
   - Due Date: 2025-04-30
   - Flat Type Rates:
     - Studio: ₹2,500
     - 1BHK: ₹3,500
     - 2BHK: ₹5,000
     - 3BHK: ₹7,000
     - 4BHK: ₹9,000
     - 5BHK: ₹11,000
     - Penthouse: ₹15,000
     - Duplex: ₹12,000
   - Daily Fine: ₹50 (optional)
5. Saves collection
6. **Result:**
   - All 1BHK flats see: ₹3,500 due
   - All 2BHK flats see: ₹5,000 due
   - All 3BHK flats see: ₹7,000 due
   - etc.

## Validation Rules

### Mode A (Flat Rate)
- `amount_due` must be provided
- Must be greater than 0
- Error: "Amount Due per Flat is required for Mode A"

### Mode B (Area-Based)
- `rate_per_sqft` must be provided
- Must be greater than 0
- Error: "Rate per Square Foot is required for Mode B"
- **Note:** Flats without `built_up_area` will need manual handling

### Mode C (Type-Based)
- All flat type rates must be provided
- All rates must be greater than 0
- Error: "Please enter rates for all flat types for Mode C"
- **Note:** Flats without `flat_type` will need manual handling

## Collection List Display

Collections now show pricing information based on their mode:

**Mode A Collection:**
```
┌────────────────────────────────────────────┐
│ Q1 FY25 Maintenance         [ACTIVE]       │
│                                            │
│ Type: Maintenance Collection               │
│ Frequency: Quarterly Recurring             │
│ Pricing: ₹5,000 per flat                  │
│ Due Date: April 30, 2025                   │
└────────────────────────────────────────────┘
```

**Mode B Collection:**
```
┌────────────────────────────────────────────┐
│ Q1 FY25 Maintenance         [ACTIVE]       │
│                                            │
│ Type: Maintenance Collection               │
│ Frequency: Quarterly Recurring             │
│ Pricing: ₹6/sq.ft                         │
│ Due Date: April 30, 2025                   │
└────────────────────────────────────────────┘
```

**Mode C Collection:**
```
┌────────────────────────────────────────────┐
│ Q1 FY25 Maintenance         [ACTIVE]       │
│                                            │
│ Type: Maintenance Collection               │
│ Frequency: Quarterly Recurring             │
│ Pricing: Type-Based Rates                  │
│ Due Date: April 30, 2025                   │
└────────────────────────────────────────────┘
```

## Backend Integration Points

### Payment Calculation Logic

When a resident views their payment form or expected amount:

```typescript
// Pseudo-code for payment calculation
function calculateExpectedAmount(flat, collection) {
  if (collection.amount_due) {
    // Mode A: Flat Rate
    return collection.amount_due;
  } else if (collection.rate_per_sqft) {
    // Mode B: Area-Based
    if (!flat.built_up_area) {
      throw new Error('Flat missing built_up_area for Mode B collection');
    }
    return collection.rate_per_sqft * flat.built_up_area;
  } else if (collection.flat_type_rates) {
    // Mode C: Type-Based
    if (!flat.flat_type) {
      throw new Error('Flat missing flat_type for Mode C collection');
    }
    return collection.flat_type_rates[flat.flat_type];
  }
  throw new Error('Collection missing pricing configuration');
}
```

### Expected Collections Query

When fetching collections, always include all pricing fields:

```sql
SELECT
  id,
  collection_name,
  due_date,
  amount_due,
  rate_per_sqft,
  flat_type_rates,
  daily_fine,
  -- other fields...
FROM expected_collections
WHERE apartment_id = ?
  AND is_active = true;
```

## Data Migration

### Existing Collections
- All existing collections with `amount_due` continue to work
- They are Mode A collections by default
- No data loss or changes required

### New Collections
- Must specify pricing based on apartment's `default_collection_mode`
- Database constraint ensures valid pricing configuration
- UI automatically shows correct form fields

## Best Practices

### For Apartment Admins

1. **Understand Your Mode:**
   - Check apartment's collection mode in Apartment Management
   - Mode applies to ALL payment collections in your apartment
   - Cannot create collections with different modes

2. **Ensure Flat Data Completeness:**
   - **Mode B**: Verify all flats have `built_up_area` configured
   - **Mode C**: Verify all flats have `flat_type` configured
   - Use Building Management to update missing data

3. **Consistent Rates:**
   - For Mode C, maintain consistent rate structure across quarters
   - Document rate changes for transparency

4. **Communication:**
   - Clearly explain to residents how their maintenance is calculated
   - For Mode B: Show calculation (rate × area = amount)
   - For Mode C: Show rate table for different flat types

### For Super Admins

1. **Setting Apartment Mode:**
   - Choose mode that matches apartment's actual policy
   - Consider fairness and resident expectations
   - Document the rationale for the chosen mode

2. **Mode Selection Guidance:**
   - **Mode A**: Uniform apartments, simple management
   - **Mode B**: Varied flat sizes, proportional contribution
   - **Mode C**: Mixed developments, distinct categories

3. **Support Admins:**
   - Ensure admins understand the apartment's mode
   - Help populate required flat data (area/type)
   - Monitor collection creation for accuracy

## Troubleshooting

### Issue: Cannot Save Collection

**Problem:** Validation error when creating collection

**Solution:**
- Verify you've filled in the required pricing field for your mode
- Mode A: Check `amount_due` is provided
- Mode B: Check `rate_per_sqft` is provided
- Mode C: Check all flat type rates are provided

### Issue: Residents See Incorrect Amounts

**Problem:** Calculated amounts don't match expected values

**Solution:**
- **Mode B**: Verify flat's `built_up_area` is correct in Building Management
- **Mode C**: Verify flat's `flat_type` is correct in Building Management
- Check collection's pricing configuration is correct

### Issue: Mode B/C Collections Not Calculating

**Problem:** Some flats not showing expected amounts

**Solution:**
- Check if affected flats have required data:
  - Mode B requires: `built_up_area`
  - Mode C requires: `flat_type`
- Update missing data in Building Management
- Flats without required data may need manual handling

## API Reference (For Developers)

### Expected Collections Schema

```typescript
interface ExpectedCollection {
  id: string;
  apartment_id: string;
  payment_type: 'maintenance' | 'contingency' | 'emergency';
  payment_frequency: 'one-time' | 'monthly' | 'quarterly' | 'yearly';
  collection_name: string;
  due_date: string;

  // Pricing (mode-dependent)
  amount_due?: number;              // Mode A
  rate_per_sqft?: number;           // Mode B
  flat_type_rates?: {               // Mode C
    [flatType: string]: number;
  };

  daily_fine: number;
  is_active: boolean;
  // ... other fields
}
```

### Flat Schema (Relevant Fields)

```typescript
interface Flat {
  id: string;
  flat_number: string;

  // Mode-specific fields (inherited from apartment policy)
  built_up_area?: number;    // Required for Mode B
  flat_type?: string;        // Required for Mode C

  // ... other fields
}
```

## Security Considerations

### Row-Level Security (RLS)
- Existing RLS policies apply to new columns
- Only apartment admins can create/edit collections
- Pricing data visible to authenticated residents
- Super Admins have full access

### Data Integrity
- Database constraint ensures valid pricing configuration
- Cannot save collection without appropriate pricing
- Type safety in TypeScript interfaces

## Summary of Benefits

### For Administrators
1. **Policy Alignment**: Collections automatically match apartment's mode
2. **Clear Guidance**: UI shows exactly what needs to be filled in
3. **Validation**: Cannot create invalid collections
4. **Flexibility**: Support for all three pricing models

### For Residents
1. **Transparency**: Clear understanding of how amounts are calculated
2. **Fairness**: Payment aligned with apartment policy
3. **Consistency**: All collections follow same pricing model

### For System
1. **Data Integrity**: Constraints prevent invalid configurations
2. **Maintainability**: Centralized policy at apartment level
3. **Scalability**: Supports diverse apartment types and policies
4. **Backward Compatible**: Existing Mode A collections work unchanged

## Next Steps for Admins

1. **Verify Apartment Mode:**
   - Check your apartment's collection mode setting
   - Understand what it means for payment calculations

2. **Update Flat Data:**
   - If Mode B: Ensure all flats have built-up area
   - If Mode C: Ensure all flats have flat type
   - Use Building Management module to update

3. **Create Test Collection:**
   - Create an inactive test collection
   - Verify pricing fields appear correctly
   - Review calculated amounts before activating

4. **Communicate with Residents:**
   - Explain the calculation method
   - Provide transparency on how amounts are determined
   - Answer questions about the pricing structure

## Support

For questions or issues:
- Check this guide first
- Review apartment's collection mode setting
- Verify flat data completeness
- Contact system administrator if issues persist

---

**Version:** 1.0
**Last Updated:** December 2024
**System:** FlatFund Pro Enhanced Collection Management
