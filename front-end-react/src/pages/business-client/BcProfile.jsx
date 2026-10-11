import { useEffect, useState } from 'react';
import { getSession } from '../../api/client';
import { Users } from '../../api/namespaces';

const ROLE = 'business-client';

function getUserDisplay(user) {
  const first = user.firstName || '';
  const last = user.lastName || '';
  const full = user.fullName || user.name || `${first} ${last}`.trim();
  const profileDetails = user.profileDetails || {};

  return {
    companyName: user.company || user.companyName || user.organization || profileDetails.companyName || full || 'Not available',
    fullName: full || profileDetails.fullName || user.customer || 'Not available',
    email: user.email || 'Not available',
    phone: user.phone || user.contact || profileDetails.companyContactNumber || '--',
    address: user.address || user.location || profileDetails.businessAddress || 'Not available',
  };
}

export default function BcProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [statusMsg, setStatusMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  function fillForm(user) {
    const d = getUserDisplay(user);
    setCompanyName(d.companyName);
    setFullName(d.fullName);
    setEmail(d.email);
    setPhone(d.phone);
    setAddress(d.address);
  }

  async function loadProfile() {
    try {
      const session = getSession();
      if (!session || !session.userId) {
        throw new Error('No active session. Please log in again.');
      }
      const user = await Users.getById(session.userId);
      if (!user || String(user.id) !== String(session.userId)) {
        throw new Error("Could not load the logged-in business client's profile.");
      }
      setCurrentUser(user);
      fillForm(user);
      setLoadError('');
    } catch (error) {
      console.error('Profile backend sync failed:', error);
      setCurrentUser(null);
      setLoadError(`Unable to load your profile: ${error.message}`);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    const payload = {
      name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      companyName: companyName.trim(),
      company: companyName.trim(),
      address: address.trim(),
      role: currentUser.role || ROLE,
      status: currentUser.status || 'Active',
    };

    setSaving(true);
    try {
      const response = await Users.update(currentUser.id, payload);
      const updated = response || payload;
      setCurrentUser(updated);
      fillForm(updated);
      setIsEditing(false);
      setStatusMsg({ text: 'Profile updated successfully.', type: 'success' });
    } catch (error) {
      console.error('Profile update failed:', error);
      setStatusMsg({ text: `Profile update failed: ${error.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const initials =
    companyName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase() || 'AI';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
        <div>
          <h1 className="page-title small">Profile Settings</h1>
          <p className="page-subtitle">Manage your company information</p>
        </div>

        <button
          className="btn yellow"
          style={{ padding: '12px 24px' }}
          onClick={() => {
            setIsEditing((prev) => !prev);
            setStatusMsg(null);
          }}
        >
          {isEditing ? 'Cancel' : '✎ Edit'}
        </button>
      </div>

      <div className="card" style={{ maxWidth: 900, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginBottom: 26 }}>
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: 18,
              background: 'var(--yellow)',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              fontWeight: 900,
            }}
          >
            {initials}
          </div>

          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{companyName || 'Business Account'}</div>
            <div style={{ color: '#9ca3af', marginTop: 6 }}>{email || 'Loaded'}</div>
          </div>
        </div>

        <div style={{ height: 1, background: '#262626', marginBottom: 24 }}></div>

        {loadError && (
          <div style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 16 }}>{loadError}</div>
        )}

        <form id="profileForm" onSubmit={handleSubmit}>
          <div className="profile-field">
            <label>Company Name</label>
            <input type="text" disabled={!isEditing} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>

          <div className="profile-field">
            <label>Full Name</label>
            <input type="text" disabled={!isEditing} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="profile-field">
            <label>Email Address</label>
            <input type="email" disabled={!isEditing} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="profile-field">
            <label>Phone Number</label>
            <input type="text" disabled={!isEditing} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="profile-field">
            <label>Address</label>
            <input type="text" disabled={!isEditing} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          {statusMsg && (
            <div
              style={{
                display: 'block',
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                fontSize: 14,
                background: statusMsg.type === 'error' ? '#331717' : '#0f2e1a',
                border: statusMsg.type === 'error' ? '1px solid #ef4444' : '1px solid #10b981',
                color: statusMsg.type === 'error' ? '#fecaca' : '#d1fae5',
              }}
            >
              {statusMsg.text}
            </div>
          )}

          {isEditing && (
            <button type="submit" className="btn yellow" style={{ marginTop: 20, padding: '12px 24px' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </form>
      </div>

      <style>{`
        .profile-field { margin-bottom: 18px; }
        .profile-field label { display: block; margin-bottom: 8px; color: #a8b3c7; font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .profile-field input { width: 100%; height: 54px; border: 1px solid #1f2937; border-radius: 12px; background: #050505; color: #ffffff; padding: 0 16px; font-size: 15px; outline: none; }
        .profile-field input:disabled { color: #d1d5db; opacity: 0.9; }
        .profile-field input:not(:disabled) { border-color: var(--yellow); }
      `}</style>
    </>
  );
}
