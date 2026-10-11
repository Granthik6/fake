import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Drivers } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { pillClass } from './fmUtils';
import ActionMenu from './ActionMenu';
import { useLiveSync } from '../../hooks/useLiveSync';

export default function FmDrivers() {
  usePageHeader('Driver Management', 'Manage drivers and monitor performance');
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  async function draw() {
    try {
      const data = await Drivers.getAll(search);
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
    if (!confirm(`Delete driver ${id}?`)) return;
    try {
      await Drivers.delete(id);
      showToast('Driver deleted');
      draw();
    } catch (e) {
      console.error('Failed to delete driver:', e);
      alert('Failed to delete driver: ' + (e.message || 'unknown error'));
    }
  }

  async function toggleStatus(d) {
    const cur = d.status || '';
    const next = /suspend/i.test(cur) ? 'Available' : 'Suspended';
    try {
      const fresh = await Drivers.getOne(d.id);
      await Drivers.update(d.id, {
        name: fresh.name,
        phone: fresh.phone || '',
        zone: fresh.zone || '',
        vehicle: fresh.vehicle || '',
        status: next,
        license: fresh.license || '',
        email: fresh.email || '',
      });
      showToast('Driver status updated');
      draw();
    } catch (e) {
      console.error('Failed to update driver status:', e);
      alert('Failed to update driver status: ' + (e.message || 'unknown error'));
    }
  }

  return (
    <>
      <div className="toolbar">
        <label className="search-sm">
          <span>⌕</span>
          <input placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <Link className="btn btn-yellow" to="/fleet-manager/add-driver">
          ＋ Add Driver
        </Link>
      </div>
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>License Number</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Rating</th>
              <th>Last Trip</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#ff8d8d', padding: 18 }}>
                  Failed to load drivers.
                </td>
              </tr>
            ) : rows === null ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: 18 }}>
                  Loading drivers...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#888', padding: 18 }}>
                  No drivers found
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id}>
                  <td className="em">{d.name}</td>
                  <td>{d.license || '--'}</td>
                  <td>{d.phone || '--'}</td>
                  <td>
                    <span className={`pill ${pillClass(d.status)}`}>{d.status || '--'}</span>
                  </td>
                  <td>{d.rating || '--'}</td>
                  <td>{d.trip || '--'}</td>
                  <td>
                    <ActionMenu>
                      <Link to={`/fleet-manager/driver-profile?id=${encodeURIComponent(d.id)}`}>View</Link>
                      <Link to={`/fleet-manager/edit-driver?id=${encodeURIComponent(d.id)}`}>Edit</Link>
                      <button onClick={() => toggleStatus(d)}>{/suspend/i.test(d.status || '') ? 'Enable' : 'Suspend'}</button>
                      <button className="danger" onClick={() => del(d.id)}>
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
