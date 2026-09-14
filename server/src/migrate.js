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
