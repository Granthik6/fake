import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Deliveries, Transactions } from '../../api/namespaces';
import { getCurrentClientNames, belongsToCurrentClient } from './bcUtils';
import { useLiveSync } from '../../hooks/useLiveSync';
import { summarizeDeliveries } from './deliverySummary';


export default function BcDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [stats, setStats] = useState({ total: 0, ...summarizeDeliveries([], []).counts });
  const [error, setError] = useState('');

  async function load() {
    try {
      const [deliveriesResult, invoicesResult, clientNames] = await Promise.all([
        Deliveries.getAll(),
        Transactions.getInvoices(),
        getCurrentClientNames(),
      ]);
      const deliveries = Array.isArray(deliveriesResult) ? deliveriesResult : deliveriesResult?.data || [];
      const invoices = Array.isArray(invoicesResult) ? invoicesResult : invoicesResult?.data || [];
      const allDeliveries = deliveries.filter((d) => belongsToCurrentClient(d, clientNames));
      const myInvoices = invoices.filter((inv) => belongsToCurrentClient({ customer: inv.client }, clientNames));
      const summary = summarizeDeliveries(allDeliveries, myInvoices);
      setActiveDeliveries(summary.groups.active);
      setStats({ total: summary.total, ...summary.counts });
      setError('');
    } catch (e) {
      console.error('Failed to sync business dashboard:', e);
      setError('Could not refresh the dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  useLiveSync(load);

  return (
    <>
      <div className="hero-card">
        <h1 className="page-title medium">
          Welcome Back to Deliver<span className="accent">Sync</span>
        </h1>
        <p className="page-subtitle">
          {loading ? 'Loading dashboard...' : `Your logistics command center. ${stats.active} active deliveries in progress.`}
        </p>
        <Link className="btn yellow cta" to="/business-client/create-delivery">
          <span className="ico">
            <svg viewBox="0 0 24 24">
              <path d="M12 2l8 4.5v11L12 22l-8-4.5v-11L12 2z"></path>
              <path d="M12 22V11"></path>
              <path d="M20 6.5l-8 4.5-8-4.5"></path>
            </svg>
          </span>
          Create New Delivery
        </Link>
      </div>

      {error && <p role="alert" style={{ color: '#f3a5a5' }}>{error}</p>}
      <div className="stat-grid dashboard-compact">
        {[
          ['Total Deliveries', stats.total, 'All delivery requests'],
          ['Active', stats.active, 'Awaiting or in progress'],
          ['Delivered & Paid', stats.deliveredPaid, 'Delivery and payment completed'],
          ['Delivered · Payment Pending', stats.deliveredPaymentPending, 'Unpaid or awaiting an invoice'],
          ['Cancelled', stats.cancelled, 'Cancelled delivery requests'],
          ['Rejected', stats.rejected, 'Rejected delivery requests'],
          ...(stats.other ? [['Other / Billing Review', stats.other, 'Other statuses or refunded invoices']] : []),
        ].map(([label, count, detail]) => (
          <div className="card compact-card" key={label}>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{loading ? '—' : count}</div>
            <div className="stat-foot">{detail}</div>
          </div>
        ))}
      </div>
      <p style={{ color: '#9ca3af', fontSize: 13, margin: '-8px 0 24px', lineHeight: 1.6 }}>
        Each delivery belongs to one category. Active + delivered & paid + delivered with payment pending + cancelled + rejected{stats.other ? ' + other' : ''} = {stats.total} total.
      </p>

      <div className="table-card">
        <div className="table-head">Active Deliveries</div>
        <table className="table">
          <thead>
            <tr>
              <th>Delivery ID</th>
              <th>Customer</th>
              <th>Active Location</th>
              <th>Status</th>
              <th>Driver</th>
              <th>ETA</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeDeliveries.length ? (
              activeDeliveries.map((d, i) => {
                const id = d.id || d.deliveryId || '--';
                const customer = d.customer || d.client || d.clientName || d.businessName || '--';
                const pickup = d.pickup || d.pickupAddress || d.source || '--';
                const destination = d.dropoff || d.destination || d.drop || d.dropAddress || '--';
                const status = d.status || '--';
                const driver = d.driver || d.assignedDriver || '--';
                const eta = d.eta || d.expectedTime || d.time || '--';
                return (
                  <tr key={id + i}>
                    <td>{id}</td>
                    <td>{customer}</td>
                    <td>
                      <div>
                        <svg viewBox="0 0 24 24">
                          <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z"></path>
                          <circle cx="12" cy="10" r="2"></circle>
                        </svg>{' '}
                        {pickup}
                      </div>
                      <div className="muted">{destination}</div>
                    </td>
                    <td>
                      <span className="pill bright">{status}</span>
                    </td>
                    <td>{driver}</td>
                    <td>
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9"></circle>
                        <path d="M12 7v5l3 2"></path>
                      </svg>{' '}
                      {eta}
                    </td>
                    <td>
                      <Link className="btn sm outline-yellow" to={`/business-client/live-tracking?id=${encodeURIComponent(id)}`}>
                        Track
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#8f8f8f', padding: 18 }}>
                  {loading ? 'Loading...' : 'No active deliveries found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
