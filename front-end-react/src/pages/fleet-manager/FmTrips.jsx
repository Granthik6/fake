import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trips, Drivers, Vehicles } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { pillClass } from './fmUtils';
import ActionMenu from './ActionMenu';
import { useLiveSync } from '../../hooks/useLiveSync';

export default function FmTrips() {
  usePageHeader('Trip Management', 'Monitor and manage all fleet trips');
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [error, setError] = useState(false);

  async function draw() {
    try {
      const [t, d, v] = await Promise.all([Trips.getAll(search), Drivers.getAll(), Vehicles.getAll()]);
      setRows(t || []);
      setDrivers(d || []);
      setVehicles(v || []);
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

  const availableDrivers = drivers.filter((d) => {
    const vehicle = vehicles.find((v) => String(v.plate || '').toLowerCase() === String(d.vehicle || '').toLowerCase());
    return /available|^active$/i.test(d.status || '') && vehicle && /^active$/i.test(vehicle.status || '');
  });

  async function reassign(tripId, driverName) {
    if (!tripId || !driverName) return;
    try {
      await Trips.reassign(tripId, driverName);
      showToast('Trip reassigned successfully');
      draw();
    } catch (e) {
      console.error('Failed to reassign trip from backend:', e);
      alert('Failed to reassign trip. Check Network response.');
    }
  }

  async function resolveDispute(id) {
    const amountText = prompt('Resolved billable amount for this delivery (₹):');
    if (amountText === null) return;
    const resolvedAmount = Number(amountText);
    if (Number.isNaN(resolvedAmount) || resolvedAmount < 0) {
      alert('Please enter a valid non-negative amount.');
      return;
    }
    const reason = prompt('Reason for the resolution (shown to the business client):') || '';
    try {
      await Trips.resolveDispute(id, resolvedAmount, reason);
      showToast('Dispute resolved');
      draw();
    } catch (e) {
      console.error('Failed to resolve dispute:', e);
      alert(e.message || 'Failed to resolve dispute.');
    }
  }

  return (
    <>
      <div className="toolbar">
        <label className="search-sm">
          <span>⌕</span>
          <input placeholder="Search trips..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Start Time</th>
              <th>Distance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#ff8d8d', padding: 18 }}>
                  Failed to load trips.
                </td>
              </tr>
            ) : rows === null ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: 18 }}>
                  Loading trips...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: 18 }}>
                  No trips found
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id}>
                  <td className="em">{t.id}</td>
                  <td>{t.driver || '--'}</td>
                  <td className="em">{t.vehicle || '--'}</td>
                  <td>
                    {t.pickup || '--'} → {t.destination || '--'}
                  </td>
                  <td>{t.startTime || '--'}</td>
                  <td className="em">{t.distance || '--'}</td>
                  <td>
                    <span className={`pill ${pillClass(t.status)}`}>{t.status || '--'}</span>
                  </td>
                  <td>
                    <ActionMenu>
                      <Link to={`/fleet-manager/live-tracking?id=${encodeURIComponent(t.id)}`}>View</Link>
                      {String(t.status || '').toLowerCase() === 'issue reported' && (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            resolveDispute(t.id);
                          }}
                        >
                          Resolve Dispute
                        </a>
                      )}
                      <label style={{ display: 'block', padding: '8px 10px', color: '#aaa', fontSize: 13 }}>Assign Driver</label>
                      <select
                        defaultValue={t.driver || ''}
                        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #2a2a2a', background: '#1b1b1b', color: '#fff', outline: 'none' }}
                        onChange={(e) => reassign(t.id, e.target.value)}
                      >
                        <option value="">{availableDrivers.length ? 'Select eligible driver' : 'No eligible driver with active vehicle'}</option>
                        {availableDrivers.map((d) => {
                          const name = d.name || d.driver || '';
                          return (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          );
                        })}
                      </select>
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
