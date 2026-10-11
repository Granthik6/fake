import { useEffect, useState } from 'react';
import { Trips, Drivers, Vehicles } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { statusClass, Icon } from '../../components/Icon';
import Modal from '../../components/Modal';
import { useLiveSync } from '../../hooks/useLiveSync';
import TripPosition from '../../components/TripPosition';

function TripDetailModal({ tripId, onClose }) {
  const [r, setR] = useState(null);
  const [failed, setFailed] = useState(false);

  async function load() {
      try {
        const raw = await Trips.getOne(tripId);
        setR({
          id: raw.id || tripId,
          assignment: raw.assignment || '--',
          driver: raw.driver || '--',
          phone: raw.phone || '--',
          vehicle: raw.vehicle || '--',
          vehicleType: raw.vehicleType || '--',
          pickup: raw.pickup || '--',
          destination: raw.destination || '--',
          startTime: raw.startTime || '--',
          distance: raw.distance || '--',
          status: raw.status || '--',
          lastPosition: raw.lastPosition,
        });
        setFailed(false);
      } catch {
        setFailed(true);
      }
  }
  useEffect(() => { load(); }, [tripId]);
  useLiveSync(load);

  return (
    <Modal onClose={onClose}>
      <div className="content-card details-card modal-detail-card trip-modal-card standalone-modal">
        <div className="details-top">
          <div className="details-title">Trip Details</div>
          <button className="close-icon" onClick={onClose}>×</button>
        </div>
        <div className="details-body modal-detail-body">
          {!r && !failed && <div style={{ textAlign: 'center', color: '#b9b9b9', padding: 24, gridColumn: '1/-1' }}>Loading trip...</div>}
          {failed && <div style={{ textAlign: 'center', color: '#ff6b6b', padding: 24, gridColumn: '1/-1' }}>Failed to load trip details.</div>}
          {r && (
            <>
              <div className="detail-block"><div className="detail-label">Trip ID</div><div className="detail-main">{Icon.vehicle}{r.id}</div></div>
              <div className="detail-block"><div className="detail-label">Assignment ID</div><div className="detail-main">{Icon.doc}{r.assignment}</div></div>
              <div className="detail-block full"><div className="detail-label">Driver Information</div><div className="value-box"><div className="detail-main">{Icon.user}{r.driver}</div><div className="detail-sub">{r.phone}</div></div></div>
              <div className="detail-block full"><div className="detail-label">Vehicle Details</div><div className="value-box"><div className="detail-main">{Icon.vehicle}{r.vehicle}</div><div className="detail-sub">{r.vehicleType}</div></div></div>
              <div className="detail-block full"><div className="detail-label">Pickup Location</div><div className="detail-main">{Icon.map}{r.pickup}</div></div>
              <div className="detail-block full"><div className="detail-label">Destination</div><div className="detail-main">{Icon.map}{r.destination}</div></div>
              <div className="detail-block"><div className="detail-label">Start Time</div><div className="detail-main">{Icon.calendar}{r.startTime}</div></div>
              <div className="detail-block"><div className="detail-label">Distance</div><div className="detail-main"><span className="small-pill">{r.distance}</span></div></div>
              <div className="detail-block full"><div className="detail-label">Trip Status</div><div className="detail-main">{Icon.vehicle}{r.status}</div></div>
              <div className="detail-block full"><TripPosition position={r.lastPosition} /></div>
            </>
          )}
        </div>
        <div className="detail-footer"><button className="btn-yellow close-wide" onClick={onClose}>Close</button></div>
      </div>
    </Modal>
  );
}

function ReassignDriverModal({ tripId, onClose, onDone }) {
  const { showToast } = useToast();
  const [drivers, setDrivers] = useState(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [list, vehicles] = await Promise.all([Drivers.getAll(), Vehicles.getAll()]);
        setDrivers(
          (list || []).filter((d) => {
            const status = String(d.status || '').toLowerCase();
            const vehicle = (vehicles || []).find(
              (v) => String(v.plate || '').toLowerCase() === String(d.vehicle || '').toLowerCase(),
            );
            return (status.includes('available') || status === 'active') && vehicle && String(vehicle.status || '').toLowerCase() === 'active';
          }),
        );
      } catch {
        setFailed(true);
      }
    })();
  }, []);

  async function save() {
    const name = selected.trim();
    if (!name) {
      setError('Please select a driver');
      return;
    }
    try {
      await Trips.reassign(tripId, name);
      showToast('Driver reassigned successfully');
      onClose();
      onDone();
    } catch {
      setError('Failed to reassign driver');
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="content-card form-card" style={{ maxWidth: 460, margin: '0 auto' }}>
        <div className="details-top">
          <div className="details-title">Assign Driver</div>
          <button className="close-icon" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: 20 }}>
          <div className="field">
            <label>Select Driver</label>
            <select value={selected} onChange={(e) => setSelected(e.target.value)}>
              {!drivers && !failed && <option value="">Loading drivers...</option>}
              {failed && <option value="">Failed to load drivers</option>}
              {drivers && (
                <>
                  <option value="">{drivers.length ? 'Choose eligible driver' : 'No eligible driver with active vehicle'}</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.name || d.driver || d.id}>{d.name || d.driver || d.id}</option>
                  ))}
                </>
              )}
            </select>
            <div className="error">{error}</div>
          </div>
          <div className="form-actions">
            <button className="btn-dark" type="button" onClick={onClose}>Cancel</button>
            <button className="btn-yellow" type="button" onClick={save}>Save</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function SuTripMonitoring() {
  usePageHeader('Trips Monitoring');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [reassignId, setReassignId] = useState(null);

  async function load() {
    setFailed(false);
    try {
      setRows((await Trips.getAll()) || []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  useLiveSync(load);

  const q = search.toLowerCase();
  const filtered = rows.filter((t) => JSON.stringify(t).toLowerCase().includes(q));

  return (
    <div className="content-card table-card" onClick={() => setOpenMenu(null)}>
      <div className="table-head">
        <h3>Trip Monitoring</h3>
        <div className="filters">
          <input className="mini-input" placeholder="Search trips" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Trip ID</th>
            <th>Driver</th>
            <th>Vehicle</th>
            <th>Pickup</th>
            <th>Destination</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#b9b9b9', padding: 18 }}>Loading trips...</td></tr>}
          {!loading && failed && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#ff6b6b', padding: 18 }}>Failed to load trips.</td></tr>}
          {!loading && !failed && filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#b9b9b9', padding: 18 }}>No trips found.</td></tr>}
          {!loading &&
            !failed &&
            filtered.map((t) => (
              <tr key={t.id}>
                <td>{t.id || '-'}</td>
                <td>{t.driver || '-'}</td>
                <td>{t.vehicle || '-'}</td>
                <td>{t.pickup || '-'}</td>
                <td>{t.destination || '-'}</td>
                <td><span className={`status-pill ${statusClass(t.status)}`}>{t.status || '-'}</span></td>
                <td>
                  <div className="action-menu-wrap" onClick={(e) => e.stopPropagation()}>
                    <button className="action-trigger dots-trigger" aria-label="Actions" onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}>⋯</button>
                    <div className={`action-menu ${openMenu === t.id ? 'show' : ''}`}>
                      <button className="action-item" type="button" onClick={() => { setOpenMenu(null); setViewId(t.id); }}>View Trip</button>
                      <button className="action-item" type="button" onClick={() => { setOpenMenu(null); setReassignId(t.id); }}>Assign Driver</button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {viewId && <TripDetailModal tripId={viewId} onClose={() => setViewId(null)} />}
      {reassignId && <ReassignDriverModal tripId={reassignId} onClose={() => setReassignId(null)} onDone={load} />}
    </div>
  );
}
