import { useEffect, useState } from 'react';
import { Users, Deliveries, Vehicles, MaintenanceAPI } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useLiveSync } from '../../hooks/useLiveSync';

function metric(label, val, delta) {
  return (
    <div className="content-card kpi" key={label}>
      <div className="label">{label}</div>
      <div className="value">{val}</div>
      {delta && <div className="delta">↗ {delta}</div>}
    </div>
  );
}

function BarCard({ title, values, labels }) {
  const max = Math.max(...values, 1);
  const yTicks = ['100', '75', '50', '25', '0'];
  return (
    <div className="content-card chart-card bar-row">
      <div className="chart-title">{title}</div>
      <div className="chart-outer">
        <div className="chart-y">
          {yTicks.map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </div>
        <div className="chart-area">
          {values.map((v, i) => (
            <div className="bar-wrap" key={i}>
              <div className="bar" style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />
              <div className="bar-label">{labels[i] || ''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SuReports() {
  usePageHeader('Reports');
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  useLiveSync(() => setSyncTick((value) => value + 1));

  useEffect(() => {
    (async () => {
      try {
        const [users, deliveries, vehicles, maintenance] = await Promise.all([Users.getAll('', ''), Deliveries.getAll(), Vehicles.getAll(), MaintenanceAPI.getAll('')]);
        setData({ users: users || [], deliveries: deliveries || [], vehicles: vehicles || [], maintenance: maintenance || [] });
      } catch {
        setFailed(true);
      }
    })();
  }, [syncTick]);

  if (failed) {
    return (
      <div className="content-card" style={{ textAlign: 'center', color: '#ff6b6b', padding: 30 }}>Failed to load reports.</div>
    );
  }
  if (!data) {
    return (
      <div className="content-card" style={{ textAlign: 'center', color: '#b9b9b9', padding: 30 }}>Loading reports...</div>
    );
  }

  const { users, deliveries, vehicles, maintenance } = data;
  const totalUsers = users.length;
  const totalDeliveries = deliveries.length;
  const totalVehicles = vehicles.length;
  const totalMaintenance = maintenance.length;

  const completedDeliveries = deliveries.filter((d) => String(d.status || '').toLowerCase().includes('delivered') || String(d.status || '').toLowerCase().includes('completed')).length;
  const activeVehicles = vehicles.filter((v) => String(v.status || '').toLowerCase() === 'active').length;
  const blockedVehicles = vehicles.filter((v) => String(v.status || '').toLowerCase() === 'blocked').length;
  const maintenanceVehicles = vehicles.filter((v) => String(v.status || '').toLowerCase() === 'maintenance').length;
  const activeUsersCount = users.filter((u) => String(u.status || '').toLowerCase() === 'active').length;
  const activeUserRate = totalUsers ? Math.round((activeUsersCount / totalUsers) * 100) : 0;
  const overdueMaintenance = maintenance.filter((m) => String(m.status || '').toLowerCase() === 'overdue').length;
  const pendingDeliveries = deliveries.filter((d) => {
    const st = String(d.status || '').toLowerCase();
    return st.includes('pending') || st.includes('review');
  }).length;
  const blockedDeliveries = deliveries.filter((d) => String(d.status || '').toLowerCase() === 'blocked').length;
  const completionRate = totalDeliveries ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0;
  const vehicleUtilization = totalVehicles ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

  return (
    <>
      <div className="kpi-grid">
        {metric('Total Users', totalUsers.toLocaleString('en-IN'))}
        {metric('Total Deliveries', totalDeliveries.toLocaleString('en-IN'))}
        {metric('Completed Deliveries', completedDeliveries.toLocaleString('en-IN'), `${completionRate}%`)}
        {metric('Total Vehicles', totalVehicles.toLocaleString('en-IN'))}
        {metric('Active Vehicles', activeVehicles.toLocaleString('en-IN'), `${vehicleUtilization}%`)}
        {metric('Maintenance Records', totalMaintenance.toLocaleString('en-IN'))}
      </div>

      <div className="grid-2">
        <BarCard
          title="Delivery Status Report"
          values={[completedDeliveries, pendingDeliveries, blockedDeliveries, Math.max(totalDeliveries - completedDeliveries - pendingDeliveries - blockedDeliveries, 0)]}
          labels={['Completed', 'Pending', 'Blocked', 'Other']}
        />
        <BarCard
          title="Vehicle Status Report"
          values={[activeVehicles, maintenanceVehicles, blockedVehicles, Math.max(totalVehicles - activeVehicles - maintenanceVehicles - blockedVehicles, 0)]}
          labels={['Active', 'Maintenance', 'Blocked', 'Other']}
        />
      </div>

      <div className="content-card table-card" style={{ marginTop: 24 }}>
        <div className="table-head">
          <h3>Report Summary</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Module</th>
              <th>Total</th>
              <th>Important Count</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Users</td>
              <td>{totalUsers}</td>
              <td>{activeUsersCount} active</td>
              <td>{activeUserRate}% of users are active</td>
            </tr>
            <tr>
              <td>Deliveries</td>
              <td>{totalDeliveries}</td>
              <td>{completedDeliveries} completed</td>
              <td>{completionRate}% completion rate</td>
            </tr>
            <tr>
              <td>Vehicles</td>
              <td>{totalVehicles}</td>
              <td>{activeVehicles} active</td>
              <td>{vehicleUtilization}% active vehicle ratio</td>
            </tr>
            <tr>
              <td>Maintenance</td>
              <td>{totalMaintenance}</td>
              <td>{maintenanceVehicles} vehicles under maintenance</td>
              <td>{overdueMaintenance} overdue</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
