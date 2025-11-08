/*
  # Add Sample Data for Testing

  ## Purpose
  This migration adds sample data to help test the three-portal system:
  - Public portal (for residents submitting payments)
  - Apartment Admin portal (for managing specific apartments)
  - Super Admin portal (for managing the entire system)

  ## Sample Data Created
  
  1. **Apartments**
     - Sunrise Heights (Active)
     - Green Valley Apartments (Active)
     - Downtown Residences (Active)
  
  2. **Buildings/Blocks/Phases**
     - Each apartment has 2-3 blocks with flats
  
  3. **Flat Numbers**
     - Multiple flats per block (101-104, 201-204, etc.)
  
  4. **Auth Users**
     - Note: Auth users must be created via Supabase Dashboard first
     - This migration only creates the admin/super_admin records
  
  ## Important Notes
  - This is TEST DATA for development/demo purposes
  - In production, data should be entered through the admin interfaces
  - Auth users must be created separately in Supabase Dashboard
*/

-- ============================================================================
-- 1. CREATE SAMPLE APARTMENTS
-- ============================================================================

INSERT INTO apartments (apartment_name, status)
VALUES 
  ('Sunrise Heights', 'active'),
  ('Green Valley Apartments', 'active'),
  ('Downtown Residences', 'active')
ON CONFLICT (apartment_name) DO NOTHING;

-- ============================================================================
-- 2. CREATE BUILDINGS/BLOCKS/PHASES
-- ============================================================================

-- For Sunrise Heights
INSERT INTO buildings_blocks_phases (apartment_id, block_name, type)
SELECT 
  a.id,
  block_data.name,
  'Block'
FROM apartments a
CROSS JOIN (
  VALUES 
    ('Block A'),
    ('Block B'),
    ('Block C')
) AS block_data(name)
WHERE a.apartment_name = 'Sunrise Heights'
ON CONFLICT (apartment_id, block_name) DO NOTHING;

-- For Green Valley Apartments
INSERT INTO buildings_blocks_phases (apartment_id, block_name, type)
SELECT 
  a.id,
  block_data.name,
  'Tower'
FROM apartments a
CROSS JOIN (
  VALUES 
    ('North Tower'),
    ('South Tower')
) AS block_data(name)
WHERE a.apartment_name = 'Green Valley Apartments'
ON CONFLICT (apartment_id, block_name) DO NOTHING;

-- For Downtown Residences
INSERT INTO buildings_blocks_phases (apartment_id, block_name, type)
SELECT 
  a.id,
  block_data.name,
  'Phase'
FROM apartments a
CROSS JOIN (
  VALUES 
    ('Phase 1'),
    ('Phase 2'),
    ('Phase 3')
) AS block_data(name)
WHERE a.apartment_name = 'Downtown Residences'
ON CONFLICT (apartment_id, block_name) DO NOTHING;

-- ============================================================================
-- 3. CREATE FLAT NUMBERS
-- ============================================================================

-- Flats for Sunrise Heights - Block A
INSERT INTO flat_numbers (block_id, flat_number)
SELECT 
  bbp.id,
  flat_data.num
FROM buildings_blocks_phases bbp
JOIN apartments a ON a.id = bbp.apartment_id
CROSS JOIN (
  VALUES ('101'), ('102'), ('103'), ('104'),
         ('201'), ('202'), ('203'), ('204'),
         ('301'), ('302'), ('303'), ('304')
) AS flat_data(num)
WHERE a.apartment_name = 'Sunrise Heights' 
  AND bbp.block_name = 'Block A'
ON CONFLICT (block_id, flat_number) DO NOTHING;

-- Flats for Sunrise Heights - Block B
INSERT INTO flat_numbers (block_id, flat_number)
SELECT 
  bbp.id,
  flat_data.num
FROM buildings_blocks_phases bbp
JOIN apartments a ON a.id = bbp.apartment_id
CROSS JOIN (
  VALUES ('105'), ('106'), ('107'), ('108'),
         ('205'), ('206'), ('207'), ('208'),
         ('305'), ('306'), ('307'), ('308')
) AS flat_data(num)
WHERE a.apartment_name = 'Sunrise Heights' 
  AND bbp.block_name = 'Block B'
ON CONFLICT (block_id, flat_number) DO NOTHING;

-- Flats for Sunrise Heights - Block C
INSERT INTO flat_numbers (block_id, flat_number)
SELECT 
  bbp.id,
  flat_data.num
FROM buildings_blocks_phases bbp
JOIN apartments a ON a.id = bbp.apartment_id
CROSS JOIN (
  VALUES ('109'), ('110'), ('111'), ('112'),
         ('209'), ('210'), ('211'), ('212')
) AS flat_data(num)
WHERE a.apartment_name = 'Sunrise Heights' 
  AND bbp.block_name = 'Block C'
ON CONFLICT (block_id, flat_number) DO NOTHING;

-- Flats for Green Valley - North Tower
INSERT INTO flat_numbers (block_id, flat_number)
SELECT 
  bbp.id,
  flat_data.num
FROM buildings_blocks_phases bbp
JOIN apartments a ON a.id = bbp.apartment_id
CROSS JOIN (
  VALUES ('N-101'), ('N-102'), ('N-103'), ('N-104'),
         ('N-201'), ('N-202'), ('N-203'), ('N-204'),
         ('N-301'), ('N-302'), ('N-303'), ('N-304')
) AS flat_data(num)
WHERE a.apartment_name = 'Green Valley Apartments' 
  AND bbp.block_name = 'North Tower'
ON CONFLICT (block_id, flat_number) DO NOTHING;

-- Flats for Green Valley - South Tower
INSERT INTO flat_numbers (block_id, flat_number)
SELECT 
  bbp.id,
  flat_data.num
FROM buildings_blocks_phases bbp
JOIN apartments a ON a.id = bbp.apartment_id
CROSS JOIN (
  VALUES ('S-101'), ('S-102'), ('S-103'), ('S-104'),
         ('S-201'), ('S-202'), ('S-203'), ('S-204'),
         ('S-301'), ('S-302'), ('S-303'), ('S-304')
) AS flat_data(num)
WHERE a.apartment_name = 'Green Valley Apartments' 
  AND bbp.block_name = 'South Tower'
ON CONFLICT (block_id, flat_number) DO NOTHING;

-- Flats for Downtown Residences - Phase 1
INSERT INTO flat_numbers (block_id, flat_number)
SELECT 
  bbp.id,
  flat_data.num
FROM buildings_blocks_phases bbp
JOIN apartments a ON a.id = bbp.apartment_id
CROSS JOIN (
  VALUES ('P1-101'), ('P1-102'), ('P1-103'), ('P1-104'),
         ('P1-201'), ('P1-202'), ('P1-203'), ('P1-204')
) AS flat_data(num)
WHERE a.apartment_name = 'Downtown Residences' 
  AND bbp.block_name = 'Phase 1'
ON CONFLICT (block_id, flat_number) DO NOTHING;

-- Flats for Downtown Residences - Phase 2
INSERT INTO flat_numbers (block_id, flat_number)
SELECT 
  bbp.id,
  flat_data.num
FROM buildings_blocks_phases bbp
JOIN apartments a ON a.id = bbp.apartment_id
CROSS JOIN (
  VALUES ('P2-101'), ('P2-102'), ('P2-103'), ('P2-104'),
         ('P2-201'), ('P2-202'), ('P2-203'), ('P2-204')
) AS flat_data(num)
WHERE a.apartment_name = 'Downtown Residences' 
  AND bbp.block_name = 'Phase 2'
ON CONFLICT (block_id, flat_number) DO NOTHING;

-- Flats for Downtown Residences - Phase 3
INSERT INTO flat_numbers (block_id, flat_number)
SELECT 
  bbp.id,
  flat_data.num
FROM buildings_blocks_phases bbp
JOIN apartments a ON a.id = bbp.apartment_id
CROSS JOIN (
  VALUES ('P3-101'), ('P3-102'), ('P3-103'), ('P3-104'),
         ('P3-201'), ('P3-202'), ('P3-203'), ('P3-204')
) AS flat_data(num)
WHERE a.apartment_name = 'Downtown Residences' 
  AND bbp.block_name = 'Phase 3'
ON CONFLICT (block_id, flat_number) DO NOTHING;

-- ============================================================================
-- 4. INFORMATION NOTICE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'Sample Data Created Successfully!';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Created Apartments:';
  RAISE NOTICE '  1. Sunrise Heights (3 blocks, 32 flats)';
  RAISE NOTICE '  2. Green Valley Apartments (2 towers, 24 flats)';
  RAISE NOTICE '  3. Downtown Residences (3 phases, 24 flats)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Create auth users in Supabase Dashboard (Authentication > Users)';
  RAISE NOTICE '  2. Use CREATE_ADMIN_GUIDE.md for instructions';
  RAISE NOTICE '  3. Create Super Admin user';
  RAISE NOTICE '  4. Create Apartment Admin users for each apartment';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
END $$;