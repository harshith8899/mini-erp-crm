import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listChallans } from '../lib/challans';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteChallans } from '../lib/permissions';
import { Challan, ChallanListResponse, ChallanStatus } from '../types';

const STATUS_OPTIONS: (ChallanStatus | '')[] = ['', 'DRAFT', 'CONFIRMED', 'CANCELLED'];

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function ChallanListPage() {
  const { user } = useAuth();
  const canWrite = canWriteChallans(user?.role);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ChallanStatus | ''>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [result, setResult] = useState<ChallanListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      listChallans({ page, limit, search, status })
        .then((res) => {
          if (!cancelled) setResult(res);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof ApiError ? err.message : 'Failed to load challans');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [page, search, status]);

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(1);
      setter(value);
    };
  }

  const challans: Challan[] = result?.data ?? [];
  const pagination = result?.pagination;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Challans</h1>
        {canWrite && (
          <Link className="btn btn-primary" to="/challans/new">
            + New Challan
          </Link>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Search by challan number…"
          value={search}
          onChange={(e) => resetPageAnd(setSearch)(e.target.value)}
        />
        <select value={status} onChange={(e) => resetPageAnd(setStatus)(e.target.value as ChallanStatus | '')}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === '' ? 'All statuses' : opt}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="page-status">Loading challans…</div>}
      {!loading && error && <div className="page-status page-status-error">{error}</div>}
      {!loading && !error && challans.length === 0 && (
        <div className="page-status">No challans found. Try adjusting your search or filters.</div>
      )}

      {!loading && !error && challans.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer</th>
                  <th>Total Qty</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {challans.map((c) => (
                  <tr key={c.id}>
                    <td>{c.challanNumber}</td>
                    <td>{c.customer?.name || '—'}</td>
                    <td>{c.totalQuantity}</td>
                    <td>
                      <span className={`pill pill-status pill-status-${c.status.toLowerCase()}`}>{c.status}</span>
                    </td>
                    <td>{formatDateTime(c.createdAt)}</td>
                    <td className="table-actions">
                      <Link to={`/challans/${c.id}`}>View</Link>
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
