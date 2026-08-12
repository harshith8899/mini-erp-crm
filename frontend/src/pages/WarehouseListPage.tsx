import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listWarehouses } from '../lib/warehouses';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteInventory } from '../lib/permissions';
import { Warehouse, WarehouseListResponse } from '../types';

export default function WarehouseListPage() {
  const { user } = useAuth();
  const canWrite = canWriteInventory(user?.role);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [result, setResult] = useState<WarehouseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      listWarehouses({ page, limit, search, isActive: activeFilter === '' ? '' : activeFilter === 'true' })
        .then((res) => {
          if (!cancelled) setResult(res);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof ApiError ? err.message : 'Failed to load warehouses');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [page, search, activeFilter]);

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(1);
      setter(value);
    };
  }

  const warehouses: Warehouse[] = result?.data ?? [];
  const pagination = result?.pagination;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Warehouses</h1>
        {canWrite && (
          <Link className="btn btn-primary" to="/warehouses/new">
            + Add Warehouse
          </Link>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Search by name or location…"
          value={search}
          onChange={(e) => resetPageAnd(setSearch)(e.target.value)}
        />
        <select
          value={activeFilter}
          onChange={(e) => resetPageAnd(setActiveFilter)(e.target.value as '' | 'true' | 'false')}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {loading && <div className="page-status">Loading warehouses…</div>}
      {!loading && error && <div className="page-status page-status-error">{error}</div>}
      {!loading && !error && warehouses.length === 0 && (
        <div className="page-status">No warehouses found. Try adjusting your search or filters.</div>
      )}

      {!loading && !error && warehouses.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {warehouses.map((w) => (
                  <tr key={w.id}>
                    <td>{w.name}</td>
                    <td>{w.location}</td>
                    <td>
                      <span className={w.isActive ? 'pill pill-active' : 'pill pill-inactive'}>
                        {w.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-actions">
                      <Link to={`/warehouses/${w.id}`}>View</Link>
                      {canWrite && <Link to={`/warehouses/${w.id}/edit`}>Edit</Link>}
                    </td>
                  </tr>
                ))}
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
