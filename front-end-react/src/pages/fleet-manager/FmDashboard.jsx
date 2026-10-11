import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Vehicles, Drivers, Trips, MaintenanceAPI } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useLiveSync } from '../../hooks/useLiveSync';
import { useToast } from '../../hooks/useToast';
import { useSession } from '../../auth/SessionContext';
import { pillClass, tripsPerDayBars, maintenanceCostLine, driverPerformanceRows, quickAlerts } from './fmUtils';

export default function FmDashboard() {
  usePageHeader('Dashboard', 'Fleet overview and key metrics');
  const { showToast } = useToast();
  const { session } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  async function load({ background = false } = {}) {
    if (!background) setLoading(true);
    setError(false);
    try {
      const [v, d, t, m] = await Promise.all([Vehicles.getAll(), Drivers.getAll(), Trips.getAll(), MaintenanceAPI.getAll('')]);
      setVehicles(v || []);
      setDrivers(d || []);
      setTrips(t || []);
      setMaintenance(m || []);
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLiveSync(load);

  async function reassign(tripId, driverName) {
    if (!tripId || !driverName) return;
    try {
      await Trips.reassign(tripId, driverName);
      showToast('Trip reassigned successfully');
      await load();
    } catch (e) {
      console.error('Failed to reassign trip from backend:', e);
      alert('Failed to reassign trip. Check Network response.');
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ color: '#b9b9b9', padding: 28, textAlign: 'center' }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ textAlign: 'center', color: '#ff8d8d', padding: 34 }}>
          Failed to load Fleet Manager dashboard from backend.
        </div>
      </div>
    );
  }

  const inProgress = trips.filter((t) => /requested|assigned|accepted|picked|transit|queued|active|progress|issue/i.test(t.status || '')).length;
  const completed = trips.filter((t) => /complete|delivered/i.test(t.status || '')).length;
  const pendingMaint = maintenance.filter((m) => !/complete/i.test(m.status || '')).length;
  const availableDrivers = drivers.filter((d) => {
    const vehicle = vehicles.find((v) => String(v.plate || '').toLowerCase() === String(d.vehicle || '').toLowerCase());
    return /available|^active$/i.test(d.status || '') && vehicle && /^active$/i.test(vehicle.status || '');
  });
  const alerts = quickAlerts(vehicles, drivers, maintenance);
  const bars = tripsPerDayBars(trips);
  const linePoints = maintenanceCostLine(maintenance);
  const polyline = linePoints.map((p) => `${p.x},${p.y}`).join(' ');
  const perfRows = driverPerformanceRows(drivers);

  return (
    <>
      <section className="hero">
        <div>
          <h2>Welcome Back, {session?.name || 'Fleet Manager'}</h2>
          <p>Your logistics command center</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link className="btn btn-ghost" to="/fleet-manager/compliance">
            Compliance
          </Link>
          <Link className="btn btn-yellow" to="/fleet-manager/analytics">
            View Analytics
          </Link>
        </div>
      </section>

      <section className="stats" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))', alignItems: 'stretch' }}>
        <div className="stat">
          <h3>Total Vehicles</h3>
          <div className="v yellow">{vehicles.length}</div>
          <div className="s">Registered fleet vehicles</div>
        </div>
        <div className="stat">
          <h3>Number of Maintenances</h3>
          <div className="v yellow">{maintenance.length}</div>
          <div className="s">{pendingMaint} pending</div>
        </div>
        <div className="stat">
          <h3>Number of Trips</h3>
          <div className="v yellow">{trips.length}</div>
          <div className="s">{inProgress} active</div>
        </div>
        <div className="stat">
          <h3>Completed Trips</h3>
          <div className="v yellow">{completed}</div>
          <div className="s">Closed successfully</div>
        </div>
      </section>

      <section className="grid2">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Trips per Day</div>
            <span className="pill pill-yellow">Recent</span>
          </div>
          <div className="bars">
            {bars.length ? (
              bars.map((b, i) => (
                <div key={i} style={{ height: b.height }} title={b.title}>
                  <span>{b.label}</span>
                </div>
              ))
            ) : (
              <div style={{ height: 10 }}>
                <span>No trip data yet</span>
              </div>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Maintenance Cost Trend</div>
            <span className="pill pill-yellow">Monthly</span>
          </div>
          <div className="linechart">
            {linePoints.length ? (
              <svg preserveAspectRatio="none" viewBox="0 0 500 190">
                <polyline fill="none" points={polyline} stroke="#f4cf12" strokeWidth={4} />
                {linePoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} fill="#fff" r={5}>
                    <title>{p.title}</title>
                  </circle>
                ))}
              </svg>
            ) : (
              <div style={{ padding: '60px 16px', textAlign: 'center', color: '#888' }}>No maintenance cost data yet</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid2">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Driver Performance</div>
          </div>
          <div className="panel-body">
            <div className="progress-list">
              {perfRows.length ? (
                perfRows.map((r, i) => (
                  <div className="progress-row" key={i}>
                    <div>{r.label}</div>
                    <div className="track">
                      <span style={{ width: `${r.pct}%` }}></span>
                    </div>
                    <strong>{r.value}</strong>
                  </div>
                ))
              ) : (
                <div style={{ padding: '12px 0', textAlign: 'center', color: '#888' }}>No driver ratings yet</div>
              )}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Quick Alerts</div>
            <span className="pill pill-red">{alerts.count} Active</span>
          </div>
          <div className="panel-body">
            <div className="alert-list">
              {alerts.rows.length ? (
                alerts.rows.map((a, i) => (
                  <div className="alert" key={i}>
                    <div>
                      <strong>{a.title}</strong>
                      <div className="muted">{a.sub}</div>
                    </div>
                    <div className="muted">{a.when}</div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '12px 0', textAlign: 'center', color: '#888' }}>No active alerts</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Live Trip Overview</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Status</th>
              <th>Assign Driver</th>
            </tr>
          </thead>
          <tbody>
            {trips.slice(0, 6).length ? (
              trips.slice(0, 6).map((t) => (
                <tr key={t.id}>
                  <td className="em">{t.id}</td>
                  <td>{t.driver}</td>
                  <td>{t.vehicle}</td>
                  <td>
                    {t.pickup || '--'} → {t.destination || '--'}
                  </td>
                  <td>
                    <span className={`pill ${pillClass(t.status)}`}>{t.status || '--'}</span>
                  </td>
                  <td>
                    <select
                      defaultValue={t.driver || ''}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #2a2a2a', background: '#1b1b1b', color: '#fff', outline: 'none' }}
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
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 18 }}>
                  No trips found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
