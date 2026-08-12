import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { Challan } from '../types';

const PRIMARY_RGB: [number, number, number] = [47, 91, 234]; // matches --color-primary
const MUTED_RGB: [number, number, number] = [107, 114, 128]; // matches --color-text-muted
const TEXT_RGB: [number, number, number] = [31, 36, 48]; // matches --color-text

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function money(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  return Number.isNaN(num) ? String(value) : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Same set of fields the Challan Detail page treats as "if available".
function customerLines(challan: Challan): string[] {
  const customer = challan.customer;
  if (!customer) return ['—'];

  const lines: string[] = [];
  lines.push(customer.businessName ? `${customer.name} (${customer.businessName})` : customer.name);
  lines.push(`Mobile: ${customer.mobile}`);
  if (customer.email) lines.push(`Email: ${customer.email}`);
  if (customer.gstNumber) lines.push(`GST: ${customer.gstNumber}`);
  if (customer.address) lines.push(`Address: ${customer.address}`);
  return lines;
}

export function generateChallanPdf(challan: Challan) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // ---- Header ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...PRIMARY_RGB);
  doc.text('Mini ERP + CRM', marginX, 50);

  doc.setFontSize(12);
  doc.setTextColor(...MUTED_RGB);
  doc.setFont('helvetica', 'normal');
  doc.text('Sales Challan', marginX, 68);

  doc.setDrawColor(...PRIMARY_RGB);
  doc.setLineWidth(1.5);
  doc.line(marginX, 78, pageWidth - marginX, 78);

  // ---- Challan meta (right aligned block) ----
  const rightX = pageWidth - marginX;
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_RGB);
  doc.setFont('helvetica', 'bold');
  doc.text(challan.challanNumber, rightX, 100, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED_RGB);
  doc.text(`Date: ${formatDateTime(challan.createdAt)}`, rightX, 114, { align: 'right' });
  doc.text(`Status: ${challan.status}`, rightX, 128, { align: 'right' });

  // ---- Customer block ----
  doc.setFontSize(10);
  doc.setTextColor(...MUTED_RGB);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', marginX, 100);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_RGB);
  const custLines = customerLines(challan);
  const wrappedCustLines = custLines.flatMap((line) => doc.splitTextToSize(line, pageWidth - marginX * 2 - 160));
  doc.text(wrappedCustLines, marginX, 116, { lineHeightFactor: 1.4 });

  const custBlockBottom = 116 + wrappedCustLines.length * 12.5;
  let cursorY = Math.max(custBlockBottom, 140) + 20;

  // ---- Items table ----
  const items = challan.challanItems ?? [];
  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [['Product', 'SKU', 'Qty', 'Unit Price', 'Line Total']],
    body: items.map((item) => [
      item.productNameSnapshot,
      item.productSkuSnapshot,
      String(item.quantity),
      money(item.unitPriceSnapshot),
      money(item.lineTotal)
    ]),
    rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 6, overflow: 'linebreak', textColor: TEXT_RGB },
    headStyles: { fillColor: PRIMARY_RGB, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 246, 251] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 80 },
      2: { cellWidth: 50, halign: 'right' },
      3: { cellWidth: 80, halign: 'right' },
      4: { cellWidth: 80, halign: 'right' }
    },
    didDrawPage: () => {
      // Footer with page number, drawn on every page (including continuation pages for long item lists)
      const pageCount = doc.getNumberOfPages();
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      doc.setFontSize(8);
      doc.setTextColor(...MUTED_RGB);
      doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 20, {
        align: 'right'
      });
    }
  });

  cursorY = (doc as any).lastAutoTable.finalY + 24;

  // ---- Totals ----
  if (cursorY > doc.internal.pageSize.getHeight() - 120) {
    doc.addPage();
    cursorY = 50;
  }

  const totalsLabelX = rightX - 140;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED_RGB);
  doc.text('Total Quantity', totalsLabelX, cursorY, { align: 'left' });
  doc.setTextColor(...TEXT_RGB);
  doc.text(String(challan.totalQuantity), rightX, cursorY, { align: 'right' });

  cursorY += 18;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED_RGB);
  doc.text('Total Amount', totalsLabelX, cursorY, { align: 'left' });
  doc.setTextColor(...PRIMARY_RGB);
  doc.text(money(challan.totalAmount), rightX, cursorY, { align: 'right' });

  cursorY += 30;

  // ---- Created by ----
  if (challan.createdBy?.name) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_RGB);
    doc.text(`Created by: ${challan.createdBy.name}`, marginX, cursorY);
    cursorY += 14;
  }
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_RGB);
  doc.text(`Confirmed at: ${formatDateTime(challan.confirmedAt)}`, marginX, cursorY);

  doc.save(`challan-${challan.challanNumber}.pdf`);
}
