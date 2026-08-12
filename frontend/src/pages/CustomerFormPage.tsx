import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { createCustomer, getCustomer, updateCustomer } from '../lib/customers';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteCustomers } from '../lib/permissions';
import { CustomerFormInput, CustomerStatus, CustomerType } from '../types';

const EMPTY_FORM: CustomerFormInput = {
  name: '',
  mobile: '',
  email: '',
  businessName: '',
  gstNumber: '',
  customerType: '',
  address: '',
  status: 'LEAD',
  followUpDate: '',
  notes: ''
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[0-9+\-\s()]{7,20}$/;

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function validate(form: CustomerFormInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = 'Name is required (min 2 characters).';
  }
  if (!MOBILE_REGEX.test(form.mobile.trim())) {
    errors.mobile = 'Enter a valid mobile number (digits, spaces, +, -, () only).';
  }
  if (form.email && !EMAIL_REGEX.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!form.customerType) {
    errors.customerType = 'Select a customer type.';
  }
  if (!form.status) {
    errors.status = 'Select a status.';
  }
  if (form.followUpDate && Number.isNaN(new Date(form.followUpDate).getTime())) {
    errors.followUpDate = 'Enter a valid date.';
  }

  return errors;
}

export default function CustomerFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = canWriteCustomers(user?.role);

  const [form, setForm] = useState<CustomerFormInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    getCustomer(id)
      .then((c) => {
        setForm({
          name: c.name,
          mobile: c.mobile,
          email: c.email ?? '',
          businessName: c.businessName ?? '',
          gstNumber: c.gstNumber ?? '',
          customerType: c.customerType,
          address: c.address ?? '',
          status: c.status,
          followUpDate: toDateInputValue(c.followUpDate),
          notes: c.notes ?? ''
        });
      })
      .catch((err) => setSubmitError(err instanceof ApiError ? err.message : 'Failed to load customer'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Role hiding here is UX only — the backend requireRole middleware is the real enforcement.
  if (!canWrite) return <Navigate to="/customers" replace />;

  function updateField<K extends keyof CustomerFormInput>(key: K, value: CustomerFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim() || null,
      businessName: form.businessName.trim() || null,
      gstNumber: form.gstNumber.trim() || null,
      customerType: form.customerType,
      address: form.address.trim() || null,
      status: form.status,
      followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : null,
      notes: form.notes.trim() || null
    };

    try {
      if (isEdit && id) {
        const updated = await updateCustomer(id, payload);
        navigate(`/customers/${updated.id}`);
      } else {
        const created = await createCustomer(payload);
        navigate(`/customers/${created.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.details ? `${err.message}: ${err.details.join(', ')}` : err.message);
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="page-status">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{isEdit ? 'Edit Customer' : 'Add Customer'}</h1>
      </div>

      <form className="card form-card" onSubmit={handleSubmit} noValidate>
        {submitError && <div className="form-error-banner">{submitError}</div>}

        <div className="form-grid">
          <label className="field">
            <span>Name *</span>
            <input value={form.name} onChange={(e) => updateField('name', e.target.value)} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>

          <label className="field">
            <span>Mobile *</span>
            <input value={form.mobile} onChange={(e) => updateField('mobile', e.target.value)} />
            {errors.mobile && <span className="field-error">{errors.mobile}</span>}
          </label>

          <label className="field">
            <span>Email</span>
            <input value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </label>

          <label className="field">
            <span>Business Name</span>
            <input value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} />
          </label>

          <label className="field">
            <span>GST Number</span>
            <input value={form.gstNumber} onChange={(e) => updateField('gstNumber', e.target.value)} />
          </label>

          <label className="field">
            <span>Customer Type *</span>
            <select
              value={form.customerType}
              onChange={(e) => updateField('customerType', e.target.value as CustomerType)}
            >
              <option value="">Select type</option>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
            {errors.customerType && <span className="field-error">{errors.customerType}</span>}
          </label>

          <label className="field">
            <span>Status *</span>
            <select value={form.status} onChange={(e) => updateField('status', e.target.value as CustomerStatus)}>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            {errors.status && <span className="field-error">{errors.status}</span>}
          </label>

          <label className="field">
            <span>Follow-up Date</span>
            <input
              type="date"
              value={form.followUpDate}
              onChange={(e) => updateField('followUpDate', e.target.value)}
            />
            {errors.followUpDate && <span className="field-error">{errors.followUpDate}</span>}
          </label>

          <label className="field field-span-2">
            <span>Address</span>
            <input value={form.address} onChange={(e) => updateField('address', e.target.value)} />
          </label>

          <label className="field field-span-2">
            <span>Notes</span>
            <textarea rows={4} value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
