import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addStockMovement, getProduct, listStockMovements } from '../lib/products';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteInventory } from '../lib/permissions';
import { MovementType, Product, StockMovement } from '../types';

function formatPrice(value: string) {
  const num = Number(value);
  return Number.isNaN(num) ? value : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canWrite = canWriteInventory(user?.role);

  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [movementError, setMovementError] = useState<string | null>(null);
  const [submittingType, setSubmittingType] = useState<MovementType | null>(null);

  function reload() {
    if (!id) return;
    setLoading(true);
    Promise.all([getProduct(id), listStockMovements(id)])
      .then(([productRes, movementsRes]) => {
        setProduct(productRes);
        setMovements(movementsRes.data);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }

  useEffect(reload, [id]);

  async function handleStockMovement(movementType: MovementType, e: FormEvent) {
    e.preventDefault();
    setMovementError(null);

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setMovementError('Quantity must be a positive whole number.');
      return;
    }
    if (!reason.trim()) {
      setMovementError('Reason is required.');
      return;
    }
    if (!id) return;

    setSubmittingType(movementType);
    try {
      await addStockMovement(id, { quantity: qty, movementType, reason: reason.trim() });
      setQuantity('');
      setReason('');
      reload();
    } catch (err) {
      setMovementError(err instanceof ApiError ? err.message : 'Failed to record stock movement');
    } finally {
      setSubmittingType(null);
    }
  }

  if (loading) return <div className="page-status">Loading…</div>;
  if (error) return <div className="page-status page-status-error">{error}</div>;
  if (!product) return <div className="page-status page-status-error">Product not found.</div>;

  const lowStock = product.currentStock <= product.minimumStockAlert;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link className="back-link" to="/products">
            ← Back to products
          </Link>
          <h1>{product.name}</h1>
        </div>
        {canWrite && (
          <Link className="btn btn-primary" to={`/products/${product.id}/edit`}>
            Edit Product
          </Link>
        )}
      </div>

      <div className="card detail-card">
        <div className="detail-grid">
          <div>
            <span className="detail-label">SKU</span>
            <span>{product.sku}</span>
          </div>
          <div>
            <span className="detail-label">Category</span>
            <span>{product.category || '—'}</span>
          </div>
          <div>
            <span className="detail-label">Unit Price</span>
            <span>{formatPrice(product.unitPrice)}</span>
          </div>
          <div>
            <span className="detail-label">Status</span>
            <span className={product.isActive ? 'pill pill-active' : 'pill pill-inactive'}>
              {product.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="detail-label">Current Stock</span>
            <span className={lowStock ? 'stock-value stock-low' : 'stock-value'}>
              {product.currentStock}
              {lowStock && <span className="pill pill-warning" style={{ marginLeft: 8 }}>Low stock</span>}
            </span>
          </div>
          <div>
            <span className="detail-label">Minimum Stock Alert</span>
            <span>{product.minimumStockAlert}</span>
          </div>
          <div className="field-span-2">
            <span className="detail-label">Warehouse</span>
            <span>
              {product.warehouse ? (
                <Link to={`/warehouses/${product.warehouse.id}`}>
                  {product.warehouse.name} ({product.warehouse.location})
                </Link>
              ) : (
                '—'
              )}
            </span>
          </div>
        </div>
      </div>

      {canWrite && (
        <div className="card">
          <h2>Stock Movement</h2>
          <form className="stock-movement-form">
            {movementError && <div className="form-error-banner">{movementError}</div>}
            <div className="form-grid">
              <label className="field">
                <span>Quantity *</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Reason *</span>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Purchase, Sales" />
              </label>
            </div>
            <div className="form-actions form-actions-start">
              <button
                type="button"
                className="btn btn-primary"
                disabled={submittingType !== null}
                onClick={(e) => handleStockMovement('IN', e)}
              >
                {submittingType === 'IN' ? 'Recording…' : 'Record Stock IN'}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={submittingType !== null}
                onClick={(e) => handleStockMovement('OUT', e)}
              >
                {submittingType === 'OUT' ? 'Recording…' : 'Record Stock OUT'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Stock Movement History</h2>
        {movements.length === 0 && <p className="page-status">No stock movements recorded yet.</p>}
        {movements.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDateTime(m.createdAt)}</td>
                    <td>
                      <span className={m.movementType === 'IN' ? 'pill pill-active' : 'pill pill-warning'}>
                        {m.movementType}
                      </span>
                    </td>
                    <td>{m.quantity}</td>
                    <td>{m.reason}</td>
                    <td>{m.createdBy ? m.createdBy.name : 'Unknown user'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
