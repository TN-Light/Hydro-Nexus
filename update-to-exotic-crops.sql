-- =====================================================
-- UPDATE TO EXOTIC CROPS
-- =====================================================
-- This replaces basic crops with exotic/specialty crops
-- =====================================================

BEGIN;

-- Clear existing crops
DELETE FROM crop_types;

-- Insert exotic crops with optimal growing parameters
INSERT INTO crop_types (crop_id, name, optimal_ph_min, optimal_ph_max, optimal_ec_min, optimal_ec_max, 
                        optimal_temp_min, optimal_temp_max, optimal_humidity_min, optimal_humidity_max,
                        optimal_substrate_moisture_min, optimal_substrate_moisture_max, growing_notes)
VALUES
-- 1. Dragon Fruit (Pitaya)
(1, 'Dragon Fruit', 6.0, 7.0, 1.5, 2.5, 20, 30, 60, 80, 40, 60, 
 'Exotic cactus fruit. Requires warm temperatures and moderate humidity. Night-blooming flowers.'),

-- 2. Goji Berry (Wolfberry)
(2, 'Goji Berry', 6.5, 8.0, 1.8, 2.8, 18, 28, 50, 70, 45, 65,
 'Superfood berry with high antioxidants. Tolerates wide pH range. Prefers cooler temperatures than most tropical fruits.'),

-- 3. Thai Basil
(3, 'Thai Basil', 6.0, 7.0, 1.2, 2.0, 22, 30, 60, 75, 50, 70,
 'Aromatic herb with licorice-anise flavor. More heat-tolerant than sweet basil. Purple stems and flowers.'),

-- 4. Wasabi
(4, 'Wasabi', 6.0, 7.0, 1.0, 1.8, 8, 20, 70, 90, 60, 80,
 'Japanese horseradish. Requires cool temps, high humidity, and shade. Very challenging to grow. Premium crop.'),

-- 5. Buddha's Hand (Finger Citron)
(5, 'Buddha''s Hand', 5.5, 6.5, 2.0, 3.0, 18, 28, 50, 70, 40, 60,
 'Fingered citrus with intense fragrance. No juice/pulp. Used for zest and decoration. Prefers slightly acidic conditions.'),

-- 6. Romanesco Broccoli
(6, 'Romanesco', 6.0, 7.0, 1.8, 2.5, 15, 22, 60, 80, 55, 75,
 'Fractal-pattern vegetable, cross between broccoli and cauliflower. Prefers cool temperatures. Striking appearance.'),

-- 7. Purple Passion Fruit
(7, 'Purple Passion Fruit', 6.0, 6.5, 2.2, 3.0, 20, 30, 60, 80, 45, 65,
 'Tropical vine with aromatic fruit. Higher EC than most crops. Requires warm conditions and support structure.'),

-- 8. Shiso (Perilla)
(8, 'Shiso', 6.0, 7.0, 1.2, 2.2, 18, 28, 50, 70, 50, 70,
 'Japanese herb with minty-basil flavor. Red and green varieties. Popular in Asian cuisine. Easy to grow.');

-- Reset sequence to continue from 9
SELECT setval('crop_types_crop_id_seq', 8, true);

COMMIT;

-- Display the new crops
\echo ''
\echo '🌴 Exotic Crops Updated Successfully!'
\echo ''
SELECT crop_id, name, growing_notes FROM crop_types ORDER BY crop_id;
\echo ''
\echo '💡 To add more exotic crops, run additional INSERT statements.'
