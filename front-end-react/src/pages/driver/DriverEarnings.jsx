import { useEffect, useMemo, useState } from 'react';
import { Trips, Deliveries, Payouts } from '../../api/namespaces';
import { useSession } from '../../auth/SessionContext';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useLiveSync } from '../../hooks/useLiveSync';

function normalize(v) {
  return String(v || '').trim().toLowerCase();
}

function formatMoney(amount) {
  const value = Number(amount || 0);
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DriverEarnings() {
  usePageHeader('Earnings', 'Earned, approved, and paid driver payouts');
  const { session } = useSession();
  const driverName = session?.name || '';

  const [trips, setTrips] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [t, d, p] = await Promise.all([Trips.getAll(), Deliveries.getAll(), Payouts.getMyPayouts().catch(() => [])]);
      setTrips(t || []);
      setDeliveries(d || []);
      setPayouts(p || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  useLiveSync(load);

  function getDeliveryForTrip(trip) {
    const requestId = trip.request || trip.deliveryId || trip.deliveryRequestId;
    return deliveries.find((d) => String(d.id) === String(requestId)) || deliveries.find((d) => String(d.deliveryId) === String(requestId)) || null;
  }
  function getPayoutForTrip(trip) {
    return payouts.find((p) => String(p.tripId) === String(trip.id)) || null;
  }

  const rows = useMemo(() => {
    const completedTrips = trips.filter((trip) => {
      const driver = normalize(trip.driver || trip.assignedDriver || trip.driverName);
      return driver === normalize(driverName) && ['completed', 'delivered'].includes(normalize(trip.status));
    });

    return completedTrips.map((trip) => {
      const delivery = getDeliveryForTrip(trip);
      const payout = getPayoutForTrip(trip);
      const requestId = trip.request || trip.deliveryId || trip.deliveryRequestId || delivery?.id || trip.id;
      const customer = trip.customer || trip.client || delivery?.customer || delivery?.client || delivery?.company || 'Customer not available';
      const distance = trip.distance || delivery?.distance || 'Distance not available';
      const status = trip.status || delivery?.status || 'Status unavailable';
      const amount = payout ? Number(payout.totalAmount) : 0;
      return { trip, delivery, payout, requestId, customer, distance, status, amount };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, deliveries, payouts, driverName]);

  const { today, week, month } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    function completionDate(row) {
      const raw = row.payout?.createdAt || row.trip.completedAt || row.trip.updatedAt || row.trip.createdAt;
      const d = raw ? new Date(raw) : null;
      return d && !Number.isNaN(d.getTime()) ? d : null;
    }
    function sumSince(since) {
      return rows.reduce((sum, row) => {
        const d = completionDate(row);
        return d && d >= since ? sum + row.amount : sum;
      }, 0);
    }

    return { today: sumSince(startOfToday), week: sumSince(startOfWeek), month: sumSince(startOfMonth) };
  }, [rows]);

  if (loading) return <section className="content">Loading...</section>;

  return (
    <section className="content">
      <div className="earnings-stats">
        <div className="earnings-card yellow">
          <span>Today</span>
          <strong>{formatMoney(today)}</strong>
        </div>
        <div className="earnings-card">
          <span>This Week</span>
          <strong>{formatMoney(week)}</strong>
        </div>
        <div className="earnings-card">
          <span>This Month</span>
          <strong>{formatMoney(month)}</strong>
        </div>
      </div>

      <div className="revenue-card">
        <div className="card-head">
          <div>
            <h2>Completed Delivery Earnings</h2>
            <p>Payment lifecycle for deliveries assigned to {driverName || 'this driver'}</p>
          </div>
          <span className="count-pill">
            {rows.length} {rows.length === 1 ? 'Order' : 'Orders'}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Delivery ID</th>
                <th>Trip ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Payout Status</th>
                <th>Distance</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-row">
                    No completed delivery revenue found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.trip.id}>
                    <td>{row.requestId}</td>
                    <td>{row.trip.id}</td>
                    <td>{row.customer}</td>
                    <td>
                      <span className="status-pill">{row.status}</span>
                    </td>
                    <td><span className="status-pill">{row.payout?.status || 'Not recorded'}</span></td>
                    <td>{row.distance}</td>
                    <td className="amount">{formatMoney(row.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .earnings-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 22px; }
        .earnings-card { background: linear-gradient(135deg, #1f1f1f, #111); border: 1px solid #262626; border-radius: 18px; padding: 22px; color: #fff; box-shadow: 0 18px 40px rgba(0,0,0,.25); }
        .earnings-card.yellow { background: #ffd400; color: #000; border-color: #ffd400; }
        .earnings-card span { display: block; color: #9ca3af; font-size: 13px; font-weight: 800; margin-bottom: 6px; }
        .earnings-card.yellow span { color: #333; }
        .earnings-card strong { display: block; font-size: 34px; line-height: 1; font-weight: 900; }
        .revenue-card { background: linear-gradient(135deg, #1f1f1f, #111); border: 1px solid #262626; border-radius: 20px; padding: 22px; color: #fff; box-shadow: 0 18px 40px rgba(0,0,0,.25); }
        .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 20px; }
        .card-head h2 { margin: 0; font-size: 26px; font-weight: 900; }
        .card-head p { margin: 6px 0 0; color: #9ca3af; font-size: 14px; }
        .count-pill { background: #ffd400; color: #000; border-radius: 999px; padding: 8px 14px; font-weight: 900; white-space: nowrap; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 850px; }
        th { text-align: left; padding: 14px 12px; color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #262626; }
        td { padding: 16px 12px; border-bottom: 1px solid #262626; color: #fff; font-weight: 700; }
        .status-pill { display: inline-flex; width: fit-content; background: rgba(16,185,129,.14); color: #86efac; border: 1px solid rgba(16,185,129,.4); border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 900; }
        .amount { color: #ffd400; font-weight: 900; }
        .empty-row { text-align: center; color: #9ca3af; padding: 28px; }
        @media (max-width: 900px) { .earnings-stats { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
}
