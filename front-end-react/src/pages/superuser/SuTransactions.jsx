import { useEffect, useState } from 'react';
import { Transactions, Payouts } from '../../api/namespaces';
import { usePageHeader } from '../../hooks/usePageHeader';
import { useToast } from '../../hooks/useToast';
import { statusClass, Icon } from '../../components/Icon';
import Modal from '../../components/Modal';
import { useLiveSync } from '../../hooks/useLiveSync';

function money(value) {
  if (value === undefined || value === null || value === '') return '--';
  const raw = String(value).replace(/[₹,]/g, '').trim();
  if (!raw || isNaN(Number(raw))) return String(value).startsWith('₹') ? String(value) : String(value);
  return `₹${Number(raw).toLocaleString('en-IN')}`;
}

function dateText(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toLocaleDateString('en-IN');
  return String(value);
}

function InvoiceModal({ inv, onClose }) {
  const baseCost = Number(inv.baseCost || 0);
  const tax = Number(inv.tax || inv.taxAmount || 0);
  const total = Number(inv.total || inv.totalAmount || inv.amount || 0);

  return (
    <Modal onClose={onClose}>
      <div className="content-card details-card modal-detail-card standalone-modal">
        <div className="details-top">
          <div className="details-title">Invoice {inv.id || inv.invoiceId}</div>
          <button className="close-icon" onClick={onClose}>×</button>
        </div>
        <div className="details-body modal-detail-body">
          <div className="detail-block full"><div className="detail-label">Client</div><div className="detail-main">{Icon.user}{inv.client || '-'}</div></div>
          <div className="detail-block full"><div className="detail-label">Address</div><div className="detail-main">{Icon.map}{inv.address || '-'}</div></div>
          <div className="detail-block full"><div className="detail-label">Route</div><div className="detail-main">{Icon.map}{inv.pickup || '-'} &rarr; {inv.dropoff || '-'}</div></div>
          <div className="detail-block"><div className="detail-label">Driver</div><div className="detail-main">{Icon.user}{inv.driver || 'Not assigned'}</div></div>
          <div className="detail-block"><div className="detail-label">Status</div><div className="detail-main"><span className={`status-pill ${statusClass(inv.status)}`}>{inv.status || 'Unpaid'}</span></div></div>
          <div className="detail-block"><div className="detail-label">Invoice Date</div><div className="detail-main">{Icon.calendar}{inv.invoiceDate || inv.date || '-'}</div></div>
          <div className="detail-block"><div className="detail-label">Due Date</div><div className="detail-main">{Icon.calendar}{inv.dueDate || '-'}</div></div>
          <div className="detail-block full inv-amount-block">
            <div className="detail-label">Amount Breakdown</div>
            <div className="inv-amount-row"><span>Base Cost</span><span>{money(baseCost)}</span></div>
            <div className="inv-amount-row"><span>Tax</span><span>{money(tax)}</span></div>
            <div className="inv-amount-row inv-amount-total"><span>Total</span><span>{money(total)}</span></div>
          </div>
        </div>
        <div className="detail-footer"><button className="btn-yellow close-wide" onClick={onClose}>Close</button></div>
      </div>
      <style>{`
        .inv-amount-block{background:rgba(255,212,0,.04) !important}
        .inv-amount-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:14px;color:#c9c9c9;font-weight:600}
        .inv-amount-total{margin-top:6px;padding-top:12px;border-top:1px dashed #2f2f2f;font-size:18px;font-weight:900;color:var(--yellow)}
      `}</style>
    </Modal>
  );
}

const linkBtn = { background: 'transparent', border: '1px solid #f7d10a', color: '#f7d10a', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' };
const refundBtn = { background: 'transparent', border: '1px solid #ef4444', color: '#ff6b6b', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer' };

export default function SuTransactions() {
  usePageHeader('Transactions');
  const { showToast } = useToast();

  const [revenue, setRevenue] = useState(null);
  const [revenueFailed, setRevenueFailed] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [txns, setTxns] = useState([]);
  const [driverPayouts, setDriverPayouts] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [txnSearch, setTxnSearch] = useState('');
  const [invoicePage, setInvoicePage] = useState(1);
  const [txnPage, setTxnPage] = useState(1);
  const pageSize = 10;
  const [invoiceModal, setInvoiceModal] = useState(null);

  const [settlements, setSettlements] = useState([]);
  const [settlementFailed, setSettlementFailed] = useState(false);
  const [settlementSearch, setSettlementSearch] = useState('');
  const [settlementPage, setSettlementPage] = useState(1);

  async function loadRevenue() {
    try {
      setRevenue(await Transactions.getRevenueSummary());
      setRevenueFailed(false);
    } catch {
      setRevenueFailed(true);
    }
  }

  async function loadMain() {
    try {
      const [transactions, invs, payouts] = await Promise.all([
        Transactions.getPayments(),
        Transactions.getInvoices(),
        Payouts.listDriverPayouts(),
      ]);
      setTxns(transactions || []);
      setInvoices(invs || []);
      setDriverPayouts(payouts || []);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }

  async function loadSettlements() {
    try {
      setSettlements((await Payouts.listSettlements()) || []);
      setSettlementFailed(false);
    } catch {
      setSettlementFailed(true);
    }
  }

  useEffect(() => {
    loadRevenue();
    loadMain();
    loadSettlements();
  }, []);
  useLiveSync(async () => {
    await Promise.all([loadRevenue(), loadMain(), loadSettlements()]);
  });

  const invQ = invoiceSearch.trim().toLowerCase();
  const filteredInvoices = invoices.filter((inv) => !invQ || JSON.stringify(inv).toLowerCase().includes(invQ));
  const totalInvoicePages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const curInvoicePage = Math.min(invoicePage, totalInvoicePages);
  const pageInvoices = filteredInvoices.slice((curInvoicePage - 1) * pageSize, curInvoicePage * pageSize);

  const txnQ = txnSearch.trim().toLowerCase();
  const filteredTxns = txns.filter((t) => !txnQ || JSON.stringify(t).toLowerCase().includes(txnQ));
  const totalTxnPages = Math.max(1, Math.ceil(filteredTxns.length / pageSize));
  const curTxnPage = Math.min(txnPage, totalTxnPages);
  const pageTxns = filteredTxns.slice((curTxnPage - 1) * pageSize, curTxnPage * pageSize);

  const setQ = settlementSearch.trim().toLowerCase();
  const filteredSettlements = settlements.filter((s) => !setQ || JSON.stringify(s).toLowerCase().includes(setQ));
  const totalSettlementPages = Math.max(1, Math.ceil(filteredSettlements.length / pageSize));
  const curSettlementPage = Math.min(settlementPage, totalSettlementPages);
  const pageSettlements = filteredSettlements.slice((curSettlementPage - 1) * pageSize, curSettlementPage * pageSize);

  function openInvoiceById(id) {
    const inv = invoices.find((i) => String(i.id || i.invoiceId) === String(id));
    if (inv) setInvoiceModal(inv);
  }

  async function reviewPayment(transaction, status) {
    try {
      await Transactions.updatePaymentStatus(transaction.id, status);
      showToast(`Payment ${status.toLowerCase()}`);
      await Promise.all([loadMain(), loadRevenue()]);
    } catch (error) {
      alert(error.message || `Failed to mark payment ${status.toLowerCase()}.`);
    }
  }

  async function refund(t, remaining) {
    const input = prompt(`Remaining refundable: ₹${remaining.toLocaleString('en-IN')}.\n\nEnter amount to refund (leave blank for a FULL refund of the remaining balance):`);
    if (input === null) return;
    let amount;
    if (input.trim() !== '') {
      amount = Number(input);
      if (Number.isNaN(amount) || amount <= 0) {
        alert('Refund amount must be a number greater than zero.');
        return;
      }
      if (amount > remaining) {
        alert(`Refund amount cannot exceed the remaining refundable amount (₹${remaining.toLocaleString('en-IN')}).`);
        return;
      }
    }
    const reason = prompt('Reason for refund (shown to the business client):') || '';
    if (!confirm(`Refund ${amount ? '₹' + amount.toLocaleString('en-IN') : 'the full remaining amount'} for transaction ${t.id}? This reverses the platform commission proportionally; the driver keeps their payout.`)) return;
    try {
      await Transactions.refund(t.id, amount, reason);
      showToast('Refund processed');
      await Promise.all([loadMain(), loadRevenue()]);
    } catch (e) {
      alert(e.message || 'Failed to refund transaction.');
    }
  }

  async function lockSettlement(s) {
    if (!confirm(`Lock the ${s.month} settlement for this fleet manager? Its statement will be frozen; later refunds will show up as adjustments in the current open period instead.`)) return;
    try {
      await Payouts.lockSettlement(s.fleetManagerId, s.month);
      showToast('Settlement locked');
      loadSettlements();
    } catch (e) {
      alert(e.message || 'Failed to lock settlement.');
    }
  }

  async function markPayoutPaid(id) {
    try {
      await Payouts.markPayoutPaid(id);
      showToast('Driver payout marked paid');
      loadMain();
    } catch (e) {
      alert(e.message || 'Failed to mark payout paid.');
    }
  }

  return (
    <>
      <div className="content-card table-card" style={{ marginBottom: 18 }}>
        <div className="table-head">
          <div>
            <h3>Platform Revenue</h3>
            <div className="subdued" style={{ marginTop: 6 }}>Delivery commission, calculated from successful backend transactions.</div>
          </div>
        </div>
        <div className="kpi-grid" style={{ marginTop: 16 }}>
          {revenueFailed && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#ff6b6b', padding: 18 }}>Failed to load revenue summary.</div>}
          {!revenueFailed && !revenue && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#b9b9b9', padding: 18 }}>Loading revenue...</div>}
          {!revenueFailed && revenue && (
            <>
              <div className="content-card kpi"><div className="label">Delivery Commission</div><div className="value">{money(revenue.deliveryCommission)}</div><div className="delta">↗ Live</div></div>
              <div className="content-card kpi"><div className="label">Total Platform Revenue</div><div className="value">{money(revenue.totalRevenue)}</div><div className="delta">↗ Live</div></div>
              <div className="content-card kpi"><div className="label">Gross Booking Value</div><div className="value">{money(revenue.grossBookingValue)}</div><div className="delta">Before refunds</div></div>
              <div className="content-card kpi"><div className="label">Net Processed Value</div><div className="value">{money(revenue.netProcessedValue)}</div><div className="delta">After refunds</div></div>
            </>
          )}
        </div>
      </div>

      <div className="content-card table-card">
        <div className="table-head">
          <div>
            <h3>Billing & Payments</h3>
            <div className="subdued" style={{ marginTop: 6 }}>Invoices and submitted payment transactions loaded.</div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>Invoices</h3>
            <input className="mini-input" placeholder="Search by invoice ID, client, status..." value={invoiceSearch} onChange={(e) => { setInvoiceSearch(e.target.value); setInvoicePage(1); }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {loadFailed && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#ff6b6b', padding: 18 }}>Failed to load invoices.</td></tr>}
                {!loadFailed && pageInvoices.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#b9b9b9', padding: 18 }}>{invQ ? 'No invoices match your search.' : 'No invoices found.'}</td></tr>}
                {!loadFailed && pageInvoices.map((inv) => {
                  const invId = inv.id || inv.invoiceId || '-';
                  return (
                    <tr key={invId}>
                      <td>{invId}</td>
                      <td>{inv.client || inv.customer || inv.businessClient || '-'}</td>
                      <td>{money(inv.amount)}</td>
                      <td>{inv.dueDate || dateText(inv.createdAt) || '-'}</td>
                      <td><span className={`status-pill ${statusClass(inv.status)}`}>{inv.status || 'Unpaid'}</span></td>
                      <td><button style={linkBtn} onClick={() => openInvoiceById(invId)}>View</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loadFailed && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
              <div className="subdued">Showing <strong>{pageInvoices.length}</strong> of <strong>{filteredInvoices.length}</strong> invoices</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn-yellow" disabled={curInvoicePage <= 1} style={{ padding: '6px 14px', opacity: curInvoicePage <= 1 ? 0.5 : 1 }} onClick={() => setInvoicePage((p) => p - 1)}>Prev</button>
                <span className="subdued">Page {curInvoicePage} of {totalInvoicePages}</span>
                <button className="btn-yellow" disabled={curInvoicePage >= totalInvoicePages} style={{ padding: '6px 14px', opacity: curInvoicePage >= totalInvoicePages ? 0.5 : 1 }} onClick={() => setInvoicePage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>Submitted transactions</h3>
            <input className="mini-input" placeholder="Search by transaction ID, client, invoice, mode, status..." value={txnSearch} onChange={(e) => { setTxnSearch(e.target.value); setTxnPage(1); }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr><th>Invoice</th><th>Date</th><th>Mode</th><th>Transaction ID</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loadFailed && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#ff6b6b', padding: 18 }}>Failed to load transactions.</td></tr>}
                {!loadFailed && pageTxns.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#b9b9b9', padding: 18 }}>{txnQ ? 'No transactions match your search.' : 'No transactions submitted yet.'}</td></tr>}
                {!loadFailed && pageTxns.map((t) => {
                  const isSuccess = ['completed', 'approved', 'paid'].includes(String(t.status || '').toLowerCase());
                  const refundedAmount = Number(t.refundedAmount || 0);
                  const remaining = Number((Number(t.amount || 0) - refundedAmount).toFixed(2));
                  const canRefund = t.transactionType === 'delivery-payment' && isSuccess && remaining > 0.01;
                  const canReview = ['pending', 'under review'].includes(String(t.status || '').toLowerCase());
                  let statusLabel = t.status || 'Status unavailable';
                  if (t.refunded) statusLabel = 'Refunded';
                  else if (refundedAmount > 0) statusLabel = 'Partially Refunded';
                  return (
                    <tr key={t.id}>
                      <td>{t.invoice || t.invoiceId || '-'}</td>
                      <td>{t.date || dateText(t.createdAt)}</td>
                      <td>{t.mode || t.paymentMode || 'Payment'}</td>
                      <td>{t.transactionId || t.id || '-'}</td>
                      <td>
                        {money(t.amount)}
                        {refundedAmount > 0 && <div className="subdued" style={{ fontSize: 12 }}>Refunded {money(refundedAmount)} &middot; Remaining {money(remaining)}</div>}
                      </td>
                      <td><span className={`status-pill ${statusClass(t.status)}`}>{statusLabel}</span></td>
                      <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(t.invoiceId || t.invoice) && <button style={linkBtn} onClick={() => openInvoiceById(t.invoiceId || t.invoice)}>Invoice</button>}
                        {t.receiptUrl && <a style={linkBtn} href={t.receiptUrl} target="_blank" rel="noopener noreferrer">Receipt</a>}
                        {canReview && <button style={linkBtn} onClick={() => reviewPayment(t, 'Approved')}>Approve</button>}
                        {canReview && <button style={refundBtn} onClick={() => reviewPayment(t, 'Rejected')}>Reject</button>}
                        {canRefund && <button style={refundBtn} onClick={() => refund(t, remaining)}>Refund</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loadFailed && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
              <div className="subdued">Showing <strong>{pageTxns.length}</strong> of <strong>{filteredTxns.length}</strong> transactions</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button className="btn-yellow" disabled={curTxnPage <= 1} style={{ padding: '6px 14px', opacity: curTxnPage <= 1 ? 0.5 : 1 }} onClick={() => setTxnPage((p) => p - 1)}>Prev</button>
                <span className="subdued">Page {curTxnPage} of {totalTxnPages}</span>
                <button className="btn-yellow" disabled={curTxnPage >= totalTxnPages} style={{ padding: '6px 14px', opacity: curTxnPage >= totalTxnPages ? 0.5 : 1 }} onClick={() => setTxnPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="content-card table-card" style={{ marginTop: 18 }}>
        <div className="table-head">
          <div>
            <h3>Driver Payouts</h3>
            <div className="subdued" style={{ marginTop: 6 }}>Earned payouts become approved only after the customer payment is verified.</div>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Payout</th><th>Driver</th><th>Trip</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {driverPayouts.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#b9b9b9', padding: 18 }}>No driver payouts recorded.</td></tr>}
              {driverPayouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{payout.id}</td><td>{payout.driverName}</td><td>{payout.tripId}</td>
                  <td>{money(payout.totalAmount)}</td>
                  <td><span className={`status-pill ${statusClass(payout.status)}`}>{payout.status || 'Paid'}</span></td>
                  <td>{payout.status === 'Approved' ? <button style={linkBtn} onClick={() => markPayoutPaid(payout.id)}>Mark Paid</button> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="content-card table-card" style={{ marginTop: 18 }}>
        <div className="table-head">
          <div>
            <h3>Fleet Manager Settlements</h3>
            <div className="subdued" style={{ marginTop: 6 }}>Monthly settlement periods. Locking a period freezes its statement so later refunds cannot silently change it.</div>
          </div>
          <input className="mini-input" placeholder="Search by fleet manager or month..." value={settlementSearch} onChange={(e) => { setSettlementSearch(e.target.value); setSettlementPage(1); }} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Fleet Manager</th><th>Month</th><th>Net Amount</th><th>Status</th><th>Locked Date</th><th>Action</th></tr>
            </thead>
            <tbody>
              {settlementFailed && <tr><td colSpan={6} style={{ textAlign: 'center', color: '#ff6b6b', padding: 18 }}>Failed to load settlements.</td></tr>}
              {!settlementFailed && pageSettlements.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#b9b9b9', padding: 18 }}>{setQ ? 'No settlements match your search.' : "No settlement periods yet. A period is created the first time a fleet manager's statement is viewed."}</td></tr>
              )}
              {!settlementFailed && pageSettlements.map((s, i) => (
                <tr key={i}>
                  <td>{s.fleetManagerName || s.fleetManagerId}</td>
                  <td>{s.month}</td>
                  <td>{money(s.netIncome)}</td>
                  <td><span className={`status-pill ${s.status === 'locked' ? 'blocked' : 'active'}`}>{s.status === 'locked' ? 'Locked' : 'Open'}</span></td>
                  <td>{s.lockedAt ? dateText(s.lockedAt) : '-'}</td>
                  <td>{s.status === 'open' ? <button style={linkBtn} onClick={() => lockSettlement(s)}>Lock</button> : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!settlementFailed && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
            <div className="subdued">Showing <strong>{pageSettlements.length}</strong> of <strong>{filteredSettlements.length}</strong> settlements</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="btn-yellow" disabled={curSettlementPage <= 1} style={{ padding: '6px 14px', opacity: curSettlementPage <= 1 ? 0.5 : 1 }} onClick={() => setSettlementPage((p) => p - 1)}>Prev</button>
              <span className="subdued">Page {curSettlementPage} of {totalSettlementPages}</span>
              <button className="btn-yellow" disabled={curSettlementPage >= totalSettlementPages} style={{ padding: '6px 14px', opacity: curSettlementPage >= totalSettlementPages ? 0.5 : 1 }} onClick={() => setSettlementPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      {invoiceModal && <InvoiceModal inv={invoiceModal} onClose={() => setInvoiceModal(null)} />}
    </>
  );
}
