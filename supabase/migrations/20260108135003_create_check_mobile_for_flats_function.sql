/*
  # Create Function to Check Mobile for Multiple Flats

  ## Overview
  Creates a function that checks if a mobile number has multiple flats
  WITHOUT generating an OTP. This allows the UI to show flat selection
  before OTP generation.

  ## Changes
  1. **New Function: check_mobile_for_flats**
     - Takes mobile number as input
     - Returns list of flats for that mobile
     - Does NOT generate OTP
     - Returns success with flat list

  ## Flow
  - If 0 flats: Return error
  - If 1 flat: Return single flat (UI will auto-proceed)
  - If multiple flats: Return all flats (UI will show selector)
*/

CREATE OR REPLACE FUNCTION check_mobile_for_flats(
  p_mobile text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_flat_count int;
  v_flats jsonb;
  v_email text;
BEGIN
  -- Find how many flats exist for this mobile
  SELECT COUNT(*) INTO v_flat_count
  FROM flat_email_mappings
  WHERE mobile = p_mobile;

  IF v_flat_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No account found with this mobile number'
    );
  END IF;

  -- Get email for this mobile (needed for OTP generation later)
  SELECT email INTO v_email
  FROM flat_email_mappings
  WHERE mobile = p_mobile
  LIMIT 1;

  -- Get all flats for this mobile with name field
  SELECT jsonb_agg(
    jsonb_build_object(
      'flat_id', fem.flat_id,
      'apartment_name', a.apartment_name,
      'block_name', bbp.block_name,
      'flat_number', fn.flat_number,
      'name', fem.name,
      'occupant_type', fem.occupant_type,
      'email', fem.email
    )
  ) INTO v_flats
  FROM flat_email_mappings fem
  INNER JOIN flat_numbers fn ON fn.id = fem.flat_id
  INNER JOIN buildings_blocks_phases bbp ON bbp.id = fem.block_id
  INNER JOIN apartments a ON a.id = fem.apartment_id
  WHERE fem.mobile = p_mobile;

  RETURN json_build_object(
    'success', true,
    'mobile', p_mobile,
    'email', v_email,
    'flat_count', v_flat_count,
    'flats', v_flats,
    'has_multiple_flats', v_flat_count > 1
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_mobile_for_flats(text) TO anon;
GRANT EXECUTE ON FUNCTION check_mobile_for_flats(text) TO authenticated;

COMMENT ON FUNCTION check_mobile_for_flats IS 'Checks if mobile number has multiple flats without generating OTP. Used for pre-OTP flat selection.';
