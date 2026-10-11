import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Vehicles } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { today } from './fmUtils';

const vehicleTypes = ['Mini Truck', 'Van', 'Truck', 'Bike', 'SUV', 'Cargo Van'];
const statuses = ['Active', 'On Trip', 'Maintenance', 'Blocked'];

export default function FmAddVehicle() {
  usePageHeader('Add Vehicle', 'Register a new fleet vehicle');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [plate, setPlate] = useState('');
  const [type, setType] = useState(vehicleTypes[0]);
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState(statuses[0]);
  const [driver, setDriver] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [errPlate, setErrPlate] = useState('');
  const [errMaint, setErrMaint] = useState('');

  async function save() {
    setErrPlate('');
    setErrMaint('');
    const p = plate.trim();
    const m = maintenance.trim();
    if (!p) {
      setErrPlate('Plate number is required');
      return;
    }
    if (m && m > today()) {
      setErrMaint('Future date is not allowed');
      return;
    }
    const payload = { plate: p, type, capacity: capacity.trim(), status, assignedDriver: driver.trim(), maintenance: m };
    try {
      await Vehicles.create(payload);
      showToast('Vehicle created');
      navigate('/fleet-manager/vehicles');
    } catch (e) {
      console.error(e);
      alert('Failed to create vehicle from backend');
    }
  }

  return (
    <section className="panel panel-form" style={{ marginTop: 14 }}>
      <div className="panel-head">
        <span className="panel-icon">🚚</span>
        <div className="panel-title">Add New Vehicle</div>
      </div>
      <div className="panel-body">
        <div className="form-grid">
          <div className="field">
            <label>Plate Number</label>
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="e.g. KA 01 MG 2323" />
            <div className="field-error">{errPlate}</div>
          </div>
          <div className="field">
            <label>Vehicle Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {vehicleTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Capacity</label>
            <input value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Assigned Driver</label>
            <input value={driver} onChange={(e) => setDriver(e.target.value)} />
          </div>
          <div className="field">
            <label>Last Maintenance Date</label>
            <input type="date" max={today()} value={maintenance} onChange={(e) => setMaintenance(e.target.value)} />
            <div className="field-error">{errMaint}</div>
          </div>
        </div>
        <div className="footer-actions">
          <Link className="btn btn-ghost" to="/fleet-manager/vehicles">
            Cancel
          </Link>
          <button className="btn btn-yellow" onClick={save}>
            Create Vehicle
          </button>
        </div>
      </div>
    </section>
  );
}
