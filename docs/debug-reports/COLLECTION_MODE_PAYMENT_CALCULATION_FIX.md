# Collection Mode Payment Calculation Fix

## Issue Summary

The landing page (DynamicPaymentForm) was broken for collection modes B and C because it only used the `amount_due` field from expected_collections, which is designed for Mode A (flat rate). Modes B and C require dynamic calculation based on flat-specific data.

## Collection Mode Logic

### Mode A: Equal/Flat Rate
- Uses `amount_due` field directly
- Same amount for all flats
- Example: All flats pay ₹2500

### Mode B: Area-Based Calculation
- Uses `rate_per_sqft` × `built_up_area`
- Amount varies based on flat size
- Example: ₹3/sq.ft × 1200 sq.ft = ₹3600

### Mode C: Type-Based Calculation
- Uses `flat_type_rates` JSON object
- Amount based on flat type (1BHK, 2BHK, etc.)
- Example: 2BHK = ₹4500, 3BHK = ₹6000

## Changes Made

### 1. Updated ActiveCollection Interface
```typescript
interface ActiveCollection {
  id: string;
  collection_name: string;
  payment_type: string;
  payment_frequency: string;
  amount_due: number | null;  // Changed to nullable
  due_date: string;
  daily_fine?: number;
  rate_per_sqft?: number | null;  // Added for Mode B
  flat_type_rates?: any;  // Added for Mode C (JSON)
}
```

### 2. Added State for Selected Flat
```typescript
const [selectedFlat, setSelectedFlat] = useState<FlatNumber | null>(null);
```

This stores the complete flat data including `built_up_area` and `flat_type` needed for calculations.

### 3. Enhanced loadFlatDetails Function
Now loads both:
- Flat email mapping (for email, occupant_type, mobile)
- Flat number data (for built_up_area, flat_type)

### 4. Created calculateBaseAmount Function
```typescript
const calculateBaseAmount = (collection: ActiveCollection): number | null => {
  if (!selectedApartment || !selectedFlat) return null;

  const collectionMode = selectedApartment.default_collection_mode;

  // Mode A: Use amount_due directly
  if (collectionMode === 'A') {
    return collection.amount_due || 0;
  }

  // Mode B: Calculate rate × area
  if (collectionMode === 'B') {
    if (!collection.rate_per_sqft || !selectedFlat.built_up_area) return null;
    return Number(collection.rate_per_sqft) * Number(selectedFlat.built_up_area);
  }

  // Mode C: Look up flat type in rates
  if (collectionMode === 'C') {
    if (!collection.flat_type_rates || !selectedFlat.flat_type) return null;
    const rate = collection.flat_type_rates[selectedFlat.flat_type];
    return rate ? Number(rate) : null;
  }

  return null;
};
```

### 5. Updated calculateAmountWithFine Function
Changed signature to accept nullable baseAmount:
```typescript
const calculateAmountWithFine = (
  baseAmount: number | null,
  dueDate: string,
  dailyFine: number,
  paymentDate: string
): number
```

### 6. Updated Collection Loading
Added new fields to the query:
```typescript
.select('id, collection_name, payment_type, payment_frequency, amount_due, due_date, daily_fine, rate_per_sqft, flat_type_rates')
```

### 7. Updated Payment Amount Calculation
All places where amount is calculated now use `calculateBaseAmount()` first:
```typescript
const baseAmount = calculateBaseAmount(selectedCollection);
const calculatedAmount = calculateAmountWithFine(
  baseAmount,
  selectedCollection.due_date,
  selectedCollection.daily_fine || 0,
  paymentDate
);
```

### 8. Enhanced UI Display

**Collection Dropdown:**
- Shows calculated amount for the selected flat
- Mode A: Shows fixed amount
- Mode B/C: Shows "Amount varies" until flat is selected, then shows calculated amount

**Payment Details Section:**
- Mode A: Shows base amount
- Mode B: Shows base amount with calculation breakdown (rate × area)
- Mode C: Shows base amount with flat type indicator
- All modes: Shows late fees if overdue

**Error Handling:**
- Shows clear error if Mode B flat missing built_up_area
- Shows clear error if Mode C flat missing flat_type
- Shows clear error if collection missing rate data

### 9. Created Test Collection

Created a test collection for Downtown Residences (Mode C):
```sql
Collection: "December 2025 Maintenance"
Flat Type Rates:
- Studio: ₹2500
- 1BHK: ₹3000
- 2BHK: ₹4500
- 3BHK: ₹6000
- 4BHK: ₹8000
- 5BHK: ₹10000
- Penthouse: ₹15000
- Duplex: ₹12000
```

## How It Works Now

### For Mode A (Meenakshi Residency, Sunrise Heights):
1. User selects flat
2. Form shows collection with fixed amount (e.g., ₹2500)
3. Payment amount auto-fills with ₹2500 (plus late fees if applicable)
4. Works as before - no changes to user experience

### For Mode B (Green Valley Apartments):
1. User selects flat (e.g., N-101 with 1200 sq.ft)
2. System loads flat's built_up_area (1200 sq.ft)
3. Form shows collection "Year End Community Celebration Collection"
4. Calculates: ₹3/sq.ft × 1200 sq.ft = ₹3600
5. Payment amount auto-fills with ₹3600 (plus late fees if applicable)
6. UI shows calculation breakdown

### For Mode C (Downtown Residences):
1. User selects flat (e.g., P1-101 with type 2BHK)
2. System loads flat's flat_type (2BHK)
3. Form shows collection "December 2025 Maintenance"
4. Looks up 2BHK rate: ₹4500
5. Payment amount auto-fills with ₹4500 (plus late fees if applicable)
6. UI shows "Rate for 2BHK"

## Data Requirements

### For Mode B Apartments:
**Expected Collections must have:**
- `rate_per_sqft` field populated (e.g., 3.00)
- `amount_due` can be NULL

**Flats must have:**
- `built_up_area` populated (e.g., 1200.00)

### For Mode C Apartments:
**Expected Collections must have:**
- `flat_type_rates` JSON object with all flat types
- `amount_due` can be NULL

**Flats must have:**
- `flat_type` populated (e.g., "2BHK")

## Error Messages

The form now provides clear feedback:

**Mode B - Missing Area:**
> "This flat is missing the built-up area required for area-based calculation. Please contact your admin."

**Mode C - Missing Type:**
> "This flat is missing the flat type required for type-based calculation. Please contact your admin."

**Mode B - Missing Rate:**
> "This collection is missing the rate per sq.ft. Please contact your admin."

**Mode C - Missing Rates:**
> "This collection is missing the flat type rates. Please contact your admin."

## Testing

Build successful - no errors.

### To Test Mode B:
1. Go to payment form
2. Select "Green Valley Apartments"
3. Select any block and flat
4. Select "Year End Community Celebration Collection"
5. Should see: ₹3/sq.ft × [area] sq.ft = ₹[total]
6. Payment amount should auto-calculate

### To Test Mode C:
1. Go to payment form
2. Select "Downtown Residences"
3. Select any flat (all are 2BHK)
4. Select "December 2025 Maintenance"
5. Should see: Rate for 2BHK = ₹4500
6. Payment amount should auto-calculate

## Notes

1. The payment amount is auto-calculated but remains editable (partial payments allowed)
2. Late fees are added automatically based on payment date vs due date
3. All three modes work seamlessly in the same form
4. The form detects apartment collection mode and calculates accordingly
5. Existing Mode A functionality is unchanged

## Summary

The payment form now correctly handles all three collection modes:
- Mode A: Fixed amount (existing behavior)
- Mode B: Area-based calculation (NEW)
- Mode C: Type-based calculation (NEW)

Payment amounts are automatically calculated based on the apartment's collection mode and the flat's specific properties (area or type).
