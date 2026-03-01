import type { Repair, Sale, SaleItem, LoanInstallment } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function openPrintWindow(html: string) {
  const win = window.open('', '_blank', 'width=320,height=600');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Recibo</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; color: #000; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .sep { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; }
      .mt { margin-top: 4px; }
      .mb { margin-bottom: 4px; }
      h1 { font-size: 16px; margin-bottom: 2px; }
      h2 { font-size: 13px; margin-bottom: 4px; }
      .section-title { font-size: 11px; font-weight: bold; margin-top: 6px; margin-bottom: 2px; text-transform: uppercase; }
      @media print { @page { margin: 0; size: 80mm auto; } }
    </style></head><body>${html}</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 300);
}

export function printRepairReceipt(repair: Repair, orgName?: string, logoUrl?: string) {
  const date = format(new Date(repair.received_at), "dd/MM/yyyy HH:mm", { locale: es });
  const businessName = orgName || 'Mi Negocio';
  
  const checklistLabels: Record<string, string> = {
    brokenScreen: '⚠ Pantalla rota', scratchedBack: '⚠ Tapa rayada', noDisplay: '⚠ Sin display',
    sunkenButtons: '⚠ Botones hundidos', missingParts: '⚠ Partes faltantes', waterDamage: '⚠ Daño por agua',
    crackedBack: '⚠ Tapa agrietada', chargerPortDamage: '⚠ Puerto de carga dañado',
  };
  const activeChecks = Object.entries(repair.checklist || {}).filter(([, v]) => v).map(([k]) => checklistLabels[k] || k);

  // Parse faults (support comma-separated or line-separated)
  const faults = repair.reported_fault
    .split(/[,\n]/)
    .map(f => f.trim())
    .filter(f => f.length > 0);

  const faultsHtml = faults.length > 1
    ? faults.map((f, i) => `<p style="margin-left:4px">${i + 1}. ${f}</p>`).join('')
    : `<p>${repair.reported_fault}</p>`;

  const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height:40px;max-width:60mm;margin:0 auto 4px;display:block" />` : '';

  const html = `
    <div class="center">${logoHtml}<h1>${businessName.toUpperCase()}</h1><p>Sistema de Gestión — Taller</p></div>
    <div class="sep"></div>
    <div class="center bold"><h2>ORDEN DE REPARACIÓN</h2><p>#${repair.id.slice(0, 8).toUpperCase()}</p><p>${date}</p></div>
    <div class="sep"></div>
    <p class="section-title">DATOS DEL CLIENTE</p>
    <p><b>Cliente:</b> ${repair.customer_name}</p>
    <p><b>Teléfono:</b> ${repair.customer_phone || '—'}</p>
    <div class="sep"></div>
    <p class="section-title">DATOS DEL EQUIPO</p>
    <p><b>Equipo:</b> ${repair.brand} ${repair.model}</p>
    ${repair.imei ? `<p><b>IMEI:</b> ${repair.imei}</p>` : ''}
    ${repair.color ? `<p><b>Color:</b> ${repair.color}</p>` : ''}
    ${repair.lock_code ? `<p><b>Código:</b> ${repair.lock_code}</p>` : ''}
    <div class="sep"></div>
    <p class="section-title">FALLA(S) REPORTADA(S)</p>
    ${faultsHtml}
    ${activeChecks.length > 0 ? `<div class="mt"><p class="section-title">CONDICIÓN FÍSICA</p>${activeChecks.join('<br/>')}</div>` : ''}
    <div class="sep"></div>
    <div class="row bold"><span>TOTAL:</span><span>${formatCurrency(repair.total_price)}</span></div>
    <div class="row mt"><span>Adelanto:</span><span>${formatCurrency(repair.advance)}</span></div>
    <div class="sep" style="border-style:solid;margin:4px 0"></div>
    <div class="row bold"><span>PENDIENTE:</span><span>${formatCurrency(repair.balance)}</span></div>
    <div class="sep"></div>
    <div class="center mt">
      <p style="font-size:11px">Estado: <b>${repair.status.toUpperCase().replace(/_/g, ' ')}</b></p>
    </div>
    <div class="sep"></div>
    <div class="center mt"><p>★ ${businessName.toUpperCase()} ★</p><p style="font-size:10px;margin-top:4px">Gracias por su confianza</p></div>
  `;
  openPrintWindow(html);
}

export interface SaleReceiptOptions {
  batteryHealth?: number;
  condition?: string;
  grade?: string;
  warrantyText?: string;
  tradeInDevices?: Array<{ brand: string; model: string; imei?: string; value: number; condition?: string; batteryHealth?: number }>;
  tradeInTotal?: number;
}

export function printSaleReceipt(sale: Sale, installments?: LoanInstallment[], orgName?: string, options?: SaleReceiptOptions, logoUrl?: string) {
  const date = format(new Date(sale.sold_at), "dd/MM/yyyy HH:mm", { locale: es });
  const businessName = orgName || 'Mi Negocio';
  const items = sale.sale_items || [];
  const logoHtml = logoUrl ? `<img src="${logoUrl}" alt="Logo" style="max-height:40px;max-width:60mm;margin:0 auto 4px;display:block" />` : '';

  let itemsHtml = items.map((it) => `
    <div class="row"><span>${it.brand} ${it.model}</span><span>${formatCurrency(it.unit_price)}</span></div>
    ${it.imei ? `<p style="font-size:10px;color:#666">IMEI: ${it.imei}</p>` : ''}
    ${it.color ? `<p style="font-size:10px;color:#666">Color: ${it.color}</p>` : ''}
  `).join('');

  // Extra device details from first item in cart
  let deviceDetailsHtml = '';
  if (options) {
    const details: string[] = [];
    if (options.condition) details.push(`<b>Condición:</b> ${options.condition}`);
    if (options.grade) details.push(`<b>Grado:</b> ${options.grade}`);
    if (options.batteryHealth) details.push(`<b>Batería:</b> ${options.batteryHealth}%`);
    if (details.length > 0) {
      deviceDetailsHtml = `<div style="font-size:10px;color:#666;margin-top:2px">${details.join(' · ')}</div>`;
    }
  }

  let paymentHtml = '';
  if (sale.payment_method === 'cash') {
    paymentHtml = `
      <div class="row"><span>Recibido:</span><span>${formatCurrency(sale.amount_received)}</span></div>
      <div class="row"><span>Cambio:</span><span>${formatCurrency(sale.change_given)}</span></div>
    `;
  } else if (sale.payment_method === 'financing' && installments) {
    paymentHtml = `
      <div class="row"><span>Inicial:</span><span>${formatCurrency(sale.amount_received)}</span></div>
      <p class="mt bold">Cuotas: ${installments.length}</p>
      <p>Pago mensual: ${formatCurrency(installments[0]?.scheduled_payment || 0)}</p>
    `;
  } else if (sale.payment_method === 'credit') {
    paymentHtml = `
      <div class="row"><span>Abono:</span><span>${formatCurrency(sale.amount_received)}</span></div>
      <div class="row"><span>Resta:</span><span>${formatCurrency(sale.total_amount - sale.amount_received)}</span></div>
    `;
  }

  const warrantyHtml = options?.warrantyText ? `
    <div class="sep"></div>
    <p class="section-title">GARANTÍA</p>
    <p style="font-size:10px;white-space:pre-wrap">${options.warrantyText}</p>
  ` : '';

  const tradeInHtml = options?.tradeInDevices && options.tradeInDevices.length > 0 ? `
    <div class="sep"></div>
    <p class="section-title">TRADE-IN (EQUIPO RECIBIDO)</p>
    ${options.tradeInDevices.map(t => `
      <div class="row"><span>${t.brand} ${t.model}</span><span>-${formatCurrency(t.value)}</span></div>
      ${t.imei ? `<p style="font-size:10px;color:#666">IMEI: ${t.imei}</p>` : ''}
      ${t.condition ? `<p style="font-size:10px;color:#666">Condición: ${t.condition}</p>` : ''}
      ${t.batteryHealth ? `<p style="font-size:10px;color:#666">Batería: ${t.batteryHealth}%</p>` : ''}
    `).join('')}
    <div class="row bold mt"><span>Descuento Trade-In:</span><span>-${formatCurrency(options.tradeInTotal || 0)}</span></div>
  ` : '';

  const html = `
    <div class="center">${logoHtml}<h1>${businessName.toUpperCase()}</h1><p>Comprobante de Venta</p></div>
    <div class="sep"></div>
    <div class="center"><p>${date}</p><p>#${sale.id.slice(0, 8).toUpperCase()}</p></div>
    <div class="sep"></div>
    <p><b>CLIENTE:</b> ${sale.customer_name}</p>
    ${sale.customer_phone ? `<p><b>TEL:</b> ${sale.customer_phone}</p>` : ''}
    <div class="sep"></div>
    ${itemsHtml}
    ${deviceDetailsHtml}
    ${tradeInHtml}
    <div class="sep"></div>
    <div class="row bold"><span>TOTAL:</span><span>${formatCurrency(sale.total_amount)}</span></div>
    ${paymentHtml}
    ${warrantyHtml}
    <div class="sep"></div>
    <div class="center mt"><p>★ ${businessName.toUpperCase()} ★</p><p style="font-size:10px">Gracias por su compra</p></div>
  `;
  openPrintWindow(html);
}
