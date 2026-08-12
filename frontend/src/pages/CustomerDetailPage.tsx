import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { addFollowUp, getCustomer } from '../lib/customers';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteCustomers } from '../lib/permissions';
import { Customer } from '../types';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const canWrite = canWriteCustomers(user?.role);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reload() {
    if (!id) return;
    setLoading(true);
    getCustomer(id)
      .then(setCustomer)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load customer'))
      .finally(() => setLoading(false));
  }

  useEffect(reload, [id]);

  async function handleAddFollowUp(e: FormEvent) {
    e.preventDefault();
    setNoteError(null);

    if (!note.trim()) {
      setNoteError('Note is required.');
      return;
    }
    if (!id) return;

    setSubmitting(true);
    try {
      await addFollowUp(id, {
        note: note.trim(),
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined
      });
      setNote('');
      setFollowUpDate('');
      reload();
    } catch (err) {
      setNoteError(err instanceof ApiError ? err.message : 'Failed to add follow-up');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-status">Loading…</div>;
  if (error) return <div className="page-status page-status-error">{error}</div>;
  if (!customer) return <div className="page-status page-status-error">Customer not found.</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link className="back-link" to="/customers">
            ← Back to customers
          </Link>
          <h1>{customer.name}</h1>
        </div>
        {canWrite && (
          <Link className="btn btn-primary" to={`/customers/${customer.id}/edit`}>
            Edit Customer
          </Link>
        )}
      </div>

      <div className="card detail-card">
        <div className="detail-grid">
          <div>
            <span className="detail-label">Business</span>
            <span>{customer.businessName || '—'}</span>
          </div>
          <div>
            <span className="detail-label">Mobile</span>
            <span>{customer.mobile}</span>
          </div>
          <div>
            <span className="detail-label">Email</span>
            <span>{customer.email || '—'}</span>
          </div>
          <div>
            <span className="detail-label">GST Number</span>
            <span>{customer.gstNumber || '—'}</span>
          </div>
          <div>
            <span className="detail-label">Type</span>
            <span className="pill pill-type">{customer.customerType}</span>
          </div>
          <div>
            <span className="detail-label">Status</span>
            <span className={`pill pill-status pill-status-${customer.status.toLowerCase()}`}>
              {customer.status}
            </span>
          </div>
          <div>
            <span className="detail-label">Follow-up Date</span>
            <span>{formatDateTime(customer.followUpDate)}</span>
          </div>
          <div className="field-span-2">
            <span className="detail-label">Address</span>
            <span>{customer.address || '—'}</span>
          </div>
          <div className="field-span-2">
            <span className="detail-label">Notes</span>
            <span>{customer.notes || '—'}</span>
          </div>
        </div>
      </div>

      {canWrite && (
        <div className="card">
          <h2>Add Follow-up</h2>
          <form onSubmit={handleAddFollowUp} className="follow-up-form">
            {noteError && <div className="form-error-banner">{noteError}</div>}
            <label className="field">
              <span>Note *</span>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label className="field">
              <span>Follow-up Date</span>
              <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </label>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Follow-up'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Follow-up History</h2>
        {(!customer.customerFollowUps || customer.customerFollowUps.length === 0) && (
          <p className="page-status">No follow-ups recorded yet.</p>
        )}
        {customer.customerFollowUps && customer.customerFollowUps.length > 0 && (
          <ul className="follow-up-list">
            {customer.customerFollowUps.map((f) => (
              <li key={f.id}>
                <div className="follow-up-meta">
                  <span>{formatDateTime(f.followUpDate)}</span>
                  <span>{f.createdBy ? f.createdBy.name : 'Unknown user'}</span>
                </div>
                <p>{f.note}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
