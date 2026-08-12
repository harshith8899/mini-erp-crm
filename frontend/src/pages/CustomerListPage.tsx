import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCustomers } from '../lib/customers';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteCustomers } from '../lib/permissions';
import { Customer, CustomerListResponse, CustomerStatus, CustomerType } from '../types';

const STATUS_OPTIONS: (CustomerStatus | '')[] = ['', 'LEAD', 'ACTIVE', 'INACTIVE'];
const TYPE_OPTIONS: (CustomerType | '')[] = ['', 'RETAIL', 'WHOLESALE', 'DISTRIBUTOR'];

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function CustomerListPage() {
  const { user } = useAuth();
  const canWrite = canWriteCustomers(user?.role);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CustomerStatus | ''>('');
  const [customerType, setCustomerType] = useState<CustomerType | ''>('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [result, setResult] = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      listCustomers({ page, limit, search, status, type: customerType })
        .then((res) => {
          if (!cancelled) setResult(res);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof ApiError ? err.message : 'Failed to load customers');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250); // debounce search typing

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [page, search, status, customerType]);

  function resetPageAnd<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(1);
      setter(value);
    };
  }

  const customers: Customer[] = result?.data ?? [];
  const pagination = result?.pagination;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Customers</h1>
        {canWrite && (
          <Link className="btn btn-primary" to="/customers/new">
            + Add Customer
          </Link>
        )}
      </div>

      <div className="filters-bar">
        <input
          className="search-input"
          placeholder="Search by name, business, mobile, or email…"
          value={search}
          onChange={(e) => resetPageAnd(setSearch)(e.target.value)}
        />
        <select value={status} onChange={(e) => resetPageAnd(setStatus)(e.target.value as CustomerStatus | '')}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === '' ? 'All statuses' : opt}
            </option>
          ))}
        </select>
        <select
          value={customerType}
          onChange={(e) => resetPageAnd(setCustomerType)(e.target.value as CustomerType | '')}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === '' ? 'All types' : opt}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="page-status">Loading customers…</div>}
      {!loading && error && <div className="page-status page-status-error">{error}</div>}
      {!loading && !error && customers.length === 0 && (
        <div className="page-status">No customers found. Try adjusting your search or filters.</div>
      )}

      {!loading && !error && customers.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Business</th>
                  <th>Mobile</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Follow-up</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.businessName || '—'}</td>
                    <td>{c.mobile}</td>
                    <td>
                      <span className="pill pill-type">{c.customerType}</span>
                    </td>
                    <td>
                      <span className={`pill pill-status pill-status-${c.status.toLowerCase()}`}>{c.status}</span>
                    </td>
                    <td>{formatDate(c.followUpDate)}</td>
                    <td className="table-actions">
                      <Link to={`/customers/${c.id}`}>View</Link>
                      {canWrite && <Link to={`/customers/${c.id}/edit`}>Edit</Link>}
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
