import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { createChallan, getChallan, updateChallan } from '../lib/challans';
import { listCustomers } from '../lib/customers';
import { listProducts } from '../lib/products';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canWriteChallans } from '../lib/permissions';
import { ChallanFormLine } from '../types';

interface CustomerOption {
  id: string;
  name: string;
  businessName: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unitPrice: string;
  currentStock: number;
}

const EMPTY_LINE: ChallanFormLine = { productId: '', quantity: '1' };

function money(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ChallanFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = canWriteChallans(user?.role);

  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<ChallanFormLine[]>([{ ...EMPTY_LINE }]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState<'DRAFT' | 'CONFIRMED' | 'SAVE' | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    listCustomers({ limit: 100 })
      .then((res) => setCustomers(res.data.map((c) => ({ id: c.id, name: c.name, businessName: c.businessName }))))
      .catch(() => {});
    listProducts({ limit: 100, isActive: true })
      .then((res) =>
        setProducts(
          res.data.map((p) => ({ id: p.id, name: p.name, sku: p.sku, unitPrice: p.unitPrice, currentStock: p.currentStock }))
        )
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    setLoading(true);
    getChallan(id)
      .then((c) => {
        if (c.status !== 'DRAFT') {
          setSubmitError('Only DRAFT challans can be edited.');
          return;
        }
        setCustomerId(c.customerId);
        setLines(
          (c.challanItems ?? []).map((item) => ({ productId: item.productId, quantity: String(item.quantity) }))
        );
      })
      .catch((err) => setSubmitError(err instanceof ApiError ? err.message : 'Failed to load challan'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  // Role hiding here is UX only — the backend requireRole middleware is the real enforcement.
  if (!canWrite) return <Navigate to="/challans" replace />;

  function updateLine(index: number, patch: Partial<ChallanFormLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function productFor(productId: string): ProductOption | undefined {
    return products.find((p) => p.id === productId);
  }

  function validate(): string[] {
    const errs: string[] = [];
    if (!customerId) errs.push('Select a customer.');

    const seen = new Set<string>();
    let hasValidLine = false;
    lines.forEach((line, i) => {
      if (!line.productId) {
        errs.push(`Line ${i + 1}: select a product.`);
        return;
      }
      if (seen.has(line.productId)) {
        errs.push(`Line ${i + 1}: this product is already on the challan (a product may only appear once).`);
        return;
      }
      seen.add(line.productId);

      const qty = Number(line.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        errs.push(`Line ${i + 1}: quantity must be a positive whole number.`);
        return;
      }
      hasValidLine = true;
    });
    if (!hasValidLine && lines.length > 0 && errs.length === 0) errs.push('Add at least one product line.');

    return errs;
  }

  function buildItems() {
    return lines
      .filter((line) => line.productId && Number(line.quantity) > 0)
      .map((line) => ({ productId: line.productId, quantity: Number(line.quantity) }));
  }

  async function handleSubmit(status: 'DRAFT' | 'CONFIRMED' | 'SAVE') {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    setSubmitting(status);
    setSubmitError(null);

    try {
      if (isEdit && id) {
        const updated = await updateChallan(id, { customerId, items: buildItems() });
        navigate(`/challans/${updated.id}`);
      } else {
        const created = await createChallan(customerId, buildItems(), status === 'CONFIRMED' ? 'CONFIRMED' : 'DRAFT');
        navigate(`/challans/${created.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.details ? `${err.message}: ${err.details.join(', ')}` : err.message);
      } else {
        setSubmitError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) return <div className="page-status">Loading…</div>;

  const totalQuantity = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const totalAmount = lines.reduce((sum, l) => {
    const product = productFor(l.productId);
    const qty = Number(l.quantity) || 0;
    return sum + (product ? Number(product.unitPrice) * qty : 0);
  }, 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>{isEdit ? 'Edit Challan (Draft)' : 'New Challan'}</h1>
      </div>

      <form
        className="card form-card"
        onSubmit={(e: FormEvent) => e.preventDefault()}
        noValidate
        style={{ maxWidth: 860 }}
      >
        {submitError && <div className="form-error-banner">{submitError}</div>}
        {errors.length > 0 && (
          <div className="form-error-banner">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <label className="field" style={{ marginBottom: 16 }}>
          <span>Customer *</span>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.businessName ? ` (${c.businessName})` : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Unit Price</th>
                <th>Quantity</th>
                <th>Line Total</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, i) => {
                const product = productFor(line.productId);
                const qty = Number(line.quantity) || 0;
                const lineTotal = product ? Number(product.unitPrice) * qty : 0;
                return (
                  <tr key={i}>
                    <td>
                      <select value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })}>
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) — stock {p.currentStock}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{product ? money(Number(product.unitPrice)) : '—'}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={line.quantity}
                        onChange={(e) => updateLine(i, { quantity: e.target.value })}
                        style={{ width: 90 }}
                      />
                    </td>
                    <td>{money(lineTotal)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeLine(i)}
                        disabled={lines.length <= 1}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="form-actions form-actions-start">
          <button type="button" className="btn btn-ghost" onClick={addLine}>
            + Add Product Line
          </button>
        </div>

        <div className="detail-grid" style={{ marginTop: 16 }}>
          <div>
            <span className="detail-label">Total Quantity</span>
            <span className="stock-value">{totalQuantity}</span>
          </div>
          <div>
            <span className="detail-label">Total Amount (calculated)</span>
            <span className="stock-value">{money(totalAmount)}</span>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          {isEdit ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting !== null}
              onClick={() => handleSubmit('SAVE')}
            >
              {submitting === 'SAVE' ? 'Saving…' : 'Save Changes'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={submitting !== null}
                onClick={() => handleSubmit('DRAFT')}
              >
                {submitting === 'DRAFT' ? 'Saving…' : 'Save Draft'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={submitting !== null}
                onClick={() => handleSubmit('CONFIRMED')}
              >
                {submitting === 'CONFIRMED' ? 'Confirming…' : 'Save & Confirm'}
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
