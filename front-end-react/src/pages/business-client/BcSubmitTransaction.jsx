import { useEffect, useState } from 'react';
import { Transactions, Documents } from '../../api/namespaces';
import { getArray, normalize, formatDate, money, resolveClientName, belongsToClient } from './bcUtils';
import { useLiveSync } from '../../hooks/useLiveSync';

function isUnpaid(invoice) {
  const s = normalize(invoice.status);
  return s.includes('unpaid') || s.includes('overdue');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function BcSubmitTransaction() {
  const [clientName, setClientName] = useState('');
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [loadFailed, setLoadFailed] = useState(false);

  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState(null);

  const [errors, setErrors] = useState({});
  const [statusMsg, setStatusMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadUnpaidInvoices() {
    try {
      const { clientName: cn } = await resolveClientName();
      setClientName(cn);
      const result = await Transactions.getInvoices();
      const invoices = getArray(result);
      const unpaid = invoices.filter((inv) => belongsToClient(inv.client || inv.customer || inv.billedTo, cn)).filter(isUnpaid);
      setUnpaidInvoices(unpaid);
      setLoadFailed(false);
    } catch (error) {
      console.error('Submit transaction backend sync failed:', error);
      setLoadFailed(true);
    }
  }

  useEffect(() => {
    loadUnpaidInvoices();
  }, []);
  useLiveSync(loadUnpaidInvoices);

  function selectInvoice(id) {
    setInvoiceId(id);
    const selected = unpaidInvoices.find((inv) => inv.id === id);
    setAmount(selected ? String(selected.total || selected.amount || '') : '');
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const selectedInvoice = unpaidInvoices.find((inv) => inv.id === invoiceId);
    const amountNum = Number(amount || 0);
    const newErrors = {};

    if (!selectedInvoice) newErrors.invoice = 'Please select a valid unpaid invoice.';
    if (!reference.trim()) newErrors.reference = 'Transaction ID/reference is required.';
    if (!amountNum || amountNum <= 0) newErrors.amount = 'Please enter a valid amount.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    const payload = {
      type: 'Payment',
      client: selectedInvoice.client || clientName,
      invoiceId,
      deliveryId: selectedInvoice.deliveryId || null,
      amount: amountNum,
      status: 'Pending',
      date: transactionDate,
      paymentMode,
      reference: reference.trim(),
      receiptName: receipt ? receipt.name : 'No receipt uploaded',
      createdAt: new Date().toISOString(),
    };

    setSubmitting(true);
    try {
      if (receipt) {
        const formData = new FormData();
        formData.append('ownerType', 'business-client');
        formData.append('documentType', 'Payment Receipt');
        formData.append('status', 'Submitted');
        formData.append('file', receipt);
        const uploaded = await Documents.create(formData);
        payload.receiptUrl = uploaded?.fileUrl || '';
      }

      await Transactions.createPayment(payload);

      setStatusMsg({ text: 'Transaction submitted successfully. Verification status will update after review.', type: 'success' });

      setInvoiceId('');
      setAmount('');
      setTransactionDate(today());
      setPaymentMode('Bank Transfer');
      setReference('');
      setReceipt(null);

      await loadUnpaidInvoices();
    } catch (error) {
      console.error('Transaction submission failed:', error);
      setStatusMsg({ text: `Transaction submission failed: ${error.message}`, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="page-title small">Submit Transaction</h1>
      <p className="page-subtitle">Upload payment proof for pending invoices</p>

      <div className="form-grid">
        <div className="card form-card">
          <form id="transactionForm" onSubmit={handleSubmit}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#a8b3c7', marginBottom: 16 }}>
              Transaction Details
            </div>

            <div className="two-col">
              <div className="field">
                <label>Invoice ID</label>
                <select required value={invoiceId} onChange={(e) => selectInvoice(e.target.value)}>
                  {unpaidInvoices.length === 0 ? (
                    <option value="">{loadFailed ? 'Could not load unpaid invoices.' : 'No unpaid invoices available'}</option>
                  ) : (
                    <>
                      <option value="">Select unpaid invoice</option>
                      {unpaidInvoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.id} - {money(invoice.total || invoice.amount || 0)}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {errors.invoice && (
                  <div style={{ color: '#ff8d8d', fontSize: 13, marginTop: 8 }}>{errors.invoice}</div>
                )}
              </div>

              <div className="field">
                <label>Transaction Date</label>
                <input type="date" required value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Payment Mode</label>
              <select required value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="field">
              <label>Transaction ID</label>
              <input type="text" placeholder="Enter payment reference" required value={reference} onChange={(e) => setReference(e.target.value)} />
              {errors.reference && <div style={{ color: '#ff8d8d', fontSize: 13, marginTop: 8 }}>{errors.reference}</div>}
            </div>

            <div className="field">
              <label>Amount</label>
              <input type="number" min="1" placeholder="Amount" required value={amount} onChange={(e) => setAmount(e.target.value)} />
              {errors.amount && <div style={{ color: '#ff8d8d', fontSize: 13, marginTop: 8 }}>{errors.amount}</div>}
            </div>

            <div className="field">
              <label>Upload Receipt</label>
              <label
                htmlFor="receipt"
                style={{
                  display: 'flex',
                  minHeight: 120,
                  border: '1px solid #374151',
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  background: '#050505',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontSize: 22 }}>↥</div>
                  <div style={{ fontWeight: 700, marginTop: 8 }}>Upload receipt</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 8 }}>{receipt ? receipt.name : 'No file selected'}</div>
                </div>
              </label>
              <input id="receipt" type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
            </div>

            {statusMsg && (
              <div
                style={{
                  display: 'block',
                  marginBottom: 14,
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

            <button type="submit" className="btn yellow" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Transaction'}
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ marginTop: 0 }}>Unpaid Invoices</h2>

          {loadFailed ? (
            <div style={{ background: '#331717', border: '1px solid #ef4444', borderRadius: 12, padding: 16, color: '#fecaca' }}>
              Could not load unpaid invoices.
            </div>
          ) : unpaidInvoices.length === 0 ? (
            <div style={{ background: '#050505', borderRadius: 12, padding: 16, color: '#cbd5e1' }}>No unpaid invoices available.</div>
          ) : (
            unpaidInvoices.map((invoice) => (
              <button
                key={invoice.id}
                type="button"
                onClick={() => selectInvoice(invoice.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: '1px solid #1f2937',
                  background: '#050505',
                  color: '#e5e7eb',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 12,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <strong>{invoice.id}</strong>
                  <strong style={{ color: 'var(--yellow)' }}>{money(invoice.total || invoice.amount || 0)}</strong>
                </div>
                <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 13 }}>
                  Due: {formatDate(invoice.dueDate)} • Status: {invoice.status}
                </div>
              </button>
            ))
          )}

          <div style={{ marginTop: 20 }}>
            <strong>Important</strong>
            <ul style={{ color: '#d1d5db', lineHeight: 1.6 }}>
              <li>Attach a clear screenshot or receipt.</li>
              <li>Reference number must match the payment transaction.</li>
              <li>Verification status will update after review.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
