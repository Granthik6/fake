import { useEffect, useState } from 'react';
import { Users } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useSession } from '../../auth/SessionContext';
import { useToast } from '../../hooks/useToast';
import { initials } from './fmUtils';

export default function FmProfile() {
  usePageHeader('Profile', 'Fleet manager account information');
  const { session } = useSession();
  const { showToast } = useToast();
  const userId = session?.userId || '';

  const [user, setUser] = useState(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [address, setAddress] = useState('');
  const [numVehicles, setNumVehicles] = useState('');

  const [errName, setErrName] = useState('');
  const [errEmail, setErrEmail] = useState('');
  const [errPhone, setErrPhone] = useState('');

  async function load() {
    try {
      const u = await Users.getOne(userId);
      setUser(u);
      const details = u.profileDetails || {};
      setName(u.name || 'Fleet Manager');
      setEmail(u.email || '');
      setPhone(u.phone || '');
      setCompany(details.companyName || '');
      setAddress(details.companyAddress || '');
      setNumVehicles(details.numberOfVehicles || '');
    } catch (e) {
      console.error(e);
      setError(true);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function save() {
    setErrName('');
    setErrEmail('');
    setErrPhone('');

    const payload = {
      name: name.trim(),
      email: email.trim(),
      role: user.role,
      status: user.status || 'Active',
      phone: phone.trim(),
      profileDetails: { ...(user.profileDetails || {}), companyName: company.trim(), companyAddress: address.trim(), numberOfVehicles: numVehicles.trim() },
    };

    if (!/^[A-Za-z][A-Za-z\s]{2,59}$/.test(payload.name)) {
      setErrName('Name must be 3-60 letters');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setErrEmail('Enter a valid email address');
      return;
    }
    if (payload.phone && !/^\+?[0-9\s-]{10,17}$/.test(payload.phone)) {
      setErrPhone('Enter a valid phone number');
      return;
    }

    try {
      await Users.update(user.id, payload);
      showToast('Profile updated');
      setEditing(false);
      load();
    } catch (e) {
      console.error(e);
      setErrEmail(e.message || 'Failed to update profile');
    }
  }

  if (error) {
    return (
      <div className="info-card" style={{ padding: 28, textAlign: 'center', color: '#ff8d8d' }}>
        Failed to load profile from backend.
      </div>
    );
  }

  if (!user) {
    return (
      <div className="info-card" style={{ padding: 28, textAlign: 'center', color: '#888' }}>
        Loading profile...
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {!editing && (
          <button className="btn btn-yellow" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>
      <div className="info-card" style={{ maxWidth: 1100, margin: '0 auto', padding: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22 }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: 'var(--yellow)', color: '#111', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 34 }}>
            {initials(name)}
          </div>
          <div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#fff' }}>{name}</div>
            <div className="muted" style={{ fontSize: 20 }}>
              Fleet Manager Account
            </div>
          </div>
        </div>
        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div className="field">
            <label>Full Name</label>
            <input value={name} readOnly={!editing} onChange={(e) => setName(e.target.value)} />
            <div className="field-error">{errName}</div>
          </div>
          <div className="field">
            <label>Email Address</label>
            <input value={email} readOnly={!editing} onChange={(e) => setEmail(e.target.value)} />
            <div className="field-error">{errEmail}</div>
          </div>
          <div className="field">
            <label>Phone Number</label>
            <input value={phone} readOnly={!editing} onChange={(e) => setPhone(e.target.value)} />
            <div className="field-error">{errPhone}</div>
          </div>
          <div className="field">
            <label>Company Name</label>
            <input value={company} readOnly={!editing} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div className="field">
            <label>Company Address</label>
            <input value={address} readOnly={!editing} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="field">
            <label>Number of Vehicles</label>
            <input value={numVehicles} readOnly={!editing} onChange={(e) => setNumVehicles(e.target.value)} />
          </div>
        </div>
        {editing && (
          <div className="footer-actions">
            <button className="btn btn-ghost" type="button" onClick={() => { setEditing(false); load(); }}>
              Cancel
            </button>
            <button className="btn btn-yellow" onClick={save}>
              Save Profile
            </button>
          </div>
        )}
      </div>
      <style>{`
        .profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
        .profile-actions{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:28px;padding-top:20px;border-top:1px solid var(--line)}
        .profile-actions .btn{min-width:110px;justify-content:center}
        @media (max-width:900px){.profile-grid{grid-template-columns:1fr}.profile-actions{justify-content:flex-start}}
      `}</style>
    </>
  );
}
