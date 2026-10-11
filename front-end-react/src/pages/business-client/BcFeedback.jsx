import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Deliveries, Trips } from '../../api/namespaces';
import { getArray, getPickup, getDropoff } from './bcUtils';

export default function BcFeedback() {
  const [params] = useSearchParams();
  const deliveryId = params.get('id');
  const navigate = useNavigate();

  const [delivery, setDelivery] = useState(null);
  const [trip, setTrip] = useState(null);
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');
  const [deliveryQuality, setDeliveryQuality] = useState('');
  const [driverBehavior, setDriverBehavior] = useState('');
  const [overallExperience, setOverallExperience] = useState('');
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!deliveryId) {
        setMessage({ text: 'Missing delivery ID. Please open feedback from a completed delivery.', type: 'error' });
        return;
      }

      try {
        const d = await Deliveries.getOne(deliveryId);
        const tripsResult = await Trips.getAll();
        const trips = getArray(tripsResult);
        const linkedTrip = trips.find((t) => String(t.request) === String(deliveryId)) || null;

        if (cancelled) return;

        setDelivery(d);
        setTrip(linkedTrip);

        if (d.feedback) {
          setRating(Number(d.feedback.rating || 4));
          setComment(d.feedback.comment || '');
          setDeliveryQuality(d.feedback.deliveryQuality || '');
          setDriverBehavior(d.feedback.driverBehavior || '');
          setOverallExperience(d.feedback.overallExperience || '');
        }
      } catch (error) {
        console.error('Feedback page load failed:', error);
        if (!cancelled) setMessage({ text: `Could not load feedback data: ${error.message}`, type: 'error' });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [deliveryId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!delivery) {
      setMessage({ text: 'Delivery is not loaded yet.', type: 'error' });
      return;
    }

    const payload = { rating, comment: comment.trim(), deliveryQuality, driverBehavior, overallExperience };

    setSubmitting(true);
    try {
      await Deliveries.feedback(delivery.id, payload);
      setMessage({ text: 'Feedback submitted successfully. Redirecting...', type: 'success' });
      navigate('/business-client/completed-deliveries');
    } catch (error) {
      console.error('Feedback submit failed:', error);
      setMessage({ text: `Feedback submit failed: ${error.message}`, type: 'error' });
      setSubmitting(false);
    }
  }

  let packageDisplay = '--';
  if (delivery) {
    const pkgType = delivery.packageType || '';
    const pkgDims = delivery.packageDimensions;
    if (pkgType && pkgDims && pkgDims.length) {
      packageDisplay = `${pkgType} — ${pkgDims.length} × ${pkgDims.width} × ${pkgDims.height} ${pkgDims.unit || 'cm'}`;
    } else if (pkgType) {
      packageDisplay = pkgType;
    } else {
      packageDisplay = delivery.package || delivery.item || '--';
    }
  }

  return (
    <>
      <h1 className="page-title">Provide Feedback</h1>
      <p className="page-subtitle">Rate your completed delivery experience</p>

      <div className="feedback-card">
        <form id="feedbackForm" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div>
              <label>Delivery ID</label>
              <input type="text" readOnly value={delivery?.id || deliveryId || ''} />
            </div>
            <div>
              <label>Trip ID</label>
              <input type="text" readOnly value={trip?.id || '--'} />
            </div>
            <div>
              <label>Driver</label>
              <input type="text" readOnly value={trip?.driver || delivery?.driver || delivery?.assignedDriver || 'Not assigned'} />
            </div>
            <div>
              <label>Status</label>
              <input type="text" readOnly value={delivery?.status || trip?.status || '--'} />
            </div>
          </div>

          <div className="summary-box">
            <div>
              <span>From</span>
              <strong>{delivery ? getPickup(delivery) : '--'}</strong>
            </div>
            <div>
              <span>To</span>
              <strong>{delivery ? getDropoff(delivery) : '--'}</strong>
            </div>
            <div>
              <span>Package</span>
              <strong>{packageDisplay}</strong>
            </div>
          </div>

          <label>Overall Rating</label>
          <div className="stars" id="stars">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" className={v <= rating ? 'active' : ''} onClick={() => setRating(v)}>
                ★
              </button>
            ))}
          </div>

          <label>Share Your Experience</label>
          <textarea placeholder="Tell us what went well and what can be improved" value={comment} onChange={(e) => setComment(e.target.value)}></textarea>

          <div className="form-grid">
            <div>
              <label>Delivery Quality</label>
              <select value={deliveryQuality} onChange={(e) => setDeliveryQuality(e.target.value)}>
                <option value="">Select quality</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
            <div>
              <label>Driver Behavior</label>
              <select value={driverBehavior} onChange={(e) => setDriverBehavior(e.target.value)}>
                <option value="">Select behavior</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Average">Average</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>

          <label>Overall Experience</label>
          <select value={overallExperience} onChange={(e) => setOverallExperience(e.target.value)}>
            <option value="">Select experience</option>
            <option value="Very satisfied">Very satisfied</option>
            <option value="Satisfied">Satisfied</option>
            <option value="Neutral">Neutral</option>
            <option value="Unsatisfied">Unsatisfied</option>
          </select>

          {message && <div className={message.type}>{message.text}</div>}

          <div className="actions">
            <button id="submitBtn" type="submit" className="yellow-btn" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
            <Link to="/business-client/completed-deliveries" className="dark-btn">
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <style>{`
        body { font-family: Inter, sans-serif; }
        .back-link { display: inline-block; color: #9ca3af; text-decoration: none; font-size: 16px; margin-bottom: 18px; }
        .feedback-card { max-width: 980px; background: linear-gradient(135deg, #1f1f1f, #111); border: 1px solid #262626; border-radius: 22px; padding: 28px; color: #fff; box-shadow: 0 18px 40px rgba(0,0,0,.25); }
        .feedback-card .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .feedback-card label { display: block; margin: 18px 0 8px; color: #9fb0c9; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; font-size: 13px; }
        .feedback-card input, .feedback-card textarea, .feedback-card select { width: 100%; box-sizing: border-box; background: #050505; border: 1px solid #1f2937; color: #fff; border-radius: 14px; padding: 15px 16px; font-family: Inter, sans-serif; font-weight: 700; outline: none; }
        .feedback-card input:focus, .feedback-card textarea:focus, .feedback-card select:focus { border-color: #ffd400; box-shadow: 0 0 0 3px rgba(255, 212, 0, .15); }
        .feedback-card textarea { min-height: 130px; resize: vertical; }
        .feedback-card input[readonly] { opacity: .85; cursor: not-allowed; }
        .summary-box { margin-top: 18px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .summary-box div { background: #080808; border: 1px solid #262626; border-radius: 16px; padding: 16px; }
        .summary-box span { display: block; color: #9ca3af; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 6px; }
        .summary-box strong { display: block; font-size: 15px; }
        .stars { display: flex; gap: 10px; margin-bottom: 8px; }
        .stars button { background: transparent; border: none; font-size: 34px; cursor: pointer; color: #4b5563; transition: transform .15s ease, color .15s ease; }
        .stars button.active { color: #ffd400; }
        .stars button:hover { transform: scale(1.08); }
        .actions { display: flex; gap: 12px; margin-top: 20px; }
        .yellow-btn, .dark-btn { border: none; border-radius: 14px; padding: 14px 20px; font-weight: 900; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; font-family: Inter, sans-serif; }
        .yellow-btn { background: #ffd400; color: #000; }
        .yellow-btn:disabled { opacity: .6; cursor: not-allowed; }
        .dark-btn { background: #0b0b0b; color: #fff; border: 1px solid #262626; }
        .feedback-card > form > .success, .feedback-card > form > .error { margin-top: 16px; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 800; }
        .success { background: rgba(16, 185, 129, .12); border: 1px solid #10b981; color: #d1fae5; }
        .error { background: rgba(239, 68, 68, .12); border: 1px solid #ef4444; color: #fecaca; }
        @media (max-width: 800px) {
          .feedback-card .form-grid, .summary-box { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
