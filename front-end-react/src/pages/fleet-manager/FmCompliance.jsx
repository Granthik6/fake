import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Drivers } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import ActionMenu from './ActionMenu';
import { useLiveSync } from '../../hooks/useLiveSync';

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
  const d = parseDate(value);
  if (!d) return value || '--';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getLicenseStatus(driver) {
  const raw = String(driver.licenseStatus || '').trim();
  if (raw) return raw;
  const expiry = parseDate(driver.licenseExpiry || driver.expiry || driver.documentExpiry);
  if (!expiry) return 'Valid';
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return expiry < t ? 'Expired' : 'Valid';
}

function getViolations(driver) {
  const value = driver.violations ?? driver.violationCount ?? driver.totalViolations ?? 0;
  const num = Number(String(value).replace(/\D/g, ''));
  return isNaN(num) ? 0 : num;
}

function getOverallStatus(driver) {
  const explicit = String(driver.complianceStatus || driver.overallStatus || '').trim();
  if (explicit) return explicit;
  const licenseStatus = getLicenseStatus(driver);
  const violations = getViolations(driver);
  const status = String(driver.status || '').toLowerCase();
  if (licenseStatus.toLowerCase() === 'expired') return 'Non-Compliant';
  if (status.includes('suspend')) return 'Non-Compliant';
  if (violations >= 3) return 'Non-Compliant';
  if (violations >= 1) return 'Needs Attention';
  return 'Compliant';
}

function licensePill(status) {
  const s = status.toLowerCase();
  if (s.includes('expired')) return 'pill-red';
  if (s.includes('review')) return 'pill-yellow';
  return 'pill-green';
}

function overallPill(status) {
  const s = status.toLowerCase();
  if (s.includes('non')) return 'pill-red';
  if (s.includes('attention')) return 'pill-yellow';
  return 'pill-green';
}

function violationPill(count) {
  if (count >= 3) return 'pill-red';
  if (count >= 1) return 'pill-orange';
  return 'pill-green';
}

export default function FmCompliance() {
  usePageHeader('Driver Compliance', 'Monitor driver regulatory and safety compliance');
  const { showToast } = useToast();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    try {
      const drivers = await Drivers.getAll();
      setRows(drivers || []);
      setError(false);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  }

  useEffect(() => {
    load();
  }, []);
  useLiveSync(load);

  async function toggleStatus(d) {
    const current = d.status || '';
    const next = /suspend/i.test(current) ? 'Available' : 'Suspended';
    if (!confirm(`Change driver status to ${next}?`)) return;
    try {
      const fresh = await Drivers.getOne(d.id);
      await Drivers.update(d.id, {
        name: fresh.name,
        phone: fresh.phone || '',
        email: fresh.email || '',
        license: fresh.license || '',
        zone: fresh.zone || '',
        vehicle: fresh.vehicle || '',
        status: next,
      });
      showToast('Driver status updated');
      load();
    } catch (e) {
      console.error(e);
      alert('Failed to update driver status');
    }
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ textAlign: 'center', color: '#ff8d8d', padding: 24 }}>
          Failed to load compliance data.
        </div>
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ textAlign: 'center', color: '#888', padding: 24 }}>
          Loading compliance data...
        </div>
      </div>
    );
  }

  const totalDrivers = rows.length;
  const compliant = rows.filter((d) => getOverallStatus(d) === 'Compliant').length;
  const needsAttention = rows.filter((d) => getOverallStatus(d) === 'Needs Attention').length;
  const nonCompliant = rows.filter((d) => getOverallStatus(d) === 'Non-Compliant').length;
  const expiredDocs = rows.filter((d) => getLicenseStatus(d) === 'Expired').length;
  const totalViolations = rows.reduce((sum, d) => sum + getViolations(d), 0);

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((d) => [d.name, d.id, d.license, d.phone, d.status].join(' ').toLowerCase().includes(q));

  return (
    <>
      <section className="stats" style={{ gridTemplateColumns: 'repeat(6,minmax(0,1fr))', marginBottom: 18 }}>
        <div className="stat">
          <h3>Total Drivers</h3>
          <div className="v yellow">{totalDrivers}</div>
        </div>
        <div className="stat">
          <h3>Fully Compliant</h3>
          <div className="v yellow">{compliant}</div>
        </div>
        <div className="stat">
          <h3>Needs Attention</h3>
          <div className="v yellow">{needsAttention}</div>
        </div>
        <div className="stat">
          <h3>Non-Compliant</h3>
          <div className="v yellow">{nonCompliant}</div>
        </div>
        <div className="stat">
          <h3>Expired Documents</h3>
          <div className="v yellow">{expiredDocs}</div>
        </div>
        <div className="stat">
          <h3>Total Violations</h3>
          <div className="v yellow">{totalViolations}</div>
        </div>
      </section>

      <div className="toolbar">
        <label className="search-sm">
          <span>⌕</span>
          <input placeholder="Search drivers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="btn btn-ghost" style={{ pointerEvents: 'none' }}>
          ▣ {expiredDocs} Documents Expiring / Expired
        </div>
      </div>

      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Driver</th>
              <th>License Status</th>
              <th>License Expiry</th>
              <th>Violations</th>
              <th>Overall Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#888', padding: 18 }}>
                  No compliance records found.
                </td>
              </tr>
            ) : (
              filtered.map((d) => {
                const licenseStatus = getLicenseStatus(d);
                const expiry = d.licenseExpiry || d.expiry || d.documentExpiry || '--';
                const violations = getViolations(d);
                const overall = getOverallStatus(d);
                return (
                  <tr key={d.id}>
                    <td>
                      <div className="em">{d.name || '--'}</div>
                      <div className="muted">{d.id || '--'}</div>
                    </td>
                    <td>
                      <span className={`pill ${licensePill(licenseStatus)}`}>{licenseStatus}</span>
                    </td>
                    <td>{formatDate(expiry)}</td>
                    <td>
                      <span className={`pill ${violationPill(violations)}`}>
                        {violations} {violations === 1 ? 'violation' : 'violations'}
                      </span>
                    </td>
                    <td>
                      <span className={`pill ${overallPill(overall)}`}>{overall}</span>
                    </td>
                    <td>
                      <ActionMenu>
                        <Link to={`/fleet-manager/driver-profile?id=${encodeURIComponent(d.id)}`}>View Driver</Link>
                        <Link to={`/fleet-manager/edit-driver?id=${encodeURIComponent(d.id)}`}>Edit Driver</Link>
                        <button onClick={() => toggleStatus(d)}>{/suspend/i.test(d.status || '') ? 'Enable Driver' : 'Suspend Driver'}</button>
                      </ActionMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
