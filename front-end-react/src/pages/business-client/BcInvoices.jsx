import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Transactions } from '../../api/namespaces';
import { getArray, normalize, cleanId, formatDate, resolveClientName, belongsToClient } from './bcUtils';
import { useLiveSync } from '../../hooks/useLiveSync';

function getInvoiceId(invoice) {
  return invoice.id || invoice.invoiceId || invoice.invoiceNo || invoice.invoiceNumber || invoice.number || '--';
}

function getClient(invoice) {
  return invoice.client || invoice.customer || invoice.company || invoice.billedTo || '';
}

function getStatus(invoice) {
  return invoice.status || invoice.paymentStatus || 'Pending';
}

function getDeliveryId(invoice) {
  return invoice.deliveryId || invoice.delivery || invoice.request || invoice.deliveryRequestId || invoice.deliveryRequest || invoice.requestId || '--';
}

function getDueDate(invoice) {
  return invoice.dueDate || invoice.due || invoice.paymentDue || invoice.paymentDueDate || '--';
}

function getInvoiceDate(invoice) {
  return invoice.date || invoice.invoiceDate || invoice.createdAt || '--';
}

function getAmount(invoice) {
  return invoice.totalAmount || invoice.total || invoice.amount || invoice.baseCost || 0;
}

function formatMoney(amount) {
  const value = Number(amount || 0);
  if (Number.isNaN(value)) return '₹0';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function statusClass(status) {
  const s = normalize(status);
  if (s === 'paid' || s === 'completed' || s === 'payment received' || s === 'received') return 'status-paid';
  if (s === 'under review' || s === 'review' || s === 'pending') return 'status-under-review';
  if (s === 'rejected' || s === 'unpaid' || s === 'failed') return 'status-rejected';
  return 'status-pending';
}

function isPaidInvoice(invoice) {
  const s = normalize(getStatus(invoice));
  return s === 'paid' || s === 'completed' || s === 'payment received' || s === 'received';
}

export default function BcInvoices() {
  const [status, setStatus] = useState('loading');
  const [clientInvoices, setClientInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [clientName, setClientName] = useState('');

  async function load() {
    try {
      const { clientName: cn } = await resolveClientName();
      setClientName(cn);
      const result = await Transactions.getInvoices();
      const mine = getArray(result)
        .filter((invoice) => belongsToClient(getClient(invoice), cn))
        .sort((a, b) => {
          const aTime = new Date(getInvoiceDate(a)).getTime();
          const bTime = new Date(getInvoiceDate(b)).getTime();
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });
      setClientInvoices(mine);
      setStatus('ok');
    } catch (error) {
      console.error('Invoices backend sync failed:', error);
      setStatus('error');
    }
  }

  useEffect(() => {
    load();
  }, []);
  useLiveSync(load);

  const q = normalize(search);
  const filteredInvoices = !q
    ? clientInvoices
    : clientInvoices.filter((invoice) => {
        return (
          normalize(getInvoiceId(invoice)).includes(q) ||
          normalize(getStatus(invoice)).includes(q) ||
          normalize(getDeliveryId(invoice)).includes(q) ||
          normalize(getClient(invoice)).includes(q) ||
          normalize(getAmount(invoice)).includes(q)
        );
      });

  const paidInvoices = clientInvoices.filter(isPaidInvoice);
  const unpaidInvoices = clientInvoices.filter((invoice) => !isPaidInvoice(invoice));
  const paidAmount = paidInvoices.reduce((sum, invoice) => sum + Number(getAmount(invoice) || 0), 0);
  const unpaidAmount = unpaidInvoices.reduce((sum, invoice) => sum + Number(getAmount(invoice) || 0), 0);

  function handleDownload(invoice) {
    const text = [
      'DeliverSync Invoice',
      '-------------------',
      `Invoice ID: ${getInvoiceId(invoice)}`,
      `Client: ${getClient(invoice) || clientName}`,
      `Delivery: ${getDeliveryId(invoice)}`,
      `Date: ${formatDate(getInvoiceDate(invoice))}`,
      `Due Date: ${formatDate(getDueDate(invoice))}`,
      `Amount: ${formatMoney(getAmount(invoice))}`,
      `Status: ${getStatus(invoice)}`,
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanId(getInvoiceId(invoice))}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <h1 className="page-title">Invoices</h1>
      <p className="page-subtitle">Manage and track your delivery invoices</p>

      <div className="invoice-stats">
        <div className="invoice-stat yellow">
          <span>Total Invoices</span>
          <strong>{clientInvoices.length}</strong>
          <p>
            {clientInvoices.length} {clientInvoices.length === 1 ? 'Invoice' : 'Invoices'}
          </p>
        </div>

        <div className="invoice-stat">
          <span>Total Paid</span>
          <strong>{formatMoney(paidAmount)}</strong>
          <p>
            {paidInvoices.length} Paid {paidInvoices.length === 1 ? 'Invoice' : 'Invoices'}
          </p>
        </div>

        <div className="invoice-stat">
          <span>Total Unpaid</span>
          <strong>{formatMoney(unpaidAmount)}</strong>
          <p>
            {unpaidInvoices.length} Pending {unpaidInvoices.length === 1 ? 'Invoice' : 'Invoices'}
          </p>
        </div>
      </div>

      <div className="invoice-panel">
        <div className="invoice-panel-head">
          <h2>All Invoices</h2>
          <label className="invoice-search">
            <span>🔍</span>
            <input type="text" placeholder="Search invoice ID, status, amount..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Delivery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {status === 'loading' && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    Loading invoices...
                  </td>
                </tr>
              )}
              {status === 'error' && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    Could not load invoices.
                  </td>
                </tr>
              )}
              {status === 'ok' && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-row">
                    No invoices found.
                  </td>
                </tr>
              )}
              {status === 'ok' &&
                filteredInvoices.map((invoice) => {
                  const id = getInvoiceId(invoice);
                  const deliveryId = getDeliveryId(invoice);
                  const viewUrl = `/business-client/invoice-view?id=${encodeURIComponent(cleanId(id))}&deliveryId=${encodeURIComponent(cleanId(deliveryId))}&from=invoices`;
                  return (
                    <tr key={id}>
                      <td className="invoice-id">#{cleanId(id)}</td>
                      <td>{formatDate(getInvoiceDate(invoice))}</td>
                      <td>{formatMoney(getAmount(invoice))}</td>
                      <td>{formatDate(getDueDate(invoice))}</td>
                      <td>
                        <span className={`status-pill ${statusClass(getStatus(invoice))}`}>{getStatus(invoice)}</span>
                      </td>
                      <td>{cleanId(deliveryId)}</td>
                      <td>
                        <div className="actions">
                          <Link className="btn-yellow" to={viewUrl}>
                            👁 View
                          </Link>
                          <button className="btn-outline" type="button" onClick={() => handleDownload(invoice)}>
                            ⬇ Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        body { font-family: Inter, sans-serif; }
        .invoice-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-bottom: 28px; }
        .invoice-stat { background: linear-gradient(135deg, #1f1f1f, #111); border: 1px solid #262626; border-radius: 22px; padding: 28px; color: #fff; box-shadow: 0 18px 40px rgba(0,0,0,.25); min-height: 140px; }
        .invoice-stat.yellow { background: #ffd400; color: #000; border-color: #ffd400; }
        .invoice-stat span { display: block; color: #9ca3af; font-size: 16px; font-weight: 800; text-transform: uppercase; margin-bottom: 12px; }
        .invoice-stat.yellow span { color: #2b2b2b; }
        .invoice-stat strong { display: block; font-size: 54px; line-height: 1; font-weight: 900; letter-spacing: -0.04em; }
        .invoice-stat p { margin: 12px 0 0; color: #9ca3af; font-size: 16px; font-weight: 700; }
        .invoice-stat.yellow p { color: #2b2b2b; }
        .invoice-panel { background: linear-gradient(135deg, #1f1f1f, #111); border: 1px solid #262626; border-radius: 22px; color: #fff; box-shadow: 0 18px 40px rgba(0,0,0,.25); overflow: hidden; }
        .invoice-panel-head { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 24px 28px; border-bottom: 1px solid #262626; }
        .invoice-panel-head h2 { margin: 0; font-size: 24px; font-weight: 900; }
        .invoice-search { display: flex; align-items: center; gap: 10px; background: #050505; border: 1px solid #262626; border-radius: 14px; padding: 10px 14px; min-width: 320px; }
        .invoice-search input { width: 100%; background: transparent; border: none; outline: none; color: #fff; font-family: Inter, sans-serif; font-weight: 700; }
        .invoice-table-wrap { width: 100%; overflow-x: auto; }
        .invoice-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
        .invoice-table th { text-align: left; padding: 18px 28px; color: #d1d5db; font-size: 14px; font-weight: 800; border-bottom: 1px solid #262626; }
        .invoice-table td { padding: 22px 28px; border-bottom: 1px solid #222; color: #fff; font-size: 15px; font-weight: 700; vertical-align: middle; }
        .invoice-table tbody tr:hover { background: rgba(255, 255, 255, .025); }
        .invoice-id { font-weight: 900; }
        .status-pill { display: inline-flex; align-items: center; width: fit-content; border-radius: 999px; padding: 8px 13px; font-size: 13px; font-weight: 900; white-space: nowrap; }
        .status-paid { background: rgba(16, 185, 129, .16); color: #86efac; border: 1px solid rgba(16, 185, 129, .4); }
        .status-pending, .status-under-review { background: rgba(255, 212, 0, .14); color: #ffd400; border: 1px solid rgba(255, 212, 0, .35); }
        .status-rejected, .status-unpaid { background: rgba(239, 68, 68, .14); color: #fecaca; border: 1px solid rgba(239, 68, 68, .45); }
        .actions { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .btn-yellow, .btn-outline { border-radius: 14px; padding: 11px 20px; font-family: Inter, sans-serif; font-weight: 900; text-decoration: none; cursor: pointer; border: none; display: inline-flex; gap: 8px; align-items: center; justify-content: center; }
        .btn-yellow { background: #ffd400; color: #000; }
        .btn-outline { background: transparent; color: #ffd400; border: 1px solid #ffd400; }
        .empty-row { text-align: center; color: #9ca3af !important; padding: 30px !important; }
        @media (max-width: 900px) {
          .invoice-stats { grid-template-columns: 1fr; }
          .invoice-panel-head { flex-direction: column; align-items: stretch; }
          .invoice-search { min-width: unset; }
        }
      `}</style>
    </>
  );
}
