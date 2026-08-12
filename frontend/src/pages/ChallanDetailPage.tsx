import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelChallan, confirmChallan, getChallan } from '../lib/challans';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteChallans } from '../lib/permissions';
import { Challan } from '../types';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function money(value: string | number) {
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ChallanDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canWrite = canWriteChallans(user?.role);

  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<'confirm' | 'cancel' | null>(null);

  function reload() {
    if (!id) return;
    setLoading(true);
    getChallan(id)
      .then(setChallan)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load challan'))
      .finally(() => setLoading(false));
  }

  useEffect(reload, [id]);

  async function handleConfirm() {
    if (!id) return;
    setActionError(null);
    setActionBusy('confirm');
    try {
      await confirmChallan(id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to confirm challan');
    } finally {
      setActionBusy(null);
    }
  }

  async function handleCancel() {
    if (!id) return;
    setActionError(null);
    setActionBusy('cancel');
    try {
      await cancelChallan(id);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Failed to cancel challan');
    } finally {
      setActionBusy(null);
    }
  }

  if (loading) return <div className="page-status">Loading…</div>;
  if (error) return <div className="page-status page-status-error">{error}</div>;
  if (!challan) return <div className="page-status page-status-error">Challan not found.</div>;

  const canEdit = canWrite && challan.status === 'DRAFT';
  const canConfirm = canWrite && challan.status === 'DRAFT';
  const canCancel = canWrite && challan.status !== 'CANCELLED';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link className="back-link" to="/challans">
            ← Back to challans
          </Link>
          <h1>{challan.challanNumber}</h1>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {canEdit && (
            <Link className="btn btn-ghost" to={`/challans/${challan.id}/edit`}>
              Edit
            </Link>
          )}
          {canConfirm && (
            <button className="btn btn-primary" disabled={actionBusy !== null} onClick={handleConfirm}>
              {actionBusy === 'confirm' ? 'Confirming…' : 'Confirm'}
            </button>
          )}
          {canCancel && (
            <button className="btn btn-danger" disabled={actionBusy !== null} onClick={handleCancel}>
              {actionBusy === 'cancel' ? 'Cancelling…' : 'Cancel Challan'}
            </button>
          )}
        </div>
      </div>

      {actionError && <div className="form-error-banner">{actionError}</div>}

      <div className="card detail-card">
        <div className="detail-grid">
          <div>
            <span className="detail-label">Status</span>
            <span className={`pill pill-status pill-status-${challan.status.toLowerCase()}`}>{challan.status}</span>
          </div>
          <div>
            <span className="detail-label">Customer</span>
            <span>
              {challan.customer ? (
                <Link to={`/customers/${challan.customer.id}`}>
                  {challan.customer.name}
                  {challan.customer.businessName ? ` (${challan.customer.businessName})` : ''}
                </Link>
              ) : (
                '—'
              )}
            </span>
          </div>
          <div>
            <span className="detail-label">Created By</span>
            <span>{challan.createdBy?.name || '—'}</span>
          </div>
          <div>
            <span className="detail-label">Created At</span>
            <span>{formatDateTime(challan.createdAt)}</span>
          </div>
          <div>
            <span className="detail-label">Confirmed At</span>
            <span>{formatDateTime(challan.confirmedAt)}</span>
          </div>
          <div>
            <span className="detail-label">Total Quantity</span>
            <span className="stock-value">{challan.totalQuantity}</span>
          </div>
          <div>
            <span className="detail-label">Total Amount</span>
            <span className="stock-value">{challan.totalAmount ? money(challan.totalAmount) : '—'}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Items</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {(challan.challanItems ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.productNameSnapshot}</td>
                  <td>{item.productSkuSnapshot}</td>
                  <td>{money(item.unitPriceSnapshot)}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="field-note" style={{ marginTop: 8 }}>
          Item details are snapshots taken at the time this challan was created or last edited — they
          won't change even if the underlying product's name, SKU, or price changes later.
        </p>
      </div>

      {challan.stockMovements && challan.stockMovements.length > 0 && (
        <div className="card">
          <h2>Related Stock Movements</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {challan.stockMovements.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDateTime(m.createdAt)}</td>
                    <td>
                      <span className={m.movementType === 'IN' ? 'pill pill-active' : 'pill pill-warning'}>
                        {m.movementType}
                      </span>
                    </td>
                    <td>{m.quantity}</td>
                    <td>{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
