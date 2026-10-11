import { useEffect, useState } from 'react';
import { Documents } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { statusClass } from '../../components/Icon';
import { useLiveSync } from '../../hooks/useLiveSync';

export default function SuDocuments() {
  usePageHeader('Documents');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');

  async function load({ background = false } = {}) {
    if (!background) setLoading(true);
    try {
      setRows((await Documents.getAll(search.trim())) || []);
      setFailed(false);
    } catch {
      // A background failure must not replace valid on-screen data with an
      // error state. The next event or reconciliation poll will retry.
      if (!background) setFailed(true);
    } finally {
      if (!background) setLoading(false);
    }
  }

  useLiveSync(load);

  useEffect(() => {
    load();
  }, [search]);

  return (
    <div className="content-card table-card">
      <div className="table-head" style={{ alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h3>Document Management</h3>
          <div className="subdued" style={{ marginTop: 6 }}>Vehicle, driver, and business client documents across the platform.</div>
        </div>
        <input className="mini-input" placeholder="Search by ID, owner, or type" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <table>
        <thead>
          <tr>
            <th>Document ID</th>
            <th>Owner Type</th>
            <th>Owner</th>
            <th>Document Type</th>
            <th>Expiry Date</th>
            <th>Status</th>
            <th>File</th>
          </tr>
        </thead>
        <tbody>
          {loading && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#b9b9b9', padding: 24 }}>Loading documents...</td></tr>}
          {!loading && failed && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#ff6b6b' }}>Failed to load documents.</td></tr>}
          {!loading && !failed && rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>No documents found.</td></tr>}
          {!loading &&
            !failed &&
            rows.map((d) => (
              <tr key={d.id}>
                <td>{d.id || '-'}</td>
                <td>{d.ownerType || '-'}</td>
                <td>{d.vehicle || d.driver || d.delivery || '-'}</td>
                <td>{d.documentType || '-'}</td>
                <td>{d.expiryDate || '-'}</td>
                <td><span className={`status-pill ${statusClass(d.status)}`}>{d.status || '-'}</span></td>
                <td>{d.fileUrl ? <a href={d.fileUrl} target="_blank" rel="noopener noreferrer">View</a> : '-'}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
