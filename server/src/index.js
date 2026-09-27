import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { pool } from './db.js';
import { issueToken, requireAuth } from './auth.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

const SHARED_PASSWORD = process.env.SHARED_PASSWORD || 'changeme';

function patientRowToJson(row) {
  return {
    id: row.id,
    identifier: row.identifier,
    gaWeeks: row.ga_weeks,
    gaDays: row.ga_days,
    birthDate: row.birth_date,
    birthWeightGrams: row.birth_weight_grams,
    status: row.status,
    note: row.note,
    edc: row.edc,
    gpa: row.gpa,
    deliveryMethod: row.delivery_method,
    apgar1min: row.apgar_1min,
    apgar5min: row.apgar_5min,
    ropRiskPressor: row.rop_risk_pressor,
    ropRiskO2ThreeDays: row.rop_risk_o2_3days,
    ropRiskO2Unmonitored: row.rop_risk_o2_unmonitored,
    synagisCld: row.synagis_cld,
    synagisCardiac: row.synagis_cardiac,
    diagnosis: row.diagnosis,
    dataSummary: row.data_summary,
    managementSummary: row.management_summary,
    coursePlanSummary: row.course_plan_summary,
    birthHistoryNote: row.birth_history_note,
    chartNumber: row.chart_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function logRowToJson(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    logDate: row.log_date,
    weightGrams: row.weight_grams,
    tdfMlKgDay: row.tdf_ml_kg_day,
    feedingMl: row.feeding_ml,
    note: row.note,
    createdAt: row.created_at,
  };
}

function roundRowToJson(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    recordDate: row.record_date,
    weightGrams: row.weight_grams,
    respMode: row.resp_mode,
    respNote: row.resp_note,
    feedingRoute: row.feeding_route,
    feedingMode: row.feeding_mode,
    feedingTypeA: row.feeding_type_a,
    feedingTypeB: row.feeding_type_b,
    feedingSplitA: row.feeding_split_a,
    feedingSplitB: row.feeding_split_b,
    feedingVolPerFeed: row.feeding_vol_per_feed,
    feedingFrequency: row.feeding_frequency,
    tdfOrdered: row.tdf_ordered,
    tpnActive: row.tpn_active,
    diagnosis: row.diagnosis,
    labs: row.labs,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function lineRowToJson(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    lineType: row.line_type,
    site: row.site,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

function vaccineRowToJson(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    vaccineType: row.vaccine_type,
    eventDate: row.event_date,
    doseNumber: row.dose_number,
  };
}

// ---- auth ----
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== SHARED_PASSWORD) {
    return res.status(401).json({ error: '密碼錯誤' });
  }
  res.json({ token: issueToken() });
});

app.use('/api/patients', requireAuth);
app.use('/api/lines', requireAuth);
app.use('/api/vaccine-events', requireAuth);

// ---- patients ----
app.get('/api/patients', async (req, res, next) => {
  try {
    const status = req.query.status;
    const { rows } = status
      ? await pool.query('SELECT * FROM patients WHERE status = $1 ORDER BY created_at DESC', [status])
      : await pool.query('SELECT * FROM patients ORDER BY created_at DESC');

    const ids = rows.map((r) => r.id);
    let latestByPatient = {};
    if (ids.length) {
      const { rows: logRows } = await pool.query(
        `SELECT DISTINCT ON (patient_id) * FROM rounds_records WHERE patient_id = ANY($1) ORDER BY patient_id, record_date DESC`,
        [ids]
      );
      latestByPatient = Object.fromEntries(logRows.map((r) => [r.patient_id, roundRowToJson(r)]));
    }

    res.json(rows.map((r) => ({ ...patientRowToJson(r), latestRound: latestByPatient[r.id] || null })));
  } catch (e) {
    next(e);
  }
});

const CREATE_FIELD_MAP = {
  identifier: 'identifier',
  ga_weeks: 'gaWeeks',
  ga_days: 'gaDays',
  birth_date: 'birthDate',
  birth_weight_grams: 'birthWeightGrams',
  note: 'note',
  edc: 'edc',
  gpa: 'gpa',
  delivery_method: 'deliveryMethod',
  apgar_1min: 'apgar1min',
  apgar_5min: 'apgar5min',
  rop_risk_pressor: 'ropRiskPressor',
  rop_risk_o2_3days: 'ropRiskO2ThreeDays',
  rop_risk_o2_unmonitored: 'ropRiskO2Unmonitored',
  synagis_cld: 'synagisCld',
  synagis_cardiac: 'synagisCardiac',
  diagnosis: 'diagnosis',
  data_summary: 'dataSummary',
  management_summary: 'managementSummary',
  course_plan_summary: 'coursePlanSummary',
  birth_history_note: 'birthHistoryNote',
  chart_number: 'chartNumber',
};
const NUMERIC_COLS = ['ga_weeks', 'ga_days', 'birth_weight_grams', 'apgar_1min', 'apgar_5min'];
const DATE_COLS = ['birth_date', 'edc'];
const BOOL_COLS = ['rop_risk_pressor', 'rop_risk_o2_3days', 'rop_risk_o2_unmonitored', 'synagis_cld', 'synagis_cardiac'];

app.post('/api/patients', async (req, res, next) => {
  try {
    const { identifier, gaWeeks, birthDate, birthWeightGrams } = req.body || {};
    if (!identifier || gaWeeks == null || !birthDate || birthWeightGrams == null) {
      return res.status(400).json({ error: '缺少必要欄位 (identifier, gaWeeks, birthDate, birthWeightGrams)' });
    }
    const cols = ['id'];
    const placeholders = ['$1'];
    const values = [randomUUID()];
    let i = 2;
    for (const [col, key] of Object.entries(CREATE_FIELD_MAP)) {
      if (req.body?.[key] !== undefined && req.body[key] !== '') {
        let v = req.body[key];
        if (DATE_COLS.includes(col)) v = new Date(v);
        if (NUMERIC_COLS.includes(col)) v = Number(v);
        if (BOOL_COLS.includes(col)) v = Boolean(v);
        cols.push(col);
        placeholders.push(`$${i}`);
        values.push(v);
        i++;
      }
    }
    const { rows } = await pool.query(
      `INSERT INTO patients (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    res.status(201).json(patientRowToJson(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.get('/api/patients/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM patients WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '找不到病人' });
    const { rows: logRows } = await pool.query(
      'SELECT * FROM daily_logs WHERE patient_id = $1 ORDER BY log_date DESC',
      [req.params.id]
    );
    const { rows: roundRows } = await pool.query(
      'SELECT * FROM rounds_records WHERE patient_id = $1 ORDER BY record_date DESC',
      [req.params.id]
    );
    const { rows: lineRows } = await pool.query(
      'SELECT * FROM lines WHERE patient_id = $1 ORDER BY start_date DESC',
      [req.params.id]
    );
    const { rows: vaccineRows } = await pool.query(
      'SELECT * FROM vaccine_events WHERE patient_id = $1 ORDER BY event_date ASC',
      [req.params.id]
    );
    res.json({
      ...patientRowToJson(rows[0]),
      logs: logRows.map(logRowToJson),
      rounds: roundRows.map(roundRowToJson),
      lines: lineRows.map(lineRowToJson),
      vaccineEvents: vaccineRows.map(vaccineRowToJson),
    });
  } catch (e) {
    next(e);
  }
});

app.patch('/api/patients/:id', async (req, res, next) => {
  try {
    const fields = { identifier: 'identifier', status: 'status', ...CREATE_FIELD_MAP };
    const sets = [];
    const values = [];
    let i = 1;
    for (const [col, key] of Object.entries(fields)) {
      if (req.body?.[key] !== undefined) {
        let v = req.body[key];
        if (v === '') v = null;
        else if (DATE_COLS.includes(col)) v = new Date(v);
        else if (NUMERIC_COLS.includes(col)) v = Number(v);
        else if (BOOL_COLS.includes(col)) v = Boolean(v);
        sets.push(`${col} = $${i}`);
        values.push(v);
        i++;
      }
    }
    if (!sets.length) return res.status(400).json({ error: '沒有可更新的欄位' });
    sets.push(`updated_at = now()`);
    values.push(req.params.id);
    const { rows } = await pool.query(
      `UPDATE patients SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: '找不到病人' });
    res.json(patientRowToJson(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.delete('/api/patients/:id', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM patients WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: '找不到病人' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ---- daily logs (legacy simple tracking, kept for backward compatibility) ----
app.post('/api/patients/:id/logs', async (req, res, next) => {
  try {
    const { logDate, weightGrams, tdfMlKgDay, feedingMl, note } = req.body || {};
    if (!logDate) return res.status(400).json({ error: '缺少 logDate' });
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO daily_logs (id, patient_id, log_date, weight_grams, tdf_ml_kg_day, feeding_ml, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        id,
        req.params.id,
        new Date(logDate),
        weightGrams != null ? Number(weightGrams) : null,
        tdfMlKgDay != null ? Number(tdfMlKgDay) : null,
        feedingMl != null ? Number(feedingMl) : null,
        note || null,
      ]
    );
    res.status(201).json(logRowToJson(rows[0]));
  } catch (e) {
    if (e.code === '23503') return res.status(400).json({ error: '找不到對應的病人' });
    next(e);
  }
});

app.delete('/api/logs/:logId', requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM daily_logs WHERE id = $1', [req.params.logId]);
    if (!rowCount) return res.status(404).json({ error: '找不到紀錄' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ---- rounds records (查房指引 daily entry, upsert by patient+date) ----
const ROUND_FIELD_MAP = {
  weight_grams: 'weightGrams',
  resp_mode: 'respMode',
  resp_note: 'respNote',
  feeding_route: 'feedingRoute',
  feeding_mode: 'feedingMode',
  feeding_type_a: 'feedingTypeA',
  feeding_type_b: 'feedingTypeB',
  feeding_split_a: 'feedingSplitA',
  feeding_split_b: 'feedingSplitB',
  feeding_vol_per_feed: 'feedingVolPerFeed',
  feeding_frequency: 'feedingFrequency',
  tdf_ordered: 'tdfOrdered',
  tpn_active: 'tpnActive',
  diagnosis: 'diagnosis',
  labs: 'labs',
  note: 'note',
};
const ROUND_NUMERIC = ['weight_grams', 'feeding_split_a', 'feeding_split_b', 'feeding_vol_per_feed', 'tdf_ordered'];
const ROUND_BOOL = ['tpn_active'];

app.put('/api/patients/:id/rounds/:date', async (req, res, next) => {
  try {
    const cols = ['id', 'patient_id', 'record_date'];
    const placeholders = ['$1', '$2', '$3'];
    const values = [randomUUID(), req.params.id, req.params.date];
    const updateSets = [];
    let i = 4;
    for (const [col, key] of Object.entries(ROUND_FIELD_MAP)) {
      if (req.body?.[key] !== undefined) {
        let v = req.body[key];
        if (v === '') v = null;
        else if (ROUND_NUMERIC.includes(col) && v != null) v = Number(v);
        else if (ROUND_BOOL.includes(col)) v = Boolean(v);
        cols.push(col);
        placeholders.push(`$${i}`);
        values.push(v);
        updateSets.push(`${col} = EXCLUDED.${col}`);
        i++;
      }
    }
    updateSets.push('updated_at = now()');
    const { rows } = await pool.query(
      `INSERT INTO rounds_records (${cols.join(', ')}) VALUES (${placeholders.join(', ')})
       ON CONFLICT (patient_id, record_date) DO UPDATE SET ${updateSets.join(', ')}
       RETURNING *`,
      values
    );
    res.status(200).json(roundRowToJson(rows[0]));
  } catch (e) {
    if (e.code === '23503') return res.status(400).json({ error: '找不到對應的病人' });
    next(e);
  }
});

// ---- lines ----
app.post('/api/patients/:id/lines', async (req, res, next) => {
  try {
    const { lineType, site, startDate } = req.body || {};
    if (!lineType || !startDate) return res.status(400).json({ error: '缺少 lineType 或 startDate' });
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO lines (id, patient_id, line_type, site, start_date) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, req.params.id, lineType, site || null, startDate]
    );
    res.status(201).json(lineRowToJson(rows[0]));
  } catch (e) {
    if (e.code === '23503') return res.status(400).json({ error: '找不到對應的病人' });
    next(e);
  }
});

app.patch('/api/lines/:lineId', async (req, res, next) => {
  try {
    const { endDate } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE lines SET end_date = $1 WHERE id = $2 RETURNING *`,
      [endDate || null, req.params.lineId]
    );
    if (!rows.length) return res.status(404).json({ error: '找不到管路紀錄' });
    res.json(lineRowToJson(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.delete('/api/lines/:lineId', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM lines WHERE id = $1', [req.params.lineId]);
    if (!rowCount) return res.status(404).json({ error: '找不到管路紀錄' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

// ---- vaccine / synagis events ----
app.post('/api/patients/:id/vaccine-events', async (req, res, next) => {
  try {
    const { vaccineType, eventDate, doseNumber } = req.body || {};
    if (!vaccineType || !eventDate) return res.status(400).json({ error: '缺少 vaccineType 或 eventDate' });
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO vaccine_events (id, patient_id, vaccine_type, event_date, dose_number) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, req.params.id, vaccineType, eventDate, doseNumber != null ? Number(doseNumber) : null]
    );
    res.status(201).json(vaccineRowToJson(rows[0]));
  } catch (e) {
    if (e.code === '23503') return res.status(400).json({ error: '找不到對應的病人' });
    next(e);
  }
});

app.delete('/api/vaccine-events/:eventId', async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM vaccine_events WHERE id = $1', [req.params.eventId]);
    if (!rowCount) return res.status(404).json({ error: '找不到紀錄' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器錯誤' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`NB clinical app server listening on :${port}`));
