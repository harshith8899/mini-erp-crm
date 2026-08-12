import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { createWarehouse, getWarehouse, updateWarehouse } from '../lib/warehouses';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteInventory } from '../lib/permissions';
import { WarehouseFormInput } from '../types';

const EMPTY_FORM: WarehouseFormInput = {
  name: '',
  location: '',
  isActive: true
};

function validate(form: WarehouseFormInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = 'Name is required (min 2 characters).';
  }
  if (!form.location.trim() || form.location.trim().length < 2) {
    errors.location = 'Location is required (min 2 characters).';
  }

  return errors;
}

export default function WarehouseFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = canWriteInventory(user?.role);

  const [form, setForm] = useState<WarehouseFormInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    getWarehouse(id)
      .then((w) => setForm({ name: w.name, location: w.location, isActive: w.isActive }))
      .catch((err) => setSubmitError(err instanceof ApiError ? err.message : 'Failed to load warehouse'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Role hiding here is UX only — the backend requireRole middleware is the real enforcement.
  if (!canWrite) return <Navigate to="/warehouses" replace />;

  function updateField<K extends keyof WarehouseFormInput>(key: K, value: WarehouseFormInput[K]) {
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
      location: form.location.trim(),
      isActive: form.isActive
    };

    try {
      if (isEdit && id) {
        const updated = await updateWarehouse(id, payload);
        navigate(`/warehouses/${updated.id}`);
      } else {
        const created = await createWarehouse(payload);
        navigate(`/warehouses/${created.id}`);
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
        <h1>{isEdit ? 'Edit Warehouse' : 'Add Warehouse'}</h1>
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
            <span>Location *</span>
            <input value={form.location} onChange={(e) => updateField('location', e.target.value)} />
            {errors.location && <span className="field-error">{errors.location}</span>}
          </label>

          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
            />
            <span>Active</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Warehouse'}
          </button>
        </div>
      </form>
    </div>
  );
}
