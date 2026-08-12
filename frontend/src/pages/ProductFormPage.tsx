import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { createProduct, getProduct, updateProduct } from '../lib/products';
import { listWarehouses } from '../lib/warehouses';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteInventory } from '../lib/permissions';
import { ProductFormInput, WarehouseRef } from '../types';

const EMPTY_FORM: ProductFormInput = {
  name: '',
  sku: '',
  category: '',
  unitPrice: '',
  minimumStockAlert: '',
  warehouseId: '',
  isActive: true
};

function validate(form: ProductFormInput): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = 'Name is required (min 2 characters).';
  }
  if (!form.sku.trim() || form.sku.trim().length < 2) {
    errors.sku = 'SKU is required (min 2 characters).';
  }
  const price = Number(form.unitPrice);
  if (!form.unitPrice || Number.isNaN(price) || price <= 0) {
    errors.unitPrice = 'Enter a valid unit price greater than 0.';
  }
  if (form.minimumStockAlert !== '') {
    const alert = Number(form.minimumStockAlert);
    if (!Number.isInteger(alert) || alert < 0) {
      errors.minimumStockAlert = 'Minimum stock alert must be a non-negative whole number.';
    }
  }

  return errors;
}

export default function ProductFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = canWriteInventory(user?.role);

  const [form, setForm] = useState<ProductFormInput>(EMPTY_FORM);
  const [warehouses, setWarehouses] = useState<WarehouseRef[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    listWarehouses({ limit: 100 })
      .then((res) => setWarehouses(res.data))
      .catch(() => {
        // warehouse dropdown is a convenience — degrade gracefully if it fails to load
      });
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    getProduct(id)
      .then((p) => {
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category ?? '',
          unitPrice: p.unitPrice,
          minimumStockAlert: String(p.minimumStockAlert),
          warehouseId: p.warehouseId ?? '',
          isActive: p.isActive
        });
      })
      .catch((err) => setSubmitError(err instanceof ApiError ? err.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Role hiding here is UX only — the backend requireRole middleware is the real enforcement.
  if (!canWrite) return <Navigate to="/products" replace />;

  function updateField<K extends keyof ProductFormInput>(key: K, value: ProductFormInput[K]) {
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
      sku: form.sku.trim(),
      category: form.category.trim() || null,
      unitPrice: Number(form.unitPrice),
      minimumStockAlert: form.minimumStockAlert === '' ? undefined : Number(form.minimumStockAlert),
      warehouseId: form.warehouseId || null,
      isActive: form.isActive
    };

    try {
      if (isEdit && id) {
        const updated = await updateProduct(id, payload);
        navigate(`/products/${updated.id}`);
      } else {
        const created = await createProduct(payload);
        navigate(`/products/${created.id}`);
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
        <h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1>
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
            <span>SKU *</span>
            <input value={form.sku} onChange={(e) => updateField('sku', e.target.value)} />
            {errors.sku && <span className="field-error">{errors.sku}</span>}
          </label>

          <label className="field">
            <span>Category</span>
            <input value={form.category} onChange={(e) => updateField('category', e.target.value)} />
          </label>

          <label className="field">
            <span>Unit Price *</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.unitPrice}
              onChange={(e) => updateField('unitPrice', e.target.value)}
            />
            {errors.unitPrice && <span className="field-error">{errors.unitPrice}</span>}
          </label>

          <label className="field">
            <span>Minimum Stock Alert</span>
            <input
              type="number"
              min={0}
              step={1}
              value={form.minimumStockAlert}
              onChange={(e) => updateField('minimumStockAlert', e.target.value)}
            />
            {errors.minimumStockAlert && <span className="field-error">{errors.minimumStockAlert}</span>}
          </label>

          <label className="field">
            <span>Warehouse</span>
            <select value={form.warehouseId} onChange={(e) => updateField('warehouseId', e.target.value)}>
              <option value="">No warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field field-checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => updateField('isActive', e.target.checked)}
            />
            <span>Active</span>
          </label>

          {isEdit && (
            <div className="field field-span-2 field-note">
              Current stock isn't editable here — use Stock IN / Stock OUT on the product detail page.
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </div>
  );
}
