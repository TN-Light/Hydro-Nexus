-- =======================================================================
-- QBM-HydroNet Database Migration
-- Quantum-Bio-Mycorrhizal Hydroponic Network
-- Adds PAW application logging, GDD tracking, quality certificates,
-- CMN cartridge management, and bioactive index tracking.
-- Run this AFTER the existing schema-updated.sql
-- =======================================================================

-- -----------------------------------------------------------------------
-- 1. Update crop_types table with QBM-specific fields
-- -----------------------------------------------------------------------

ALTER TABLE crop_types
  ADD COLUMN IF NOT EXISTS scientific_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bioactive_type VARCHAR(20) CHECK (bioactive_type IN ('curcumin', 'capsaicin')),
  ADD COLUMN IF NOT EXISTS bioactive_target TEXT,
  ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS exclusion_reason TEXT,
  -- Phosphorus restriction (QBM forced-symbiosis protocol)
  ADD COLUMN IF NOT EXISTS phosphorus_ppm_min INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS phosphorus_ppm_max INTEGER DEFAULT 60,
  -- LED spectrum
  ADD COLUMN IF NOT EXISTS led_red_nm INTEGER DEFAULT 660,
  ADD COLUMN IF NOT EXISTS led_blue_nm INTEGER DEFAULT 450,
  ADD COLUMN IF NOT EXISTS led_red_blue_ratio VARCHAR(10) DEFAULT '2:1',
  ADD COLUMN IF NOT EXISTS led_ppfd_min INTEGER DEFAULT 200,
  ADD COLUMN IF NOT EXISTS led_ppfd_max INTEGER DEFAULT 300,
  -- GDD profile
  ADD COLUMN IF NOT EXISTS gdd_base_temp_c DECIMAL(4,1) DEFAULT 10.0,
  ADD COLUMN IF NOT EXISTS gdd_target_min INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS gdd_target_max INTEGER DEFAULT 2000,
  -- PAW protocol
  ADD COLUMN IF NOT EXISTS paw_activation_weeks_before_harvest INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS paw_h2o2_min_um INTEGER DEFAULT 20,
  ADD COLUMN IF NOT EXISTS paw_h2o2_max_um INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS paw_applications_per_week INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS paw_volume_percent_min INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS paw_volume_percent_max INTEGER DEFAULT 10,
  -- Cycle
  ADD COLUMN IF NOT EXISTS total_cycle_days_min INTEGER,
  ADD COLUMN IF NOT EXISTS total_cycle_days_max INTEGER,
  ADD COLUMN IF NOT EXISTS commercial_note TEXT;

-- -----------------------------------------------------------------------
-- 2. Seed the four approved QBM crops into crop_types
-- -----------------------------------------------------------------------

INSERT INTO crop_types (
  name, scientific_name, bioactive_type, bioactive_target, approved,
  optimal_ph_min, optimal_ph_max,
  optimal_ec_min, optimal_ec_max,
  optimal_temp_min, optimal_temp_max,
  optimal_humidity_min, optimal_humidity_max,
  optimal_substrate_moisture_min, optimal_substrate_moisture_max,
  phosphorus_ppm_min, phosphorus_ppm_max,
  led_red_nm, led_blue_nm, led_red_blue_ratio, led_ppfd_min, led_ppfd_max,
  gdd_base_temp_c, gdd_target_min, gdd_target_max,
  paw_activation_weeks_before_harvest, paw_h2o2_min_um, paw_h2o2_max_um,
  paw_applications_per_week, paw_volume_percent_min, paw_volume_percent_max,
  total_cycle_days_min, total_cycle_days_max,
  commercial_note
)
VALUES
(
  'High-Curcumin Turmeric', 'Curcuma longa', 'curcumin', '≥5% curcumin DW', TRUE,
  5.5, 6.5, 1.8, 2.4, 24.0, 30.0, 70, 80, 60, 80,
  40, 60, 660, 450, '1:1', 200, 300,
  10.0, 1500, 2000, 3, 20, 40, 2, 5, 8,
  210, 270,
  'Pharmaceutical-grade ≥5% curcumin commands $40–120/kg vs $2–5/kg commercial.'
),
(
  'Bhut Jolokia (Ghost Pepper)', 'Capsicum chinense × frutescens', 'capsaicin', '>1,000,000 SHU', TRUE,
  6.0, 6.8, 2.0, 2.8, 26.0, 32.0, 65, 75, 55, 80,
  40, 60, 660, 450, '2:1', 250, 350,
  10.0, 1200, 1800, 3, 30, 50, 2, 5, 10,
  180, 240,
  'Pharmaceutical Bhut Jolokia (>1M SHU) sells for $150–500/kg dry.'
),
(
  'Aji Charapita', 'Capsicum chinense', 'capsaicin', '~300,000 SHU', TRUE,
  5.8, 6.5, 1.6, 2.2, 24.0, 30.0, 65, 75, 55, 80,
  40, 60, 660, 450, '2:1', 220, 320,
  10.0, 1100, 1500, 2, 20, 40, 2, 5, 8,
  160, 200,
  'World''s most expensive chili. Premium extract: $500–2,000/kg dried.'
),
(
  'Kanthari Chili', 'Capsicum frutescens', 'capsaicin', '~100,000 SHU', TRUE,
  5.8, 6.5, 1.5, 2.0, 22.0, 30.0, 65, 80, 60, 80,
  40, 60, 660, 450, '2:1', 200, 280,
  10.0, 1000, 1400, 2, 20, 40, 2, 5, 8,
  150, 190,
  'Strong South Asian pharmaceutical demand. Ayurvedic extract buyers pay $80–250/kg.'
)
ON CONFLICT (name) DO UPDATE SET
  scientific_name = EXCLUDED.scientific_name,
  bioactive_type = EXCLUDED.bioactive_type,
  bioactive_target = EXCLUDED.bioactive_target,
  optimal_ph_min = EXCLUDED.optimal_ph_min,
  optimal_ph_max = EXCLUDED.optimal_ph_max,
  optimal_ec_min = EXCLUDED.optimal_ec_min,
  optimal_ec_max = EXCLUDED.optimal_ec_max,
  optimal_temp_min = EXCLUDED.optimal_temp_min,
  optimal_temp_max = EXCLUDED.optimal_temp_max,
  phosphorus_ppm_min = EXCLUDED.phosphorus_ppm_min,
  phosphorus_ppm_max = EXCLUDED.phosphorus_ppm_max,
  led_red_blue_ratio = EXCLUDED.led_red_blue_ratio,
  paw_h2o2_max_um = EXCLUDED.paw_h2o2_max_um,
  updated_at = CURRENT_TIMESTAMP;

-- -----------------------------------------------------------------------
-- 3. Add devices table QBM-specific columns
-- -----------------------------------------------------------------------

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS growth_stage VARCHAR(30) DEFAULT 'vegetative'
    CHECK (growth_stage IN ('germination','vegetative','symbiosis_establishment','stress_induction','harvest_ready')),
  ADD COLUMN IF NOT EXISTS planting_date DATE,
  ADD COLUMN IF NOT EXISTS expected_harvest_date DATE,
  ADD COLUMN IF NOT EXISTS paw_active BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS led_red_blue_ratio VARCHAR(10),
  ADD COLUMN IF NOT EXISTS led_ppfd_setpoint INTEGER,
  ADD COLUMN IF NOT EXISTS accumulated_gdd DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bioactive_index DECIMAL(5,2) DEFAULT 0; -- 0–100 score

-- -----------------------------------------------------------------------
-- 4. PAW Application Log
--    Tracks every Plasma-Activated Water dose for Quality Certificate
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS paw_applications (
  paw_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id      VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  applied_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Concentration
  h2o2_concentration_um  DECIMAL(6,2) NOT NULL CHECK (h2o2_concentration_um BETWEEN 0 AND 200),
  -- Volume as % of total irrigation that session
  irrigation_volume_percent  DECIMAL(5,2) NOT NULL CHECK (irrigation_volume_percent BETWEEN 0 AND 100),
  -- Week in cycle (used in Quality Certificate)
  week_number    INTEGER,
  -- Days before harvest this application occurred (calculated at harvest)
  days_before_harvest  INTEGER,
  -- Qualitative notes
  notes          TEXT,
  -- Was AMF network confirmed alive at time of application?
  amf_network_confirmed_alive  BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_paw_applications_device_time
  ON paw_applications(device_id, applied_at);

-- -----------------------------------------------------------------------
-- 5. Growing Degree Day Log
--    Daily GDD accumulation per device for harvest prediction
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS gdd_log (
  gdd_id         BIGSERIAL PRIMARY KEY,
  device_id      VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  log_date       DATE NOT NULL,
  -- Temperature readings for that day
  max_temp_c     DECIMAL(4,1) NOT NULL,
  min_temp_c     DECIMAL(4,1) NOT NULL,
  avg_temp_c     DECIMAL(4,1) NOT NULL,
  -- GDD for this day only
  daily_gdd      DECIMAL(6,2) NOT NULL,
  -- Running total from planting date
  accumulated_gdd  DECIMAL(8,2) NOT NULL,
  -- GDD target from crop profile
  gdd_target     INTEGER,
  -- % progress toward target
  progress_percent  DECIMAL(5,2),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(device_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_gdd_log_device_date
  ON gdd_log(device_id, log_date);

-- -----------------------------------------------------------------------
-- 6. Bioactive Index Log
--    Tracks estimated curcumin/capsaicin accumulation index over time
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bioactive_index_log (
  log_id         BIGSERIAL PRIMARY KEY,
  device_id      VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  recorded_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Index score 0–100 (calculated from stress days + PAW count + GDD progress + P compliance)
  bioactive_index  DECIMAL(5,2) NOT NULL CHECK (bioactive_index BETWEEN 0 AND 100),
  -- Contributing factors stored for traceability
  stress_days_active  INTEGER DEFAULT 0,
  paw_applications_count  INTEGER DEFAULT 0,
  gdd_progress_percent  DECIMAL(5,2) DEFAULT 0,
  p_compliant_days  INTEGER DEFAULT 0,  -- days P was in 40–60 ppm range
  -- Estimated potency based on index
  estimated_curcumin_percent  DECIMAL(5,3), -- % DW (turmeric only)
  estimated_capsaicin_shu     INTEGER,      -- SHU estimate (chili only)
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bioactive_log_device_time
  ON bioactive_index_log(device_id, recorded_at);

-- -----------------------------------------------------------------------
-- 7. Quality Certificates
--    Auto-generated at harvest. Verifiable chain-of-custody for buyers.
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quality_certificates (
  cert_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Batch info
  device_id      VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  lot_number     VARCHAR(50) UNIQUE NOT NULL,
  crop_id        INTEGER REFERENCES crop_types(crop_id),
  -- Dates
  planting_date  DATE,
  harvest_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  cycle_days     INTEGER,
  -- Environmental summary
  accumulated_gdd        DECIMAL(8,2),
  avg_ec_during_cycle    DECIMAL(4,2),
  avg_ph_during_cycle    DECIMAL(4,2),
  ec_compliance_percent  DECIMAL(5,2), -- % of time EC was in target range
  ph_compliance_percent  DECIMAL(5,2),
  p_restriction_compliant  BOOLEAN DEFAULT TRUE,
  -- PAW protocol summary (from paw_applications table)
  total_paw_applications  INTEGER DEFAULT 0,
  avg_h2o2_concentration_um  DECIMAL(6,2),
  paw_start_date         DATE,
  -- LED spectrum data (manually entered or from device settings)
  led_spectrum_hours_red   INTEGER,
  led_spectrum_hours_blue  INTEGER,
  avg_ppfd_umol           INTEGER,
  -- Bioactive results
  final_bioactive_index  DECIMAL(5,2),
  estimated_curcumin_percent  DECIMAL(5,3),  -- % DW (turmeric only)
  estimated_capsaicin_shu     INTEGER,        -- SHU (chili only)
  -- For verified lab results (if grower submits HPLC/enzymatic test)
  lab_verified           BOOLEAN DEFAULT FALSE,
  lab_curcumin_percent   DECIMAL(5,3),
  lab_capsaicin_shu      INTEGER,
  lab_test_date          DATE,
  lab_report_url         TEXT,
  -- Full data snapshot (JSON blob for certificate generation)
  full_data_snapshot     JSONB,
  -- Certificate status
  status  VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'revoked')),
  -- Timestamps
  generated_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  finalized_at   TIMESTAMP WITH TIME ZONE,
  notes          TEXT
);

CREATE INDEX IF NOT EXISTS idx_quality_certs_device
  ON quality_certificates(device_id, harvest_date);

CREATE INDEX IF NOT EXISTS idx_quality_certs_lot
  ON quality_certificates(lot_number);

-- -----------------------------------------------------------------------
-- 8. Manual Measurements Log
--    For grower-logged data that isn't automated (P ppm, PPFD, disease)
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS manual_measurements (
  measurement_id  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id       VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(user_id) ON DELETE SET NULL,
  measured_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  measurement_type  VARCHAR(50) NOT NULL CHECK (measurement_type IN (
    'phosphorus_ppm',
    'light_ppfd',
    'cmn_cartridge_inspection',
    'disease_scouting',
    'amf_hyphae_activity',
    'harvest_sample',
    'other'
  )),
  -- Numeric value (for phosphorus_ppm, light_ppfd, etc.)
  numeric_value   DECIMAL(10,3),
  unit            VARCHAR(20),
  -- Text result (for disease_scouting, cmn_cartridge_inspection)
  text_result     TEXT,
  -- Structured result (for harvest samples)
  structured_data JSONB,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_manual_measurements_device_type
  ON manual_measurements(device_id, measurement_type, measured_at);

-- -----------------------------------------------------------------------
-- 9. Stress Protocol Events
--    Log all stress-induction events (PAW activation window, humidity drops)
-- -----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stress_events (
  event_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id      VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  event_type     VARCHAR(50) NOT NULL CHECK (event_type IN (
    'paw_protocol_start',
    'paw_protocol_end',
    'humidity_reduction',
    'led_spectrum_change',
    'growth_stage_change',
    'p_restriction_alert',
    'amf_status_change'
  )),
  occurred_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- Before/after values for tracking changes
  previous_value TEXT,
  new_value      TEXT,
  notes          TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stress_events_device_time
  ON stress_events(device_id, occurred_at);

-- -----------------------------------------------------------------------
-- 10. Populate default device_settings.parameter_thresholds with
--     QBM crop-specific defaults (phosphorus restriction included)
-- -----------------------------------------------------------------------

UPDATE device_settings
SET parameter_thresholds = jsonb_set(
  parameter_thresholds,
  '{phosphorus}',
  '{"min": 40, "max": 60}'::jsonb
)
WHERE parameter_thresholds IS NOT NULL
  AND NOT (parameter_thresholds ? 'phosphorus');

-- -----------------------------------------------------------------------
-- Done
-- -----------------------------------------------------------------------
-- Tables created:
--   paw_applications        — PAW dose log (feeds Quality Certificate)
--   gdd_log                 — Daily GDD accumulation per device
--   bioactive_index_log     — Estimated curcumin/capsaicin index over time
--   quality_certificates    — Harvest-time verifiable batch certificate
--   manual_measurements     — Grower-entered data (P ppm, PPFD, scouting)
--   stress_events           — Timeline of all stress protocol activations
--
-- Tables modified:
--   crop_types              — Added QBM bioactive, LED, PAW, GDD columns
--   devices                 — Added growth_stage, GDD, bioactive index columns
--   device_settings         — Added phosphorus threshold default
-- =======================================================================
