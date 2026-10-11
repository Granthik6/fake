import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Drivers } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { validateDriver } from './fmUtils';

const statuses = ['Available', 'On Duty', 'Suspended', 'Rejected'];

export default function FmEditDriver() {
  usePageHeader('Edit Driver', 'Update driver profile and assignment');
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [license, setLicense] = useState('');
  const [zone, setZone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [status, setStatus] = useState(statuses[0]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const d = await Drivers.getOne(id);
        setName(d.name || '');
        setPhone(d.phone || '');
        setEmail(d.email || '');
        setLicense(d.license || '');
        setZone(d.zone || '');
        setVehicle(d.vehicle || '');
        setStatus(d.status || statuses[0]);
      } catch (e) {
        console.error(e);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function save() {
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      license: license.trim().toUpperCase(),
      zone: zone.trim(),
      vehicle: vehicle.trim().toUpperCase(),
      status,
    };
    const errs = validateDriver(payload);
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await Drivers.update(id, { name: payload.name, email: payload.email, phone: payload.phone, licenseNumber: payload.license, vehicle: payload.vehicle, status: payload.status });
      showToast('Driver updated');
      navigate('/fleet-manager/drivers');
    } catch (e) {
      console.error(e);
      alert('Failed to update driver');
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ textAlign: 'center', color: '#888', padding: 24 }}>
          Loading driver...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ textAlign: 'center', color: '#ff8d8d', padding: 34 }}>
          Failed to load driver.
        </div>
      </div>
    );
  }

  return (
    <section className="panel panel-form" style={{ marginTop: 14 }}>
      <div className="panel-head">
        <span className="panel-icon">✎</span>
        <div className="panel-title">Edit Driver</div>
      </div>
      <div className="panel-body">
        <div className="form-grid">
          <div className="field">
            <label>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
            <div className="field-error">{errors.name}</div>
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="field-error">{errors.phone}</div>
          </div>
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="field-error">{errors.email}</div>
          </div>
          <div className="field">
            <label>License Number</label>
            <input value={license} onChange={(e) => setLicense(e.target.value)} />
            <div className="field-error">{errors.license}</div>
          </div>
          <div className="field">
            <label>Zone</label>
            <input value={zone} onChange={(e) => setZone(e.target.value)} />
            <div className="field-error">{errors.zone}</div>
          </div>
          <div className="field">
            <label>Vehicle</label>
            <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            <div className="field-error">{errors.vehicle}</div>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="footer-actions">
          <Link className="btn btn-ghost" to="/fleet-manager/drivers">
            Cancel
          </Link>
          <button className="btn btn-yellow" onClick={save}>
            Save Changes
          </button>
        </div>
      </div>
    </section>
  );
}
