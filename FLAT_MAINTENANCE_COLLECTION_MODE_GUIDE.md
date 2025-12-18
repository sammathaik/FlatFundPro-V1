# Flat-Level Maintenance Collection Mode Implementation Guide

## Overview

The Flat-Level Maintenance Collection Mode feature ensures flats automatically inherit and comply with the apartment's collection policy. This implementation enforces strict policy compliance, transparency, and consistency in maintenance collection.

## System Architecture

### Automatic Inheritance Model

```
Super Admin (Apartment Level)
    ↓ Defines Policy
    default_collection_mode (A, B, or C)
    ↓ Automatically Inherited
Admin (Flat Level)
    ↓ Provides Mode-Specific Data
    Mode A: No additional fields required
    Mode B: built_up_area (sq. ft.)
    Mode C: flat_type (1BHK, 2BHK, etc.)
```

**Key Principle**: Flats do NOT have their own collection mode selection. They automatically use their apartment's `default_collection_mode`.

## Collection Modes Explained

### Mode A: Equal / Flat Rate
- **Description**: All flats pay the same maintenance amount regardless of size or type
- **Use Case**: Apartments with uniform flat sizes or policy of equal contribution
- **Flat Configuration**: No additional fields required
- **Example**: Every flat pays ₹3,000 per quarter

### Mode B: Area-Based (Built-up Area)
- **Description**: Maintenance calculated based on the flat's built-up area in square feet
- **Use Case**: Apartments with varying flat sizes where proportional contribution is desired
- **Flat Configuration**: Requires `built_up_area` field (numeric, > 0)
- **Example**: ₹5 per sq.ft × 1,200 sq.ft = ₹6,000 per quarter

### Mode C: Flat-Type Based
- **Description**: Maintenance based on flat category (1BHK, 2BHK, 3BHK, etc.)
- **Use Case**: Mixed-unit developments with predefined rates per flat type
- **Flat Configuration**: Requires `flat_type` field (1BHK, 2BHK, 3BHK, 4BHK, 5BHK, Studio, Penthouse, Duplex)
- **Example**: 2BHK pays ₹4,000, 3BHK pays ₹6,000 per quarter

## Database Schema Changes

### Apartments Table
```sql
default_collection_mode (collection_mode_enum) NOT NULL DEFAULT 'A'
```
This represents the apartment's policy-level collection mode that all flats automatically inherit.

### Flat Numbers Table
```sql
-- Core fields
id uuid PRIMARY KEY
block_id uuid NOT NULL
flat_number text NOT NULL

-- Mode-specific optional fields (no mode selection field!)
built_up_area NUMERIC(10, 2)              -- Required when apartment uses Mode B
flat_type TEXT                             -- Required when apartment uses Mode C
owner_name TEXT                            -- Optional: Owner information
occupant_type TEXT ('owner' | 'tenant')   -- Optional: Occupancy type
updated_at TIMESTAMPTZ DEFAULT now()      -- Automatic timestamp
```

**Important**: The `maintenance_collection_mode` field has been REMOVED from flat_numbers table. Flats inherit mode from apartment.

### Database View for Convenience
```sql
CREATE VIEW flat_numbers_with_mode AS
SELECT
  fn.*,
  bbp.apartment_id,
  bbp.block_name,
  a.apartment_name,
  a.default_collection_mode as collection_mode
FROM flat_numbers fn
JOIN buildings_blocks_phases bbp ON bbp.id = fn.block_id
JOIN apartments a ON a.id = bbp.apartment_id;
```

This view provides easy access to flats with their inherited collection mode.

## User Interface Implementation

### Admin Flat Management Module

#### 1. Flat Creation/Edit Form
- **Policy Display**: Blue information box showing apartment's collection mode
- **No Mode Selection**: Admins cannot select a different mode for individual flats
- **Automatic Inheritance**: Flat automatically uses apartment's `default_collection_mode`
- **Mode-Specific Fields**: Conditionally displayed based on apartment's policy

#### 2. Mode-Specific Field Visibility

**Apartment Mode A (Equal Rate):**
```
✓ Flat Number
✓ Building/Block
ℹ️ Policy: Mode A - Equal/Flat Rate
✓ Owner Name (optional)
✓ Occupant Type (optional)
```

**Apartment Mode B (Area-Based):**
```
✓ Flat Number
✓ Building/Block
ℹ️ Policy: Mode B - Area-Based
✓ Built-up Area (sq. ft.) - REQUIRED in blue box
✓ Owner Name (optional)
✓ Occupant Type (optional)
```

**Apartment Mode C (Type-Based):**
```
✓ Flat Number
✓ Building/Block
ℹ️ Policy: Mode C - Type-Based
✓ Flat Type dropdown - REQUIRED in green box
✓ Owner Name (optional)
✓ Occupant Type (optional)
```

#### 3. Flat Display Cards
Each flat card displays:
- Flat number (prominent)
- Mode-specific details (conditionally shown):
  - Mode B: Built-up area (e.g., "1,200 sq.ft")
  - Mode C: Flat type (e.g., "Type: 2BHK")
- Owner name (if provided, e.g., "Owner: Rajesh Kumar")
- Occupant type (if provided, e.g., "Tenant")

**Note**: No mode badge is shown on flat cards since all flats use the same mode.

## Validation Rules

### Client-Side Validation
1. **Mode B (Area-Based)**: Built-up area must be > 0 if apartment uses Mode B
2. **Mode C (Type-Based)**: Flat type must be selected if apartment uses Mode C
3. **User-Friendly Messages**: Clear error messages displayed in red boxes

### Database-Level Validation
1. **NOT NULL**: Required fields enforced at database level
2. **Data Integrity**: Prevents invalid data insertion

## Audit Logging

### Audit Trail for Flat Changes
```javascript
// When creating a flat
{
  action: 'create',
  table_name: 'flat_numbers',
  record_id: flat.id,
  details: {
    block_id: 'xxx',
    flat_number: '101',
    built_up_area: 1200, // if Mode B
    flat_type: '2BHK',   // if Mode C
    // ... other fields
  }
}

// When updating a flat
{
  action: 'update',
  table_name: 'flat_numbers',
  record_id: flat.id,
  details: {
    // updated fields
  }
}
```

### Audit Events Logged
- Flat creation with mode-specific attributes
- Attribute updates for existing flats
- Timestamp and user identification

## Backward Compatibility

### Data Migration Strategy
1. **Removed Field**: `maintenance_collection_mode` field removed from flat_numbers table
2. **No Data Loss**: Existing flats remain functional
3. **View Created**: `flat_numbers_with_mode` view provides backward compatibility for queries
4. **Automatic Inheritance**: Flats now automatically use apartment's collection mode

### Migration Notes
- Old data remains intact (built_up_area, flat_type, etc.)
- Queries can use the `flat_numbers_with_mode` view to get collection_mode
- No manual data cleanup required

## Policy Compliance Features

### 1. Apartment-Level Policy Enforcement
- Flats CANNOT deviate from apartment's collection mode
- Policy clearly displayed in UI during flat creation/editing
- Database structure enforces single source of truth (apartment level)

### 2. No Flat-Level Override
- No mode selection UI at flat level
- Mode-specific fields are for data input only, not policy selection
- Prevents unauthorized policy deviations

### 3. Transparency & Auditability
- All flat changes logged with timestamp
- Clear visual indicators of apartment policy
- Policy documentation accessible to admins

## Integration Points

### Expected Collections Module
The Expected Collections module should:
- Query flats using `flat_numbers_with_mode` view to get collection_mode
- Calculate amounts based on inherited mode:
  - Mode A: Use flat-rate amount for all flats
  - Mode B: Use `built_up_area × rate_per_sqft`
  - Mode C: Use `flat_type` to lookup predefined rates
- Generate collection records accordingly

### Payment Management Module
Payment submissions should:
- Query flat's apartment to determine collection mode
- Display mode context in payment records
- Validate payment amounts against expected collections

### Reports & Analytics
Analytics should:
- Use apartment's default_collection_mode for grouping
- Calculate expected vs. actual collections by apartment
- Provide apartment-wise collection performance metrics

## Administrative Workflows

### Super Admin Workflow (Setting Policy)
1. Navigate to Apartment Management
2. Create/Edit apartment
3. Select Default Collection Mode (A, B, or C)
4. Click "Policy Guide" for detailed explanation
5. Save apartment configuration
6. **This mode applies to ALL flats in the apartment**

### Admin Workflow (Flat Management)
1. Navigate to Building Management → Flat Numbers
2. Select building/block
3. Click "Add Flat"
4. View apartment's collection policy (displayed in info box)
5. Enter flat number
6. **If Apartment is Mode A**: No additional fields required
7. **If Apartment is Mode B**: Enter built-up area (required)
8. **If Apartment is Mode C**: Select flat type (required)
9. Optionally: Enter owner name and occupant type
10. Save flat configuration

### Editing Existing Flats
1. Locate flat in flat list
2. Click edit icon
3. View current apartment policy (displayed in info box)
4. Update flat-specific fields (area, type, owner, etc.)
5. System validates based on apartment's policy
6. Audit log records the modification

## Help & Documentation

### Super Admin Help Section
Title: "Apartment-Level Maintenance Collection Policy"
- Accessible via Info button in Apartment Management
- Explains all three collection modes with examples
- Covers policy rules and governance principles
- Emphasizes that policy applies to all flats in apartment

### Admin Contextual Help
- Policy information box showing apartment's mode
- Inline help text explaining mode-specific fields
- Visual cues (colored boxes) for required fields based on policy
- No confusing mode selection options

## Security & Permissions

### Row-Level Security (RLS)
- Admins can only manage flats in their apartment
- Super Admins can view all flats across apartments
- Audit logs track all modifications
- Database-level enforcement

### Data Integrity
- Validation based on apartment's policy
- NOT NULL constraints ensure required fields
- Triggers automatically update `updated_at` timestamp
- Transaction safety for multi-field updates

## Testing Recommendations

### Unit Testing
1. Test Mode A flat creation (no additional fields)
2. Test Mode B flat creation (with built-up area)
3. Test Mode C flat creation (with flat type)
4. Test validation errors for missing required fields
5. Test that flat inherits apartment's mode correctly

### Integration Testing
1. Verify automatic policy inheritance from apartment
2. Test flat display with different apartment modes
3. Validate audit log entries
4. Verify database view returns correct collection_mode
5. Test RLS policies

### User Acceptance Testing
1. Super Admin: Set apartment collection mode
2. Admin: Create flats and verify policy is displayed
3. Admin: Verify cannot select different mode for flat
4. Admin: Edit flat and update mode-specific fields
5. Verify flat list shows mode-specific details

## Benefits of This Approach

### 1. Policy Compliance
- **Single Source of Truth**: Apartment defines policy for all flats
- **No Deviation Possible**: Flats cannot override apartment policy
- **Clear Governance**: Administrators know policy applies uniformly

### 2. Simplicity
- **No Confusing Options**: Admins don't select mode per flat
- **Reduced Complexity**: Fewer fields and decisions
- **Clear UI**: Policy displayed, not editable at flat level

### 3. Data Integrity
- **Database Enforced**: No flat-level mode field to manage
- **Automatic Consistency**: All flats in apartment follow same policy
- **Easy Queries**: Join to apartment to get mode

### 4. Maintainability
- **Centralized Policy**: Change apartment mode to affect all flats
- **Audit Trail**: Policy changes tracked at apartment level
- **Cleaner Schema**: Fewer redundant fields

## Troubleshooting

### Common Issues

**Issue**: Mode-specific field not showing when creating flat
**Solution**: Verify apartment has `default_collection_mode` set correctly in Apartment Management

**Issue**: Validation error when saving flat
**Solution**: Ensure Mode B has built-up area > 0, Mode C has flat type selected

**Issue**: Cannot find flat's collection mode
**Solution**: Query the `flat_numbers_with_mode` view or join flat_numbers with apartments table

**Issue**: Need to change a flat's collection mode
**Solution**: Collection mode is set at apartment level. Change the apartment's `default_collection_mode` to affect all flats in that apartment

## Summary

The revised Flat-Level Maintenance Collection Mode implementation provides:
- **Automatic Policy Inheritance**: Flats inherit apartment's collection mode
- **Simplified Administration**: No per-flat mode selection
- **Strict Policy Compliance**: Enforced at database and UI level
- **Mode-Specific Data Entry**: Fields appear based on apartment policy
- **Complete Audit Trail**: All changes logged with context
- **User-Friendly Interface**: Clear policy display without confusing options
- **Backward Compatible**: Existing data preserved with view for queries
- **Single Source of Truth**: Apartment defines policy for entire complex

This approach ensures consistent, transparent, and policy-driven maintenance collection while eliminating the possibility of flat-level policy deviations.
