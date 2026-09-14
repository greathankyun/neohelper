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

// ---- auth ----
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (password !== SHARED_PASSWORD) {
    return res.status(401).json({ error: '密碼錯誤' });
  }
  res.json({ token: issueToken() });
});

app.use('/api/patients', requireAuth);

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
        `SELECT DISTINCT ON (patient_id) * FROM daily_logs WHERE patient_id = ANY($1) ORDER BY patient_id, log_date DESC`,
        [ids]
      );
      latestByPatient = Object.fromEntries(logRows.map((r) => [r.patient_id, logRowToJson(r)]));
    }

    res.json(rows.map((r) => ({ ...patientRowToJson(r), latestLog: latestByPatient[r.id] || null })));
  } catch (e) {
    next(e);
  }
});

app.post('/api/patients', async (req, res, next) => {
  try {
    const { identifier, gaWeeks, gaDays, birthDate, birthWeightGrams, note } = req.body || {};
    if (!identifier || gaWeeks == null || !birthDate || birthWeightGrams == null) {
      return res.status(400).json({ error: '缺少必要欄位 (identifier, gaWeeks, birthDate, birthWeightGrams)' });
    }
    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO patients (id, identifier, ga_weeks, ga_days, birth_date, birth_weight_grams, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, identifier, Number(gaWeeks), Number(gaDays || 0), new Date(birthDate), Number(birthWeightGrams), note || null]
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
    res.json({ ...patientRowToJson(rows[0]), logs: logRows.map(logRowToJson) });
  } catch (e) {
    next(e);
  }
});

app.patch('/api/patients/:id', async (req, res, next) => {
  try {
    const fields = { identifier: 'identifier', status: 'status', note: 'note', ga_weeks: 'gaWeeks', ga_days: 'gaDays', birth_weight_grams: 'birthWeightGrams', birth_date: 'birthDate' };
    const sets = [];
    const values = [];
    let i = 1;
    for (const [col, key] of Object.entries(fields)) {
      if (req.body?.[key] !== undefined) {
        let v = req.body[key];
        if (col === 'birth_date') v = new Date(v);
        if (['ga_weeks', 'ga_days', 'birth_weight_grams'].includes(col)) v = Number(v);
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

// ---- daily logs ----
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

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器錯誤' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`NB clinical app server listening on :${port}`));
