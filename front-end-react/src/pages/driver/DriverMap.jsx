import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Trips, Deliveries } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useLiveSync } from '../../hooks/useLiveSync';
import TripPosition from '../../components/TripPosition';

function rupee(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);
}

const ACTIVE_STATUSES = ['accepted', 'picked up', 'in transit'];
const STATUS_STEPS = ['accepted', 'picked up', 'in transit', 'delivered'];
const NOT_YET_ACCEPTED = ['queued', 'assigned', 'pending', 'delayed'];

function statusIndex(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed') return 3;
  return STATUS_STEPS.indexOf(s);
}

export default function DriverMap() {
  usePageHeader('Driver Portal', 'Desktop view');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [trip, setTrip] = useState(null);
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notAccepted, setNotAccepted] = useState('');
  const [noActive, setNoActive] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [sharingLocation, setSharingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (!sharingLocation || !trip?.id) return undefined;
    if (!navigator.geolocation) {
      setLocationError('Location sharing is not supported by this browser.');
      setSharingLocation(false);
      return undefined;
    }
    let active = true;
    let uploading = false;
    let lastSent = 0;
    const watch = navigator.geolocation.watchPosition(async ({ coords }) => {
      if (!active || uploading || Date.now() - lastSent < 15000) return;
      uploading = true;
      try {
        await Trips.updateLocation(trip.id, {
          latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy,
        });
        lastSent = Date.now();
        if (active) setLocationError('');
      } catch (error) {
        if (active) setLocationError(error.message || 'Unable to share location.');
      } finally {
        uploading = false;
      }
    }, (error) => {
      if (active) {
        setLocationError(error.message || 'Location permission is required.');
        if (error.code === 1) setSharingLocation(false);
      }
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
    return () => {
      active = false;
      navigator.geolocation.clearWatch(watch);
    };
  }, [sharingLocation, trip?.id]);

  useEffect(() => {
    if (!ACTIVE_STATUSES.includes(String(trip?.status || '').toLowerCase())) setSharingLocation(false);
  }, [trip?.status]);

  async function load({ background = false } = {}) {
    if (!background) setLoading(true);
    setError('');
    setNotAccepted('');
    setNoActive(false);
    try {
      let tripId = params.get('id');
      if (!tripId) {
        const trips = await Trips.getAll();
        const active = (trips || []).find((t) => ACTIVE_STATUSES.includes(String(t.status || '').toLowerCase()));
        tripId = active ? active.id : null;
      }
      if (!tripId) {
        setNoActive(true);
        setLoading(false);
        return;
      }

      const t = await Trips.getOne(tripId);
      if (!t) throw new Error('Trip not found');

      if (NOT_YET_ACCEPTED.includes(String(t.status || '').toLowerCase())) {
        setNotAccepted(t.status || 'Queued');
        setLoading(false);
        return;
      }

      let d = null;
      try {
        const requestId = t.request || t.deliveryId || t.deliveryRequestId;
        if (requestId) d = await Deliveries.getOne(requestId);
      } catch {}

      setTrip(t);
      setDelivery(d);
    } catch (e) {
      setError('Unable to load this trip. It may no longer exist.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  useLiveSync(load);

  async function advance(nextStatus) {
    if (!trip) return;
    setAdvancing(true);
    setActionError('');
    try {
      await Trips.updateStatus(trip.id || params.get('id'), nextStatus);
      await load();
    } catch (e) {
      setActionError(e.message || 'Unable to update this delivery.');
    } finally {
      setAdvancing(false);
    }
  }

  if (loading) return <section className="content">Loading trip...</section>;

  if (noActive)
    return (
      <section className="content">
        <div style={{ padding: 24, background: '#171717', border: '1px solid #262626', borderRadius: 16, color: '#9ca3af', textAlign: 'center' }}>
          You have no active delivery right now. Accept a delivery from the Dashboard to see it here.
        </div>
      </section>
    );

  if (notAccepted)
    return (
      <section className="content">
        <div style={{ padding: 24, background: '#171717', border: '1px solid #262626', borderRadius: 16, color: '#9ca3af', textAlign: 'center' }}>
          This delivery ({notAccepted}) hasn't been accepted yet. Go to the Dashboard to accept it first.
        </div>
      </section>
    );

  if (error)
    return (
      <section className="content">
        <div style={{ padding: 24, background: '#171717', border: '1px solid #262626', borderRadius: 16, color: '#9ca3af', textAlign: 'center' }}>{error}</div>
      </section>
    );

  const tripId = trip.id || params.get('id');
  const pickup = trip.pickup || trip.pickupLocation || delivery?.pickup || 'Pickup not available';
  const drop = trip.destination || trip.dropoff || trip.dropLocation || delivery?.dropoff || delivery?.destination || 'Destination not available';
  const distance = trip.distance || delivery?.distance || 'Distance not available';
  const eta = trip.eta || trip.estimatedTime || delivery?.eta || 'Not available';
  const status = trip.status || delivery?.status || 'Status unavailable';
  const amount = trip.amount || delivery?.amount || delivery?.pricing?.total || 0;
  const customer =
    trip.customer ||
    trip.client ||
    trip.customerName ||
    trip.clientName ||
    delivery?.customer ||
    delivery?.client ||
    delivery?.customerName ||
    delivery?.clientName ||
    delivery?.company ||
    delivery?.businessName ||
    delivery?.name ||
    'Customer not available';
  const isIssueReported = String(status).toLowerCase() === 'issue reported';
  const idx = isIssueReported ? statusIndex(trip.statusBeforeIssue) : statusIndex(status);

  return (
    <section className="content">
      <div className="map-layout">
        <div className="map-card">
          <div className="package-light-card" style={{ margin: 18 }}>
            <div className="meta-label">Route information</div>
            <div className="meta-value" style={{ marginTop: 10 }}>{pickup}</div>
            <div style={{ color: '#9ca3af', margin: '8px 0' }}>to</div>
            <div className="meta-value">{drop}</div>
            <div className="meta-label" style={{ marginTop: 18 }}>Distance / ETA</div>
            <div className="meta-value">{distance} • {eta}</div>
            <TripPosition position={trip.lastPosition} />
            <button className="btn" type="button" style={{ marginTop: 16 }} onClick={() => setSharingLocation((value) => !value)} disabled={!ACTIVE_STATUSES.includes(String(trip.status).toLowerCase())}>
              {sharingLocation ? 'Stop sharing location' : 'Share live location'}
            </button>
            <p style={{ color: '#9ca3af' }}>Location is shared only while this page is open and sharing is enabled.</p>
            {locationError && <p role="alert" style={{ color: '#ff8d8d' }}>{locationError}</p>}
          </div>
          <div className="mini-stat">
            <div className="card">
              <div className="meta-label">Amount</div>
              <div className="metric-value" style={{ fontSize: 28 }}>
                {rupee(amount)}
              </div>
            </div>
            <div className="card">
              <div className="meta-label">Status</div>
              <div className="metric-value" style={{ fontSize: 22 }}>
                {status}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Delivery Progress</h2>

          {idx >= 0 && (
            <div className="progress-steps">
              {['Accepted', 'Picked Up', 'In Transit', 'Delivered'].map((label, i) => (
                <div className={`step ${idx >= i ? 'done' : ''}`} key={label}>
                  <div className="step-bubble">{i + 1}</div>
                  <div className="step-label">{label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="package-light-card">
            <div className="meta-label">Customer</div>
            <div className="meta-value">{customer}</div>
            <div className="meta-label" style={{ marginTop: 12 }}>
              Current Route
            </div>
            <div className="meta-value">
              {pickup} → {drop}
            </div>
            <div className="meta-label" style={{ marginTop: 12 }}>
              Trip Status
            </div>
            <div className="meta-value" style={{ color: 'var(--yellow)' }}>
              {status}
            </div>
            <div className="meta-label" style={{ marginTop: 12 }}>
              Delivery Request
            </div>
            <div className="meta-value">{trip.request || trip.deliveryId || trip.id || tripId}</div>
          </div>

          <div className="actions-3" style={{ marginTop: 16 }}>
            <button className="btn dark" onClick={() => navigate(`/driver/task-details?id=${encodeURIComponent(tripId)}`)}>
              Open Details
            </button>
            <button className="btn dark" onClick={() => navigate('/driver/notifications')}>
              Notifications
            </button>
            <button className="btn dark" onClick={() => navigate(`/driver/report-issue?id=${encodeURIComponent(tripId)}&action=issue`)}>
              {isIssueReported ? 'View Saved Report' : 'Report Issue'}
            </button>
          </div>

          {actionError && <p role="alert" style={{ color: '#ff8d8d' }}>{actionError}</p>}
          {isIssueReported ? (
            <>
              <div className="package-light-card" style={{ marginTop: 16, border: '1px solid #ef4444' }}>
                <div className="meta-label" style={{ color: '#ff8c8c' }}>
                  Issue Reported
                </div>
                <div className="meta-value">
                  {trip.issueType || 'Issue'}: {trip.issueDescription || 'No description'}
                </div>
              </div>
              {trip.statusBeforeIssue ? <button className="btn yellow full" disabled={advancing} style={{ marginTop: 14 }} onClick={() => advance(trip.statusBeforeIssue)}>
                {advancing ? 'Updating...' : 'Resume Delivery'}
              </button> : <p style={{ color: '#f5b66d', marginTop: 14 }}>The earlier delivery stage was not recorded. The fleet manager must reassign this trip before it can resume.</p>}
            </>
          ) : idx === 0 ? (
            <button className="btn yellow full" disabled={advancing} style={{ marginTop: 14 }} onClick={() => advance('Picked Up')}>
              {advancing ? 'Updating...' : 'Mark as Picked Up'}
            </button>
          ) : idx === 1 ? (
            <button className="btn yellow full" disabled={advancing} style={{ marginTop: 14 }} onClick={() => advance('In Transit')}>
              {advancing ? 'Updating...' : 'Mark as In Transit'}
            </button>
          ) : idx === 2 ? (
            <button className="btn yellow full" style={{ marginTop: 14 }} onClick={() => navigate(`/driver/proof-of-delivery?id=${encodeURIComponent(tripId)}`)}>
              Continue to Proof of Delivery
            </button>
          ) : idx === 3 ? (
            <div className="package-light-card" style={{ marginTop: 16, textAlign: 'center', color: 'var(--yellow)', fontWeight: 800 }}>
              ✓ Delivery completed
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
