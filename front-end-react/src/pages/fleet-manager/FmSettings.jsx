import { usePageHeader } from '../../hooks/usePageHeader';

const workflowRules = [
  ['Default dispatch', 'Active', 'New deliveries are assigned to Raghav Reddy automatically. You can change the driver from Trips.'],
  ['Driver status updates', 'Enforced', 'Only the assigned driver can accept, pick up, start transit, or complete a trip.'],
  ['Ordered transitions', 'Enforced', 'The backend rejects skipped or invented delivery statuses.'],
  ['Cross-portal synchronization', 'Active', 'Open portals refresh from the same backend records and receive change notifications.'],
];

export default function FmSettings() {
  usePageHeader('Settings', 'Operational workflow configuration');

  return (
    <div className="settings-shell">
      <div className="settings-tabs">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Configuration</div>
        <span className="active">Fleet Workflow</span>
      </div>
      <div className="settings-main">
        <div style={{ marginBottom: 20 }}>
          <div className="section-title">Live Workflow Rules</div>
          <div className="muted">These rules are enforced by the backend and are not simulated UI preferences.</div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div className="info-card" style={{ padding: 18 }}>
            {workflowRules.map(([title, status, description]) => (
              <div className="switch" key={title}>
                <div>
                  <strong>{title}</strong>
                  <div className="muted">{description}</div>
                </div>
                <span className="pill pill-green">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
