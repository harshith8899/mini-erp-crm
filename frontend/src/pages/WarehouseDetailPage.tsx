import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getWarehouse } from '../lib/warehouses';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteInventory } from '../lib/permissions';
import { Warehouse } from '../types';

export default function WarehouseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canWrite = canWriteInventory(user?.role);

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getWarehouse(id)
      .then(setWarehouse)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load warehouse'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page-status">Loading…</div>;
  if (error) return <div className="page-status page-status-error">{error}</div>;
  if (!warehouse) return <div className="page-status page-status-error">Warehouse not found.</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link className="back-link" to="/warehouses">
            ← Back to warehouses
          </Link>
          <h1>{warehouse.name}</h1>
        </div>
        {canWrite && (
          <Link className="btn btn-primary" to={`/warehouses/${warehouse.id}/edit`}>
            Edit Warehouse
          </Link>
        )}
      </div>

      <div className="card detail-card">
        <div className="detail-grid">
          <div>
            <span className="detail-label">Location</span>
            <span>{warehouse.location}</span>
          </div>
          <div>
            <span className="detail-label">Status</span>
            <span className={warehouse.isActive ? 'pill pill-active' : 'pill pill-inactive'}>
              {warehouse.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Products in this Warehouse</h2>
        {(!warehouse.products || warehouse.products.length === 0) && (
          <p className="page-status">No products assigned to this warehouse.</p>
        )}
        {warehouse.products && warehouse.products.length > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {warehouse.products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.sku}</td>
                    <td>{p.currentStock}</td>
                    <td>
                      <span className={p.isActive ? 'pill pill-active' : 'pill pill-inactive'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-actions">
                      <Link to={`/products/${p.id}`}>View</Link>
                    </td>
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
