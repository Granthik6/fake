import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Documents, Vehicles, Drivers } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';

const vehicleTypes = ['Pollution Certificate', 'Insurance', 'Registration'];
const driverTypes = ['Driver License'];

export default function FmUploadDocument() {
  usePageHeader('Upload Document', 'Add new document to fleet management system');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [kind, setKind] = useState('vehicle');
  const [docType, setDocType] = useState('');
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [driverOptions, setDriverOptions] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const vehicles = await Vehicles.getAll();
        const options = (vehicles || [])
          .map((v) => {
            const plate = v.plate || v.vehicle || v.vehicleNumber || '';
            const id = v.id || '';
            return { value: plate, label: plate && id ? `${plate} - ${id}` : plate || id };
          })
          .filter((x) => x.value);
        setVehicleOptions(options);
      } catch (e) {
        console.error('Failed to load vehicles from backend:', e);
      }
      try {
        const drivers = await Drivers.getAll();
        const options = (drivers || [])
          .map((d) => {
            const name = d.name || d.driver || '';
            const id = d.id || '';
            return { value: name, label: name && id ? `${name} - ${id}` : name || id };
          })
          .filter((x) => x.value);
        setDriverOptions(options);
      } catch (e) {
        console.error('Failed to load drivers from backend:', e);
      }
    })();
  }, []);

  const types = kind === 'vehicle' ? vehicleTypes : driverTypes;

  function setKindAndReset(next) {
    setKind(next);
    setDocType('');
  }

  async function upload() {
    const entity = kind === 'vehicle' ? selectedVehicle : selectedDriver;
    if (!docType || !entity || !file || !expiryDate) {
      showToast('Please complete all required fields.');
      return;
    }

    const today = new Date();
    const issueDate = today.toISOString().slice(0, 10);

    const formData = new FormData();
    formData.append('ownerType', kind);
    formData.append('vehicle', kind === 'vehicle' ? selectedVehicle : '');
    formData.append('driver', kind === 'driver' ? selectedDriver : '');
    formData.append('documentType', docType);
    formData.append('issueDate', issueDate);
    formData.append('expiryDate', expiryDate);
    formData.append('status', 'Submitted');
    formData.append('file', file);

    try {
      setUploading(true);
      await Documents.create(formData);
      showToast('Document uploaded successfully');
      setTimeout(() => navigate('/fleet-manager/documents'), 600);
    } catch (e) {
      console.error('Failed to upload document to backend:', e);
      showToast(e.message || 'Failed to upload document.');
      setUploading(false);
    }
  }

  return (
    <>
      <div className="info-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <a
            className="btn btn-square btn-ghost"
            href="/fleet-manager/documents"
            onClick={(e) => {
              e.preventDefault();
              navigate('/fleet-manager/documents');
            }}
          >
            ←
          </a>
          <div>
            <div className="section-title">Upload Document</div>
            <div className="muted">Add new document to fleet management system</div>
          </div>
        </div>
        <div className="upload-grid" style={{ marginBottom: 24 }}>
          <div className={`category-card${kind === 'vehicle' ? ' active' : ''}`} onClick={() => setKindAndReset('vehicle')}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>▤</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Vehicle Documents</div>
            <div className="muted">Insurance, Pollution Certificate</div>
          </div>
          <div className={`category-card${kind === 'driver' ? ' active' : ''}`} onClick={() => setKindAndReset('driver')}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>◌</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Driver Documents</div>
            <div className="muted">Driver License</div>
          </div>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Document Type *</label>
            <select value={docType} onChange={(e) => setDocType(e.target.value)}>
              <option value="">Select document type</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {kind === 'vehicle' && (
            <div className="field vehicle-only">
              <label>Select Vehicle *</label>
              <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
                <option value="">Select vehicle</option>
                {vehicleOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          {kind === 'driver' && (
            <div className="field driver-only">
              <label>Select Driver *</label>
              <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                <option value="">Select driver</option>
                {driverOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="field">
            <label>Upload File *</label>
            <div className="file-shell">
              <label className="file-btn" htmlFor="docFile">
                Choose File
              </label>
              <input
                id="docFile"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <span className="file-name">{file ? file.name : 'No file chosen'}</span>
            </div>
          </div>
          <div className="field">
            <label>Expiry Date *</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
          <div className="file-note">Accepted: PDF, PNG, JPG</div>
        </div>
      </div>
      <div className="upload-actions">
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => navigate('/fleet-manager/documents')}
        >
          Cancel
        </button>
        <button className="btn btn-yellow" type="button" disabled={uploading} onClick={upload}>
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </div>
      <style>{`
        .upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .category-card{cursor:pointer}
        .field select,.field input[type=date],.field .file-shell{width:100%;background:#0a0a0a;border:1px solid #2a2a2a;border-radius:18px;color:#fff;padding:14px 16px;font:inherit;box-sizing:border-box}
        .file-shell{display:flex;align-items:center;gap:12px;min-height:56px}
        .file-shell input[type=file]{position:absolute;opacity:0;width:.1px;height:.1px;pointer-events:none}
        .file-btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;border-radius:12px;border:1px solid #3a3a3a;background:#111;color:#fff;font-weight:600;cursor:pointer}
        .file-name{font-size:13px;color:#a7a7a7;line-height:1.2}
        .upload-actions{display:flex;gap:12px;margin-top:16px}
        .file-note{font-size:13px;color:#8f8f8f;margin-top:8px}
        @media(max-width:900px){.upload-grid,.form-grid{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}
