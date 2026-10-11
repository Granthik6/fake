import { useEffect, useState } from 'react';
import { Dashboard, Vehicles, Drivers, Trips, MaintenanceAPI, Payouts } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { tripsPerDayBars, maintenanceCostLine, driverPerformanceRows, statusBreakdownRows } from './fmUtils';
import { useLiveSync } from '../../hooks/useLiveSync';

export default function FmAnalytics() {
  usePageHeader('Analytics', 'Fleet insights and performance trends');
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState(false);

  const [a, setA] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [statement, setStatement] = useState(null);
  const [rateCard, setRateCard] = useState(null);
  const [settlements, setSettlements] = useState([]);

  const [baseFare, setBaseFare] = useState('');
  const [perKm, setPerKm] = useState('');
  const [perKg, setPerKg] = useState('');
  const [customerBaseFare, setCustomerBaseFare] = useState('');
  const [customerPerKm, setCustomerPerKm] = useState('');
  const [customerPerKg, setCustomerPerKg] = useState('');
  const [driverPayouts, setDriverPayouts] = useState([]);

  async function load({ background = false } = {}) {
    if (!background) setLoading(true);
    setError(false);
    setRestricted(false);
    try {
      const analytics = await Dashboard.getFleetManagerAnalytics();
      const [v, d, t, m, stmt, rc, sett, payouts] = await Promise.all([
        Vehicles.getAll(),
        Drivers.getAll(),
        Trips.getAll(),
        MaintenanceAPI.getAll(''),
        Payouts.getFleetManagerStatement().catch(() => null),
        Payouts.getMyRateCard().catch(() => null),
        Payouts.listSettlements().catch(() => []),
        Payouts.listDriverPayouts().catch(() => []),
      ]);
      setA(analytics);
      setVehicles(v || []);
      setDrivers(d || []);
      setTrips(t || []);
      setMaintenance(m || []);
      setStatement(stmt);
      setRateCard(rc);
      setSettlements(sett || []);
      setDriverPayouts(payouts || []);
      if (rc) {
        setBaseFare(String(rc.effective.baseFare));
        setPerKm(String(rc.effective.perKm));
        setPerKg(String(rc.effective.perKg));
        setCustomerBaseFare(String(rc.effective.customerBaseFare));
        setCustomerPerKm(String(rc.effective.customerPerKm));
        setCustomerPerKg(String(rc.effective.customerPerKg));
      }
    } catch (e) {
      console.error(e);
      if (String(e.message || '').toLowerCase().includes('reports access')) {
        setRestricted(true);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLiveSync(load);

  async function saveRateCard() {
    try {
      await Payouts.setMyRateCard({
        baseFare: Number(baseFare),
        perKm: Number(perKm),
        perKg: Number(perKg),
        customerBaseFare: Number(customerBaseFare),
        customerPerKm: Number(customerPerKm),
        customerPerKg: Number(customerPerKg),
      });
      showToast('Rate card saved');
      load();
    } catch (e) {
      console.error('Failed to save rate card:', e);
      alert(e.message || 'Failed to save rate card.');
    }
  }

  async function markPayoutPaid(id) {
    try {
      await Payouts.markPayoutPaid(id);
      showToast('Driver payout marked paid');
      load({ background: true });
    } catch (e) {
      alert(e.message || 'Failed to mark payout paid.');
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ textAlign: 'center', color: '#888', padding: 24 }}>
          Loading analytics...
        </div>
      </div>
    );
  }

  if (restricted) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ textAlign: 'center', color: '#b5b5b5', padding: '60px 24px' }}>
          <strong>Access Restricted</strong>
          <br />
          You do not have permission to view this page. Contact your Super User administrator.
        </div>
      </div>
    );
  }

  if (error || !a) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ textAlign: 'center', color: '#ff8d8d', padding: 34 }}>
          Failed to load analytics.
        </div>
      </div>
    );
  }

  const bars = tripsPerDayBars(trips);
  const linePoints = maintenanceCostLine(maintenance);
  const polyline = linePoints.map((p) => `${p.x},${p.y}`).join(' ');
  const perfRows = driverPerformanceRows(drivers);
  const vehicleStatusRows = statusBreakdownRows(vehicles);
  const tripStatusRows = statusBreakdownRows(trips);

  return (
    <>
      <section className="stats" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
        <div className="stat">
          <h3>Fleet Score</h3>
          <div className="v yellow">{a.fleetScorePercent}%</div>
          <div className="s">Active vehicle ratio</div>
        </div>
        <div className="stat">
          <h3>Completed Trips</h3>
          <div className="v yellow">{a.completedTrips}</div>
          <div className="s">of {trips.length} total trips</div>
        </div>
        <div className="stat">
          <h3>Maintenance Cost</h3>
          <div className="v yellow">₹{a.maintenanceCost.toLocaleString('en-IN')}</div>
          <div className="s">{maintenance.length} records</div>
        </div>
        <div className="stat">
          <h3>Drivers</h3>
          <div className="v yellow">{a.driverCount}</div>
          <div className="s">{drivers.filter((d) => !/suspend|reject/i.test(d.status || '')).length} available</div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-head">
          <div className="panel-title">Driver Payout Processing</div>
          <span className="pill pill-yellow">{driverPayouts.filter((p) => p.status !== 'Paid').length} outstanding</span>
        </div>
        <div className="panel-body" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead><tr><th>Payout</th><th>Driver</th><th>Trip</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {driverPayouts.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 18 }}>No driver payouts yet.</td></tr>}
              {driverPayouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{payout.id}</td>
                  <td>{payout.driverName}</td>
                  <td>{payout.tripId}</td>
                  <td>₹{Number(payout.totalAmount || 0).toLocaleString('en-IN')}</td>
                  <td><span className="pill">{payout.status || 'Paid'}</span></td>
                  <td>{payout.status === 'Approved' ? <button className="btn-yellow" onClick={() => markPayoutPaid(payout.id)}>Mark Paid</button> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid2">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Monthly Revenue Statement</div>
            <span className={`pill ${statement && statement.status === 'locked' ? '' : 'pill-yellow'}`}>
              {statement ? statement.month : '--'}
              {statement ? (statement.status === 'locked' ? ' · Locked' : ' · Open') : ''}
            </span>
          </div>
          <div className="panel-body">
            {statement ? (
              <>
                <div className="progress-list">
                  <div className="progress-row">
                    <div>Completed Trips</div>
                    <strong>{statement.completedTrips}</strong>
                  </div>
                  <div className="progress-row">
                    <div>Trip Revenue (your share)</div>
                    <strong>₹{statement.tripRevenue.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="progress-row">
                    <div>Driver Payouts</div>
                    <strong>-₹{statement.driverPayoutsTotal.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="progress-row">
                    <div>Outstanding Driver Liability</div>
                    <strong>₹{Number(statement.pendingDriverEarnings || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="progress-row">
                    <div>Maintenance Costs</div>
                    <strong>-₹{statement.maintenanceCosts.toLocaleString('en-IN')}</strong>
                  </div>
                  {!!statement.adjustmentsTotal && (
                    <div className="progress-row">
                      <div>Adjustments (late refunds from prior locked months)</div>
                      <strong>
                        {statement.adjustmentsTotal < 0 ? '-' : ''}₹{Math.abs(statement.adjustmentsTotal).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  )}
                  <div className="progress-row" style={{ borderTop: '1px solid #333', paddingTop: 10, marginTop: 6 }}>
                    <div>
                      <strong>Net Income</strong>
                    </div>
                    <strong className="yellow">₹{statement.netIncome.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
                {settlements.length > 0 && (
                  <div style={{ marginTop: 18, borderTop: '1px solid #262626', paddingTop: 14 }}>
                    <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 8 }}>Previous Months</div>
                    <div className="progress-list">
                      {settlements.map((s) => (
                        <div className="progress-row" key={s.month}>
                          <div>
                            {s.month} {s.status === 'locked' ? '(Locked)' : '(Open)'}
                          </div>
                          <strong>₹{s.netIncome.toLocaleString('en-IN')}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: '#ff8d8d', padding: '12px 0' }}>Failed to load revenue statement.</div>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">My Customer & Driver Rate Card</div>
            {rateCard && rateCard.isCustom ? <span className="pill pill-yellow">Custom</span> : <span className="pill">Platform Default</span>}
          </div>
          <div className="panel-body">
            {rateCard ? (
              <>
                <div className="form-note" style={{ marginBottom: 12 }}>Driver payout</div>
                <div className="field">
                  <label>Base Fare (₹ per trip)</label>
                  <input type="number" min={rateCard.platformFloor.baseFare} step="0.01" value={baseFare} onChange={(e) => setBaseFare(e.target.value)} />
                </div>
                <div className="field">
                  <label>Rate per Km (₹)</label>
                  <input type="number" min={rateCard.platformFloor.perKm} step="0.01" value={perKm} onChange={(e) => setPerKm(e.target.value)} />
                </div>
                <div className="field">
                  <label>Rate per Kg (₹)</label>
                  <input type="number" min={rateCard.platformFloor.perKg} step="0.01" value={perKg} onChange={(e) => setPerKg(e.target.value)} />
                </div>
                <div className="form-note">
                  Platform minimum: ₹{rateCard.platformFloor.baseFare} base, ₹{rateCard.platformFloor.perKm}/km, ₹{rateCard.platformFloor.perKg}/kg. You cannot go below these.
                </div>
                <div className="form-note" style={{ marginTop: 18, marginBottom: 12 }}>Customer selling price</div>
                <div className="field">
                  <label>Customer Base Price (₹ per trip)</label>
                  <input type="number" min={rateCard.platformFloor.customerBaseFare} step="0.01" value={customerBaseFare} onChange={(e) => setCustomerBaseFare(e.target.value)} />
                </div>
                <div className="field">
                  <label>Customer Price per Km (₹)</label>
                  <input type="number" min={rateCard.platformFloor.customerPerKm} step="0.01" value={customerPerKm} onChange={(e) => setCustomerPerKm(e.target.value)} />
                </div>
                <div className="field">
                  <label>Customer Price per Kg (₹)</label>
                  <input type="number" min={rateCard.platformFloor.customerPerKg} step="0.01" value={customerPerKg} onChange={(e) => setCustomerPerKg(e.target.value)} />
                </div>
                <div className="form-note">
                  Customer prices must preserve {rateCard.economics.minimumFleetMarginPercent}% fleet margin after {rateCard.economics.commissionRate}% platform commission.
                </div>
                <button className="btn-yellow" style={{ marginTop: 12 }} onClick={saveRateCard}>
                  Save Rate Card
                </button>
              </>
            ) : (
              <div style={{ color: '#ff8d8d', padding: '12px 0' }}>Failed to load rate card.</div>
            )}
          </div>
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
            <div className="panel-title">Fleet Performance</div>
          </div>
          <div className="panel-body">
            <div className="progress-list">
              <div className="progress-row">
                <div>Vehicle Active Ratio</div>
                <div className="track">
                  <span style={{ width: `${a.vehicleActiveRatioPercent}%` }}></span>
                </div>
                <strong>{a.vehicleActiveRatioPercent}%</strong>
              </div>
              <div className="progress-row">
                <div>Trip Completion</div>
                <div className="track">
                  <span style={{ width: `${a.tripCompletionRatioPercent}%` }}></span>
                </div>
                <strong>{a.tripCompletionRatioPercent}%</strong>
              </div>
            </div>
          </div>
        </div>
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
      </section>

      <section className="grid2">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Vehicle Status Breakdown</div>
          </div>
          <div className="panel-body">
            <div className="progress-list">
              {vehicleStatusRows.length ? (
                vehicleStatusRows.map((r, i) => (
                  <div className="progress-row" key={i}>
                    <div>{r.label}</div>
                    <div className="track">
                      <span style={{ width: `${r.pct}%` }}></span>
                    </div>
                    <strong>{r.value}</strong>
                  </div>
                ))
              ) : (
                <div style={{ padding: '12px 0', textAlign: 'center', color: '#888' }}>No data</div>
              )}
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Trip Status Breakdown</div>
          </div>
          <div className="panel-body">
            <div className="progress-list">
              {tripStatusRows.length ? (
                tripStatusRows.map((r, i) => (
                  <div className="progress-row" key={i}>
                    <div>{r.label}</div>
                    <div className="track">
                      <span style={{ width: `${r.pct}%` }}></span>
                    </div>
                    <strong>{r.value}</strong>
                  </div>
                ))
              ) : (
                <div style={{ padding: '12px 0', textAlign: 'center', color: '#888' }}>No data</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
