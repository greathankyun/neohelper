import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPatients, getPatient } from '../api';
import { useAuth } from './AuthContext';
import HandoffCard from './HandoffCard';

export default function HandoffOverview() {
  const { onUnauthorized } = useAuth();
  const [patients, setPatients] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const list = await listPatients('active');
      const details = await Promise.all(list.map((p) => getPatient(p.id)));
      setPatients(details);
    } catch (e) {
      if (e.status === 401) onUnauthorized();
      else setError(e.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">交班總表</h1>
        <Link to="/patients" className="text-xs text-ink/50 underline">
          回病人列表
        </Link>
      </div>

      {error && <div className="text-sm text-alert mb-3">{error}</div>}
      {patients === null && <div className="text-sm text-ink/50">載入中…</div>}
      {patients?.length === 0 && <div className="text-sm text-ink/50">目前沒有在院病人</div>}

      <div className="space-y-3">
        {patients?.map((p) => (
          <HandoffCard key={p.id} patient={p} rounds={p.rounds} onChanged={load} />
        ))}
      </div>
    </div>
  );
}
