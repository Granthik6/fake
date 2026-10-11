import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Documents } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { pillClass } from './fmUtils';
import ActionMenu from './ActionMenu';
import { useLiveSync } from '../../hooks/useLiveSync';

export default function FmDocuments() {
  usePageHeader('Document Management', 'Manage all fleet and driver documentation');
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState(false);

  async function load() {
    try {
      const data = await Documents.getAll();
      setDocs(data || []);
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

  async function del(id) {
    if (!id) return;
    if (!confirm(`Delete document ${id}?`)) return;
    try {
      await Documents.delete(id);
      showToast('Document deleted');
      load();
    } catch (e) {
      console.error(e);
      alert('Failed to delete document');
    }
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ padding: 24, color: '#ff8d8d', textAlign: 'center' }}>
          Failed to load documents.
        </div>
      </div>
    );
  }

  if (docs === null) {
    return (
      <div className="panel">
        <div className="panel-body" style={{ padding: 24, color: '#888', textAlign: 'center' }}>
          Documents backend sync is loading...
        </div>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const filtered = docs.filter((d) => [d.id, d.ownerType, d.vehicle, d.driver, d.documentType, d.issueDate, d.expiryDate, d.status].join(' ').toLowerCase().includes(q));

  return (
    <>
      <div className="toolbar">
        <label className="search-sm">
          <span>⌕</span>
          <input placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <button className="btn btn-yellow" type="button" onClick={() => navigate('/fleet-manager/upload-document')}>
          ＋ Upload Document
        </button>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div className="panel-title">Documents</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Owner Type</th>
              <th>Owner</th>
              <th>Document Type</th>
              <th>Issue Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#888', padding: 18 }}>
                  No documents found.
                </td>
              </tr>
            ) : (
              filtered.map((d) => (
                <tr key={d.id}>
                  <td className="em">{d.id || '--'}</td>
                  <td>{d.ownerType || '--'}</td>
                  <td>{d.vehicle || d.driver || '--'}</td>
                  <td>{d.documentType || '--'}</td>
                  <td>{d.issueDate || '--'}</td>
                  <td>{d.expiryDate || '--'}</td>
                  <td>
                    <span className={`pill ${pillClass(d.status)}`}>{d.status || '--'}</span>
                  </td>
                  <td>
                    <ActionMenu>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/fleet-manager/upload-document?id=${encodeURIComponent(d.id || '')}`);
                        }}
                      >
                        Edit Document
                      </a>
                      <button className="danger" onClick={() => del(d.id)}>
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
