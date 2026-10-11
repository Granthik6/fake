import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Vehicles } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { pillClass } from './fmUtils';
import ActionMenu from './ActionMenu';
import { useLiveSync } from '../../hooks/useLiveSync';

export default function FmVehicles() {
  usePageHeader('Vehicle Management', 'Manage and monitor your entire fleet');
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);

  async function draw() {
    try {
      const data = await Vehicles.getAll(search);
      setRows(data || []);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  }

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useLiveSync(draw);

  async function del(id) {
    if (!confirm(`Delete vehicle ${id}?`)) return;
    await Vehicles.delete(id);
    showToast('Vehicle deleted');
    draw();
  }

  return (
    <>
      <div className="toolbar">
        <label className="search-sm">
          <span>⌕</span>
          <input placeholder="Search vehicles..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <Link className="btn btn-yellow" to="/fleet-manager/add-vehicle">
          ＋ Add Vehicle
        </Link>
      </div>
      <section className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Vehicle ID</th>
              <th>Plate Number</th>
              <th>Type</th>
              <th>Status</th>
              <th>Last Maintenance</th>
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#ff8d8d', padding: 18 }}>
                  Failed to load vehicles from backend.
                </td>
              </tr>
            ) : rows === null ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 18, color: '#888' }}>
                  Loading vehicles...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 18, color: '#888' }}>
                  No vehicles found
                </td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr key={v.id}>
                  <td className="em">{v.id}</td>
                  <td>{v.plate || v.plateNumber || '--'}</td>
                  <td>{v.type || '--'}</td>
                  <td>
                    <span className={`pill ${pillClass(v.status)}`}>{v.status || '--'}</span>
                  </td>
                  <td>{v.maintenance || v.lastMaintenance || '--'}</td>
                  <td>{v.availability || (v.status === 'Active' ? 'Available' : 'Unavailable')}</td>
                  <td>
                    <ActionMenu>
                      <Link to={`/fleet-manager/edit-vehicle?id=${encodeURIComponent(v.id)}`}>Edit</Link>
                      <button className="danger" onClick={() => del(v.id)}>
                        Delete
                      </button>
                    </ActionMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
