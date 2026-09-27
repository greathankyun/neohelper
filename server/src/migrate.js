import { pool } from './db.js';

const SQL = `
CREATE TABLE IF NOT EXISTS patients (
  id                 TEXT PRIMARY KEY,
  identifier         TEXT NOT NULL,
  ga_weeks           INTEGER NOT NULL,
  ga_days            INTEGER NOT NULL DEFAULT 0,
  birth_date         TIMESTAMPTZ NOT NULL,
  birth_weight_grams INTEGER NOT NULL,
  status             TEXT NOT NULL DEFAULT 'active',
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Birth history + risk-factor fields for 查房指引 (rounds guide)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS edc DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gpa TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS delivery_method TEXT; -- NSD/VED/CS
ALTER TABLE patients ADD COLUMN IF NOT EXISTS apgar_1min INTEGER;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS apgar_5min INTEGER;
-- ROP referral risk factors (only relevant for GA 31-34+6 & BW 1501-2000)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS rop_risk_pressor BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS rop_risk_o2_3days BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS rop_risk_o2_unmonitored BOOLEAN NOT NULL DEFAULT false;
-- Synagis eligibility checkboxes (doctor-judged, since full payer criteria involve clinical
-- details this app does not track)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS synagis_cld BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS synagis_cardiac BOOLEAN NOT NULL DEFAULT false;
-- 交班總表 (handoff summary): free-text fields the doctor maintains directly, not
-- tied to a specific day's rounds record.
ALTER TABLE patients ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS data_summary TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS management_summary TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS course_plan_summary TEXT;

CREATE TABLE IF NOT EXISTS daily_logs (
  id             TEXT PRIMARY KEY,
  patient_id     TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  log_date       TIMESTAMPTZ NOT NULL,
  weight_grams   INTEGER,
  tdf_ml_kg_day  DOUBLE PRECISION,
  feeding_ml     DOUBLE PRECISION,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_patient_date ON daily_logs (patient_id, log_date DESC);

-- 查房指引 (rounds guide): one comprehensive record per patient per day
CREATE TABLE IF NOT EXISTS rounds_records (
  id                    TEXT PRIMARY KEY,
  patient_id            TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  record_date           DATE NOT NULL,
  weight_grams          INTEGER,
  resp_mode             TEXT, -- RA/NCPAP/NIPPV/SIMV/SIMV+PS/HFOV
  resp_note             TEXT, -- e.g. "15/5,25,0.21"
  feeding_route         TEXT, -- PO/OG/PO+OG
  feeding_mode          TEXT, -- single/alternating
  feeding_type_a        TEXT,
  feeding_type_b        TEXT,
  feeding_split_a       INTEGER,
  feeding_split_b       INTEGER,
  feeding_vol_per_feed  DOUBLE PRECISION,
  feeding_frequency     TEXT, -- Q3H/Q4H
  tdf_ordered           DOUBLE PRECISION,
  tpn_active            BOOLEAN NOT NULL DEFAULT false,
  diagnosis             TEXT,
  labs                  TEXT,
  note                  TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (patient_id, record_date)
);

CREATE INDEX IF NOT EXISTS idx_rounds_records_patient_date ON rounds_records (patient_id, record_date DESC);

-- Lines (AL/PICC/UA/UV/CVC) as discrete start/remove intervals
CREATE TABLE IF NOT EXISTS lines (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  line_type   TEXT NOT NULL, -- AL/PICC/UA/UV/CVC
  site        TEXT,          -- RA/LA/RL/LL or RIJV/LIJV/RF/LF, null for UA/UV
  start_date  DATE NOT NULL,
  end_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lines_patient ON lines (patient_id);

-- Discrete dosed events: HBV doses and Synagis doses
CREATE TABLE IF NOT EXISTS vaccine_events (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  vaccine_type  TEXT NOT NULL, -- hbv1 / hbv2 / synagis
  event_date    DATE NOT NULL,
  dose_number   INTEGER,       -- for synagis: 1-6
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vaccine_events_patient ON vaccine_events (patient_id);
`;

async function main() {
  await pool.query(SQL);
  console.log('Migration complete.');
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
