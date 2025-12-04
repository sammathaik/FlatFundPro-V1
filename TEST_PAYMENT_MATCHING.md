# Payment Matching Test Cases

## Test Case 1: Basic Type Matching
**Payment**: `payment_type = "maintenance"`  
**Expected**: `payment_type = "maintenance"`  
**Expected Result**: ✓ Should match

## Test Case 2: Quarter Matching
**Payment**: `payment_quarter = "Q1-2025"`  
**Expected**: `quarter = "Q1"`  
**Expected Result**: ✓ Should match (Q1 found in Q1-2025)

## Test Case 3: Year Matching - FY Format
**Payment**: `payment_quarter = "Q1-2025"`  
**Expected**: `financial_year = "FY25"`  
**Expected Result**: ✓ Should match (extract "25" from "FY25", convert to "2025", found in "Q1-2025")

## Test Case 4: Year Matching - Full Year Format
**Payment**: `payment_quarter = "Q1-2025"`  
**Expected**: `financial_year = "2025"`  
**Expected Result**: ✓ Should match (2025 found in Q1-2025)

## Test Case 5: Complete Match
**Payment**: 
- `payment_type = "maintenance"`
- `payment_quarter = "Q1-2025"`

**Expected**:
- `payment_type = "maintenance"`
- `quarter = "Q1"`
- `financial_year = "FY25"`

**Expected Result**: ✓ Should match (all three conditions met)

## Test Case 6: Type Mismatch
**Payment**: `payment_type = "maintenance"`  
**Expected**: `payment_type = "contingency"`  
**Expected Result**: ❌ Should NOT match

## Test Case 7: Quarter Mismatch
**Payment**: `payment_quarter = "Q1-2025"`  
**Expected**: `quarter = "Q2"`  
**Expected Result**: ❌ Should NOT match

## Test Case 8: Year Mismatch
**Payment**: `payment_quarter = "Q1-2025"`  
**Expected**: `financial_year = "FY26"`  
**Expected Result**: ❌ Should NOT match

## Test Case 9: NULL Values
**Payment**: `payment_quarter = NULL`  
**Expected**: `quarter = "Q1"`  
**Expected Result**: ❌ Should NOT match (NULL quarter)

## Test Case 10: Case Sensitivity
**Payment**: `payment_type = "Maintenance"`  
**Expected**: `payment_type = "maintenance"`  
**Expected Result**: ✓ Should match (case-insensitive comparison)


