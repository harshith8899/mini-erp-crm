import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProducts } from '../lib/products';
import { listWarehouses } from '../lib/warehouses';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteInventory } from '../lib/permissions';
import { Product, ProductListResponse, WarehouseRef } from '../types';

function formatPrice(value: string) {
  const num = Number(value);
  return Number.isNaN(num) ? value : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProductListPage() {
  const { user } = useAuth();
  const canWrite = canWriteInventory(user?.role);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [warehouses, setWarehouses] = useState<WarehouseRef[]>([]);
  const [result, setResult] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWarehouses({ limit: 100 })
      .then((res) => setWarehouses(res.data))
      .catch(() => {
        // filter dropdown is a convenience — silently degrade to no options if it fails
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      listProducts({
        page,
        limit,
        search,
        category,
        warehouseId,
        isActive: activeFilter === '' ? '' : activeFilter === 'true'
      })
        .then((res) => {
          if (!cancelled) setResult(res);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof ApiError ? err.message : 'Failed to load products');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [page, search, category, warehouseId, activeFilter]);

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(1);
      setter(value);
    };
  }

  const products: Product[] = result?.data ?? [];
  const pagination = result?.pagination;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Products</h1>
        {canWrite && (
          <Link className="btn btn-primary" to="/products/new">
            + Add Product
          </Link>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Search by name, SKU, or category…"
          value={search}
          onChange={(e) => resetPageAnd(setSearch)(e.target.value)}
        />
        <input
          placeholder="Category (exact)"
          value={category}
          onChange={(e) => resetPageAnd(setCategory)(e.target.value)}
        />
        <select value={warehouseId} onChange={(e) => resetPageAnd(setWarehouseId)(e.target.value)}>
          <option value="">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => resetPageAnd(setActiveFilter)(e.target.value as '' | 'true' | 'false')}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {loading && <div className="page-status">Loading products…</div>}
      {!loading && error && <div className="page-status page-status-error">{error}</div>}
      {!loading && !error && products.length === 0 && (
        <div className="page-status">No products found. Try adjusting your search or filters.</div>
      )}

      {!loading && !error && products.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Stock</th>
                  <th>Warehouse</th>
                  <th>Status</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const lowStock = p.currentStock <= p.minimumStockAlert;
                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.sku}</td>
                      <td>{p.category || '—'}</td>
                      <td>{formatPrice(p.unitPrice)}</td>
                      <td>
                        <span className={lowStock ? 'stock-value stock-low' : 'stock-value'}>
                          {p.currentStock}
                        </span>
                        {lowStock && <span className="pill pill-warning">Low</span>}
                      </td>
                      <td>{p.warehouse?.name || '—'}</td>
                      <td>
                        <span className={p.isActive ? 'pill pill-active' : 'pill pill-inactive'}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-actions">
                        <Link to={`/products/${p.id}`}>View</Link>
                        {canWrite && <Link to={`/products/${p.id}/edit`}>Edit</Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                className="btn btn-ghost"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <button
                className="btn btn-ghost"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
