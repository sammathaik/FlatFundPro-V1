# Flat-Level Maintenance Collection Mode Implementation Guide

## Overview

The Flat-Level Maintenance Collection Mode feature allows apartments to define how maintenance charges are calculated, and enables admins to configure individual flats according to these policies. This implementation ensures policy compliance, transparency, and flexibility in maintenance collection.

## System Architecture

### Three-Tier Collection Mode Structure

```
Super Admin (Apartment Level)
    ↓ Defines Policy
    default_collection_mode (A, B, or C)
    ↓
Admin (Flat Level)
    ↓ Implements Policy
    maintenance_collection_mode (A, B, or C)
    ↓ With mode-specific attributes
    Mode A: No additional fields required
    Mode B: built_up_area (sq. ft.)
    Mode C: flat_type (1BHK, 2BHK, etc.)
```

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
-- Field renamed for clarity
default_collection_mode (collection_mode_enum) NOT NULL DEFAULT 'A'
```
This represents the apartment's policy-level collection mode.

### Flat Numbers Table
```sql
-- New required field
maintenance_collection_mode (collection_mode_enum) NOT NULL DEFAULT 'A'

-- Mode-specific optional fields
built_up_area NUMERIC(10, 2)              -- Required for Mode B
flat_type TEXT                             -- Required for Mode C
owner_name TEXT                            -- Optional: Owner information
occupant_type TEXT ('owner' | 'tenant')   -- Optional: Occupancy type
updated_at TIMESTAMPTZ DEFAULT now()      -- Automatic timestamp
```

### Database Constraints
- Mode B flats MUST have `built_up_area > 0`
- Mode C flats MUST have `flat_type` (non-empty)
- Enforced via CHECK constraints at database level

## User Interface Implementation

### Admin Flat Management Module

#### 1. Flat Creation/Edit Form
- **Dynamic Mode Selection**: Radio buttons for Mode A, B, and C
- **Default Inheritance**: New flats inherit apartment's `default_collection_mode`
- **Policy Indicator**: Blue badge showing "As per apartment policy"
- **Mode-Specific Fields**: Conditionally displayed based on selected mode

#### 2. Mode-Specific Field Visibility

**Mode A Selected:**
```
✓ Flat Number
✓ Building/Block
✓ Mode Selection (A selected)
✓ Owner Name (optional)
✓ Occupant Type (optional)
```

**Mode B Selected:**
```
✓ Flat Number
✓ Building/Block
✓ Mode Selection (B selected)
✓ Built-up Area (sq. ft.) - REQUIRED in blue box
✓ Owner Name (optional)
✓ Occupant Type (optional)
```

**Mode C Selected:**
```
✓ Flat Number
✓ Building/Block
✓ Mode Selection (C selected)
✓ Flat Type dropdown - REQUIRED in green box
✓ Owner Name (optional)
✓ Occupant Type (optional)
```

#### 3. Flat Display Cards
Each flat card now displays:
- Flat number
- Collection mode badge (color-coded):
  - Mode A: Gray badge
  - Mode B: Blue badge
  - Mode C: Green badge
- Mode-specific details:
  - Mode B: Built-up area (e.g., "1,200 sq.ft")
  - Mode C: Flat type (e.g., "2BHK")
- Owner name (if provided)

## Validation Rules

### Client-Side Validation
1. **Mode Selection**: Mandatory, cannot be empty
2. **Mode B**: Built-up area must be > 0 if Mode B is selected
3. **Mode C**: Flat type must be selected if Mode C is chosen
4. **User-Friendly Messages**: Clear error messages displayed in red boxes

### Database-Level Validation
1. **CHECK Constraints**: Enforce mode-specific requirements
2. **NOT NULL**: `maintenance_collection_mode` is mandatory
3. **Data Integrity**: Prevents invalid data insertion

## Audit Logging

### Audit Trail for Mode Changes
```javascript
// When updating a flat with mode change
{
  action: 'update',
  table_name: 'flat_numbers',
  record_id: flat.id,
  details: {
    previous_mode: 'A',
    new_mode: 'B',
    built_up_area: 1200,
    // ... other fields
  }
}
```

### Audit Events Logged
- Flat creation with mode selection
- Mode changes for existing flats
- Mode-specific attribute updates
- Timestamp and user identification

## Backward Compatibility

### Data Migration Strategy
1. **Existing Flats**: Automatically assigned apartment's `default_collection_mode`
2. **Mode B Flats**: Default `built_up_area` set to 1000 sq.ft (reviewable by admin)
3. **Mode C Flats**: Default `flat_type` set to '2BHK' (reviewable by admin)
4. **No Data Loss**: All existing flats remain functional

### Migration Notes
- Admins should review auto-assigned values
- Update flats with accurate area/type information
- Mode changes logged for transparency

## Policy Compliance Features

### 1. Apartment-Level Policy Enforcement
- Flats cannot deviate from apartment's allowed collection mode
- Policy indicator visible in UI
- Help documentation accessible via "Policy Guide" button

### 2. No Flat-Level Rate Override
- Flat configuration does NOT include amount fields
- Rates configured separately in Maintenance Setup module
- Prevents unauthorized rate modifications

### 3. Transparency & Auditability
- All mode changes logged with timestamp
- Clear visual indicators of flat configuration
- Policy documentation accessible to admins

## Integration Points

### Expected Collections Module
The Expected Collections module should:
- Query flats by `maintenance_collection_mode`
- Calculate amounts based on mode:
  - Mode A: Use flat-rate amount
  - Mode B: Use `built_up_area × rate_per_sqft`
  - Mode C: Use `flat_type` to lookup predefined rates
- Generate collection records accordingly

### Payment Management Module
Payment submissions should:
- Display flat's collection mode for context
- Validate payment amounts against expected collections
- Show mode-specific details in payment records

### Reports & Analytics
Analytics should:
- Group flats by collection mode
- Calculate expected vs. actual collections per mode
- Provide mode-wise collection performance metrics

## Administrative Workflows

### Super Admin Workflow
1. Navigate to Apartment Management
2. Create/Edit apartment
3. Select Default Collection Mode (A, B, or C)
4. Click "Policy Guide" for detailed explanation
5. Save apartment configuration

### Admin Workflow (Flat Management)
1. Navigate to Building Management → Flat Numbers
2. Select building/block
3. Click "Add Flat"
4. Enter flat number
5. Select Maintenance Collection Mode (inherits from apartment default)
6. If Mode B: Enter built-up area
7. If Mode C: Select flat type
8. Optionally: Enter owner name and occupant type
9. Save flat configuration

### Editing Existing Flats
1. Locate flat in flat list
2. Click edit icon
3. Review current mode configuration
4. Update mode or mode-specific fields
5. System validates and saves changes
6. Audit log records the modification

## Help & Documentation

### Super Admin Help Section
Title: "Apartment-Level Maintenance Collection Policy"
- Accessible via Info button in Apartment Management
- Explains all three collection modes with examples
- Covers policy rules and governance principles
- Provides recommendations for mode selection

### Admin Contextual Help
- Inline help text explaining each field
- Mode-specific guidance when selecting B or C
- "As per apartment policy" indicator
- Visual cues (colored boxes) for required fields

## Security & Permissions

### Row-Level Security (RLS)
- Admins can only manage flats in their apartment
- Super Admins can view all flats across apartments
- Audit logs track all modifications
- Database-level enforcement

### Data Integrity
- CHECK constraints prevent invalid configurations
- NOT NULL constraints ensure required fields
- Triggers automatically update `updated_at` timestamp
- Transaction safety for multi-field updates

## Testing Recommendations

### Unit Testing
1. Test Mode A flat creation (no additional fields)
2. Test Mode B flat creation (with built-up area)
3. Test Mode C flat creation (with flat type)
4. Test mode switching (A → B, B → C, etc.)
5. Test validation errors for missing required fields

### Integration Testing
1. Verify apartment policy inheritance
2. Test flat display with different modes
3. Validate audit log entries
4. Verify database constraints
5. Test RLS policies

### User Acceptance Testing
1. Super Admin: Set apartment collection mode
2. Admin: Create flats with different modes
3. Admin: Edit flat and change mode
4. Admin: View flat list with mode indicators
5. Verify help documentation accessibility

## Future Enhancements

### Potential Improvements
1. **Multiple Modes Per Apartment**: Allow apartment to have mixed collection modes
2. **Dynamic Rate Configuration**: Link flat attributes directly to rate calculation
3. **Historical Mode Tracking**: Track mode changes over time with effective dates
4. **Bulk Mode Updates**: Update multiple flats' modes at once
5. **Mode-Specific Reporting**: Dedicated reports per collection mode

### Considerations
- Maintain backward compatibility
- Preserve audit trail integrity
- Ensure policy compliance framework
- Minimize complexity for users

## Troubleshooting

### Common Issues

**Issue**: Flat creation fails with constraint violation
**Solution**: Ensure Mode B has built-up area > 0, Mode C has flat type selected

**Issue**: Apartment policy not reflecting in new flats
**Solution**: Verify apartment has `default_collection_mode` set correctly

**Issue**: Mode changes not saving
**Solution**: Check validation errors, ensure required fields are filled

**Issue**: Audit logs not showing mode changes
**Solution**: Verify audit logging function is called in update operations

## Summary

The Flat-Level Maintenance Collection Mode implementation provides:
- **Policy-Driven Configuration**: Apartment-level policy governance
- **Flexible Mode Selection**: Three collection modes to suit different scenarios
- **Dynamic UI**: Mode-specific fields appear based on selection
- **Robust Validation**: Client and database-level enforcement
- **Complete Audit Trail**: All changes logged with context
- **User-Friendly Interface**: Clear visual indicators and help documentation
- **Backward Compatible**: Existing data migrated seamlessly

This feature enables transparent, fair, and configurable maintenance collection while maintaining strong policy compliance and data integrity.
