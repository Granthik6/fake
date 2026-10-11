import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MaintenanceAPI } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { pillClass, money } from './fmUtils';
import ActionMenu from './ActionMenu';
import { useLiveSync } from '../../hooks/useLiveSync';

export default function FmMaintenance() {
  usePageHeader('Maintenance Management', 'Schedule and track vehicle maintenance');
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  async function draw() {
    try {
      const data = await MaintenanceAPI.getAll(search);
      setRows(data || []);
      setError(false);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  }

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useLiveSync(draw);

  async function del(id) {
    if (!confirm(`Delete maintenance record ${id}?`)) return;
    await MaintenanceAPI.delete(id);
    showToast('Maintenance deleted');
    draw();
  }

  return (
    <>
      <div className="toolbar">
        <label className="search-sm">
          <span>⌕</span>
          <input placeholder="Search maintenance..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <Link className="btn btn-yellow" to="/fleet-manager/schedule-maintenance">
          ＋ Schedule Maintenance
        </Link>
      </div>
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehicle</th>
              <th>Issue</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Scheduled Date</th>
              <th>Mechanic</th>
              <th>Est. Cost</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#ff8d8d', padding: 18 }}>
                  Failed to load maintenance from backend.
                </td>
              </tr>
            ) : rows === null ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#888', padding: 18 }}>
                  Loading maintenance...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: '#888', padding: 18 }}>
                  No maintenance records found
                </td>
              </tr>
            ) : (
              rows.map((m) => (
                <tr key={m.id}>
                  <td className="em">{m.id}</td>
                  <td>{m.vehicle}</td>
                  <td>{m.issue}</td>
                  <td>
                    <span className={`pill ${pillClass(m.priority)}`}>{m.priority}</span>
                  </td>
                  <td>
                    <span className={`pill ${pillClass(m.status)}`}>{m.status || 'Scheduled'}</span>
                  </td>
                  <td>{m.date}</td>
                  <td>{m.mechanic}</td>
                  <td className="em">{money(m.cost)}</td>
                  <td>
                    <ActionMenu>
                      <Link className="btn btn-small btn-ghost" to={`/fleet-manager/schedule-maintenance?id=${encodeURIComponent(m.id)}`}>
                        Edit
                      </Link>
                      <button className="btn btn-small btn-ghost" onClick={() => del(m.id)}>
                        Delete
                      </button>
                    </ActionMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
