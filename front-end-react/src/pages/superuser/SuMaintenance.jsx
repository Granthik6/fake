import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MaintenanceAPI } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { statusClass } from '../../components/Icon';
import { useLiveSync } from '../../hooks/useLiveSync';

export default function SuMaintenance() {
  usePageHeader('Maintenance');
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);

  async function load() {
    setFailed(false);
    try {
      setRows((await MaintenanceAPI.getAll(search.trim())) || []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useLiveSync(load);

  async function del(id) {
    if (!confirm(`Delete maintenance record ${id}?`)) return;
    try {
      await MaintenanceAPI.delete(id);
      showToast('Maintenance record deleted successfully');
      await load();
    } catch {
      alert('Failed to delete maintenance record');
    }
  }

  return (
    <div className="content-card table-card" onClick={() => setOpenMenu(null)}>
      <div className="table-head">
        <h3>Maintenance Management</h3>
        <div className="filters">
          <input className="mini-input" placeholder="Search maintenance..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <Link className="btn-yellow" to="/superuser/schedule-maintenance">Schedule Maintenance</Link>
        </div>
      </div>
      <table>
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
          {loading && <tr><td colSpan={9} style={{ textAlign: 'center', color: '#b9b9b9', padding: 18 }}>Loading maintenance records...</td></tr>}
          {!loading && failed && <tr><td colSpan={9} style={{ textAlign: 'center', color: '#ff6b6b', padding: 18 }}>Failed to load maintenance records.</td></tr>}
          {!loading && !failed && rows.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: '#b9b9b9', padding: 18 }}>No maintenance records found.</td></tr>}
          {!loading &&
            !failed &&
            rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id || '-'}</td>
                <td>{r.vehicle || r.vehicleId || '-'}</td>
                <td>{r.issue || '-'}</td>
                <td><span className={`status-pill ${statusClass(r.priority)}`}>{r.priority || '-'}</span></td>
                <td><span className={`status-pill ${statusClass(r.status)}`}>{r.status || '-'}</span></td>
                <td>{r.date || r.scheduledDate || '-'}</td>
                <td>{r.mechanic || '-'}</td>
                <td>{r.cost || r.estimatedCost || '-'}</td>
                <td>
                  <div className="action-menu-wrap" onClick={(e) => e.stopPropagation()}>
                    <button className="action-trigger dots-trigger" aria-label="Actions" onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}>⋯</button>
                    <div className={`action-menu ${openMenu === r.id ? 'show' : ''}`}>
                      <Link className="action-item" to={`/superuser/schedule-maintenance?id=${r.id}`}>Edit</Link>
                      <button className="action-item danger-link" onClick={() => { setOpenMenu(null); del(r.id); }}>Delete</button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
