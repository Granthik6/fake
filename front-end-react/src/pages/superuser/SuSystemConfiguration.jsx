import { useEffect, useState } from 'react';
import { Settings, Payouts } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { Icon } from '../../components/Icon';

export default function SuSystemConfiguration() {
  usePageHeader('System Configuration');
  const { showToast } = useToast();

  const [platform, setPlatform] = useState({ name: 'DeliverSync', timezone: 'Asia/Kolkata', language: 'English', logo: '' });
  const [security, setSecurity] = useState({ passwordLength: 8, failedAttempts: 5, sessionTimeout: 30 });
  const [platformFailed, setPlatformFailed] = useState(false);
  const [securityFailed, setSecurityFailed] = useState(false);

  const [commissionRate, setCommissionRate] = useState(null);
  const [commissionInput, setCommissionInput] = useState('');
  const [minimumFleetMarginInput, setMinimumFleetMarginInput] = useState('15');
  const [commissionFailed, setCommissionFailed] = useState(false);

  const [rateCard, setRateCard] = useState(null);
  const [rateCardFailed, setRateCardFailed] = useState(false);
  const [rcBaseFare, setRcBaseFare] = useState('');
  const [rcPerKm, setRcPerKm] = useState('');
  const [rcPerKg, setRcPerKg] = useState('');
  const [customerBaseFare, setCustomerBaseFare] = useState('');
  const [customerPerKm, setCustomerPerKm] = useState('');
  const [customerPerKg, setCustomerPerKg] = useState('');

  async function loadCommission() {
    try {
      const { commissionRate: rate, minimumFleetMarginPercent } = await Settings.getEconomics();
      setCommissionRate(rate);
      setCommissionInput(String(rate));
      setMinimumFleetMarginInput(String(minimumFleetMarginPercent));
      setCommissionFailed(false);
    } catch {
      setCommissionFailed(true);
    }
  }

  async function loadRateCard() {
    try {
      const card = await Payouts.getPlatformRateCard();
      setRateCard(card);
      setRcBaseFare(String(card.baseFare));
      setRcPerKm(String(card.perKm));
      setRcPerKg(String(card.perKg));
      setCustomerBaseFare(String(card.customerBaseFare));
      setCustomerPerKm(String(card.customerPerKm));
      setCustomerPerKg(String(card.customerPerKg));
      setRateCardFailed(false);
    } catch {
      setRateCardFailed(true);
    }
  }

  async function loadPlatform() {
    try {
      const p = await Settings.getPlatform();
      setPlatform((prev) => ({ ...prev, ...p }));
      setPlatformFailed(false);
    } catch {
      setPlatformFailed(true);
    }
  }

  async function loadSecurity() {
    try {
      const s = await Settings.getSecurity();
      setSecurity((prev) => ({ ...prev, ...s }));
      setSecurityFailed(false);
    } catch {
      setSecurityFailed(true);
    }
  }

  useEffect(() => {
    loadCommission();
    loadRateCard();
    loadPlatform();
    loadSecurity();
  }, []);

  function onLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPlatform((p) => ({ ...p, logo: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  async function savePlatform() {
    try {
      const updated = await Settings.updatePlatform(platform);
      setPlatform((prev) => ({ ...prev, ...updated }));
      showToast('Platform settings saved');
    } catch (e) {
      alert(e.message || 'Failed to save platform settings');
    }
  }

  async function saveSecurity() {
    try {
      const updated = await Settings.updateSecurity({
        passwordLength: security.passwordLength,
        failedAttempts: security.failedAttempts,
        sessionTimeout: security.sessionTimeout,
      });
      setSecurity((prev) => ({ ...prev, ...updated }));
      showToast('Security settings saved');
    } catch (e) {
      alert(e.message || 'Failed to save security settings');
    }
  }

  async function saveCommission() {
    const rate = Number(commissionInput);
    const margin = Number(minimumFleetMarginInput);
    if (Number.isNaN(rate) || Number.isNaN(margin) || rate < 0 || margin < 0 || rate + margin >= 100) {
      alert('Commission and fleet margin must be non-negative and total less than 100%.');
      return;
    }
    try {
      await Settings.updateEconomics({ commissionRate: rate, minimumFleetMarginPercent: margin });
      showToast('Revenue economics saved');
      loadCommission();
    } catch (e) {
      alert(e.message || 'Failed to save commission rate.');
    }
  }

  async function saveRateCard() {
    const baseFare = Number(rcBaseFare);
    const perKm = Number(rcPerKm);
    const perKg = Number(rcPerKg);
    const customerBase = Number(customerBaseFare);
    const customerKm = Number(customerPerKm);
    const customerKg = Number(customerPerKg);
    if (!(baseFare > 0) || !(perKm > 0) || !(perKg > 0) || !(customerBase > 0) || !(customerKm > 0) || !(customerKg > 0)) {
      alert('All rate card values must be positive numbers.');
      return;
    }
    try {
      await Payouts.setPlatformRateCard({
        baseFare,
        perKm,
        perKg,
        customerBaseFare: customerBase,
        customerPerKm: customerKm,
        customerPerKg: customerKg,
      });
      showToast('Platform rate card saved');
      loadRateCard();
    } catch (e) {
      alert(e.message || 'Failed to save rate card.');
    }
  }

  return (
    <>
      <div className="content-card settings-section">
        <div className="settings-head">
          <div className="settings-icon">{Icon.gear}</div>
          <div>
            <strong>Platform Settings</strong>
            <span>Configure general platform parameters</span>
          </div>
        </div>
        <div className="settings-body">
          <div className="field">
            <label>Platform Name</label>
            <input value={platform.name} onChange={(e) => setPlatform((p) => ({ ...p, name: e.target.value }))} />
            <div className="form-note">This name appears across the platform</div>
          </div>
          <div className="field">
            <label>Company Logo</label>
            <div className="upload-box">
              {platform.logo && <img src={platform.logo} className="logo-preview" />}
              <div className="upload-icon-box">{Icon.upload}</div>
              <strong>Upload Company Logo</strong>
              <div className="subdued">PNG, JPG or SVG (max 2MB)</div>
              <label className="btn-yellow btn-small" htmlFor="logoInput">Choose File</label>
              <input id="logoInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogoChange} />
            </div>
          </div>
          <div className="field">
            <label>Default Timezone</label>
            <select value={platform.timezone} onChange={(e) => setPlatform((p) => ({ ...p, timezone: e.target.value }))}>
              <option>Asia/Kolkata</option>
              <option>UTC</option>
              <option>America/New_York</option>
              <option>Europe/London</option>
            </select>
          </div>
          <div className="field">
            <label>Default Language</label>
            <select value={platform.language} onChange={(e) => setPlatform((p) => ({ ...p, language: e.target.value }))}>
              <option>English</option>
              <option>Hindi</option>
              <option>Telugu</option>
            </select>
          </div>
          <button className="btn-yellow" onClick={savePlatform}>Save Platform Settings</button>
        </div>
      </div>

      <div className="content-card settings-section">
        <div className="settings-head">
          <div className="settings-icon">{Icon.shield}</div>
          <div>
            <strong>Security Settings</strong>
            <span>Manage system security and authentication</span>
          </div>
        </div>
        <div className="settings-body">
          <div className="field">
            <label>Password Minimum Length</label>
            <input type="number" value={security.passwordLength} onChange={(e) => setSecurity((s) => ({ ...s, passwordLength: +e.target.value || 8 }))} />
            <div className="form-note">Minimum characters required for passwords</div>
          </div>
          <div className="field">
            <label>Failed Login Attempts</label>
            <input type="number" value={security.failedAttempts} onChange={(e) => setSecurity((s) => ({ ...s, failedAttempts: +e.target.value || 5 }))} />
            <div className="form-note">Maximum failed attempts before a 15-minute account lock</div>
          </div>
          <div className="field">
            <label>Session Timeout (minutes)</label>
            <input type="number" value={security.sessionTimeout} onChange={(e) => setSecurity((s) => ({ ...s, sessionTimeout: +e.target.value || 30 }))} />
            <div className="form-note">JWT session lifetime issued at sign-in</div>
          </div>
          <div style={{ marginTop: 22 }}>
            <button className="btn-yellow" onClick={saveSecurity}>Save Security Settings</button>
          </div>
        </div>
      </div>

      <div className="content-card settings-section">
        <div className="settings-head">
          <div className="settings-icon">{Icon.gear}</div>
          <div>
            <strong>Revenue Economics</strong>
            <span>Protect platform commission and a minimum fleet margin on every pricing component</span>
          </div>
        </div>
        <div className="settings-body">
          {commissionFailed && <div style={{ color: '#ff6b6b', padding: '8px 0' }}>Failed to load commission rate.</div>}
          {!commissionFailed && commissionRate === null && <div style={{ color: '#b9b9b9', padding: '8px 0' }}>Loading commission rate...</div>}
          {!commissionFailed && commissionRate !== null && (
            <>
              <div className="field">
                <label>Platform Commission (%)</label>
                <input type="number" min={0} max={80} step={0.1} value={commissionInput} onChange={(e) => setCommissionInput(e.target.value)} />
              </div>
              <div className="field">
                <label>Minimum Fleet Margin (%)</label>
                <input type="number" min={0} max={80} step={0.1} value={minimumFleetMarginInput} onChange={(e) => setMinimumFleetMarginInput(e.target.value)} />
              </div>
              <div className="form-note">Customer prices must cover driver payout plus both percentages. Historical transactions keep their original commission snapshot.</div>
              <button className="btn-yellow" style={{ marginTop: 12 }} onClick={saveCommission}>Save Economics</button>
            </>
          )}
        </div>
      </div>

      <div className="content-card settings-section">
        <div className="settings-head">
          <div className="settings-icon">{Icon.gear}</div>
          <div>
            <strong>Platform Pricing & Driver Payout Floors</strong>
            <span>Customer selling prices and the minimum amounts used to calculate driver earnings</span>
          </div>
        </div>
        <div className="settings-body">
          {rateCardFailed && <div style={{ color: '#ff6b6b', padding: '8px 0' }}>Failed to load rate card.</div>}
          {!rateCardFailed && !rateCard && <div style={{ color: '#b9b9b9', padding: '8px 0' }}>Loading rate card...</div>}
          {!rateCardFailed && rateCard && (
            <>
              <div className="field">
                <label>Minimum Driver Base Payout (₹ per trip)</label>
                <input type="number" min={0} step={0.01} value={rcBaseFare} onChange={(e) => setRcBaseFare(e.target.value)} />
              </div>
              <div className="field">
                <label>Minimum Driver Rate per Km (₹)</label>
                <input type="number" min={0} step={0.01} value={rcPerKm} onChange={(e) => setRcPerKm(e.target.value)} />
              </div>
              <div className="field">
                <label>Minimum Driver Rate per Kg (₹)</label>
                <input type="number" min={0} step={0.01} value={rcPerKg} onChange={(e) => setRcPerKg(e.target.value)} />
              </div>
              <div className="field">
                <label>Default Customer Base Price (₹ per trip)</label>
                <input type="number" min={0} step={0.01} value={customerBaseFare} onChange={(e) => setCustomerBaseFare(e.target.value)} />
              </div>
              <div className="field">
                <label>Default Customer Price per Km (₹)</label>
                <input type="number" min={0} step={0.01} value={customerPerKm} onChange={(e) => setCustomerPerKm(e.target.value)} />
              </div>
              <div className="field">
                <label>Default Customer Price per Kg (₹)</label>
                <input type="number" min={0} step={0.01} value={customerPerKg} onChange={(e) => setCustomerPerKg(e.target.value)} />
              </div>
              <div className="form-note">The backend rejects customer rates that cannot fund driver payout, commission, and the configured fleet margin.</div>
              <button className="btn-yellow" style={{ marginTop: 12 }} onClick={saveRateCard}>Save Rate Card</button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
