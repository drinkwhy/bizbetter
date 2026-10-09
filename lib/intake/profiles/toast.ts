import type { DatasetType } from '@/lib/evidence/model';
import type { SourceProfile } from '@/lib/intake/profiles/types';

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9#]+/g, ' ').trim();

type MapHit = { field: string; confidence: number; reason: string };

/** Toast export filename signatures (nightly + manual downloads). */
const TOAST_FILE_HINTS = [
  'orderdetails',
  'paymentdetails',
  'itemselectiondetails',
  'modifierselectiondetails',
  'productmix',
  'product mix',
  'settled deposits',
  'daily card activity',
  'cashentries',
  'timeentries',
  'accountingreport',
  'allitemsreport',
  'toast',
];

/** Header signatures that strongly indicate a Toast export. */
const TOAST_HEADER_HINTS = [
  'order id',
  'payment id',
  'check id',
  'check #',
  'revenue center',
  'dining area',
  'dining option',
  'swiped card amount',
  'keyed card amount',
  'amount tendered',
  'tab names',
  'tab name',
  'menu group',
  'item qty',
  'master id',
];

/**
 * Toast-specific column aliases.
 * High confidence (>= 0.9) auto-confirms in the intake UI.
 * Leave room for Square/Clover profiles to override by higher detect score.
 */
const TOAST_ALIASES: Record<string, MapHit> = {
  // Dates
  'opened': { field: 'date', confidence: 0.96, reason: 'Toast order open timestamp.' },
  'order date': { field: 'date', confidence: 0.97, reason: 'Toast order date.' },
  'paid date': { field: 'date', confidence: 0.98, reason: 'Toast payment date.' },
  'paid timestamp': { field: 'date', confidence: 0.95, reason: 'Toast paid timestamp.' },
  'business date': { field: 'date', confidence: 0.99, reason: 'Toast business date.' },
  'batch date': { field: 'date', confidence: 0.96, reason: 'Toast batch/deposit date.' },
  'date': { field: 'date', confidence: 0.9, reason: 'Toast date column.' },

  // Identifiers
  'order id': { field: 'transaction_id', confidence: 0.98, reason: 'Toast stable order id.' },
  'order #': { field: 'transaction_id', confidence: 0.96, reason: 'Toast order number.' },
  'order number': { field: 'transaction_id', confidence: 0.96, reason: 'Toast order number.' },
  'payment id': { field: 'transaction_id', confidence: 0.98, reason: 'Toast payment id.' },
  'check id': { field: 'transaction_id', confidence: 0.95, reason: 'Toast check id.' },
  'check #': { field: 'transaction_id', confidence: 0.94, reason: 'Toast check number.' },
  'check number': { field: 'transaction_id', confidence: 0.94, reason: 'Toast check number.' },

  // Money
  'amount': { field: 'amount', confidence: 0.88, reason: 'Toast amount; confirm gross vs net in review.' },
  'total': { field: 'amount', confidence: 0.85, reason: 'Toast total amount.' },
  'total value': { field: 'amount', confidence: 0.9, reason: 'Toast payment total.' },
  'gross amount': { field: 'revenue', confidence: 0.94, reason: 'Toast gross sales amount.' },
  'gross amount incl voids': { field: 'revenue', confidence: 0.9, reason: 'Toast gross including voids.' },
  'net amount': { field: 'revenue', confidence: 0.96, reason: 'Toast net sales amount.' },
  'net deposit': { field: 'amount', confidence: 0.95, reason: 'Toast net deposit after fees.' },
  'deposit amount': { field: 'amount', confidence: 0.94, reason: 'Toast deposit amount.' },
  'processing fees': { field: 'expense', confidence: 0.98, reason: 'Toast card processing fees.' },
  'credit card fees': { field: 'expense', confidence: 0.98, reason: 'Toast credit card fees.' },
  'fees': { field: 'expense', confidence: 0.86, reason: 'Toast fee column; confirm it is processing fees.' },
  'tip': { field: 'amount', confidence: 0.9, reason: 'Toast tip amount.' },
  'tip value': { field: 'amount', confidence: 0.92, reason: 'Toast tip value.' },
  'tips': { field: 'amount', confidence: 0.9, reason: 'Toast tips total.' },
  'gratuity': { field: 'amount', confidence: 0.9, reason: 'Toast gratuity.' },
  'refunded': { field: 'description', confidence: 0.8, reason: 'Toast refund status flag.' },
  'refund amount': { field: 'amount', confidence: 0.92, reason: 'Toast refund amount.' },
  'swiped card amount': { field: 'amount', confidence: 0.93, reason: 'Toast swiped card amount.' },
  'keyed card amount': { field: 'amount', confidence: 0.93, reason: 'Toast keyed card amount.' },
  'amount tendered': { field: 'amount', confidence: 0.9, reason: 'Toast cash tendered.' },

  // Item / menu
  'menu item': { field: 'description', confidence: 0.97, reason: 'Toast menu item name.' },
  'item name': { field: 'description', confidence: 0.97, reason: 'Toast item name.' },
  'item': { field: 'description', confidence: 0.85, reason: 'Toast item label.' },
  'menu group': { field: 'category', confidence: 0.96, reason: 'Toast menu group.' },
  'menu name': { field: 'category', confidence: 0.9, reason: 'Toast menu name.' },
  'sales category': { field: 'category', confidence: 0.95, reason: 'Toast sales category.' },
  'category': { field: 'category', confidence: 0.92, reason: 'Toast category.' },
  'item qty': { field: 'quantity', confidence: 0.97, reason: 'Toast item quantity.' },
  'item qty incl voids': { field: 'quantity', confidence: 0.94, reason: 'Toast quantity including voids.' },
  'quantity': { field: 'quantity', confidence: 0.95, reason: 'Toast quantity.' },
  'qty sold': { field: 'quantity', confidence: 0.95, reason: 'Toast quantity sold.' },
  'avg price': { field: 'amount', confidence: 0.88, reason: 'Toast average item price.' },
  'cogs': { field: 'unit_cost', confidence: 0.97, reason: 'Toast cost of goods sold.' },
  'cost': { field: 'unit_cost', confidence: 0.9, reason: 'Toast item cost.' },
  'food cost': { field: 'material_cost', confidence: 0.94, reason: 'Toast food cost.' },
  'unit cost': { field: 'unit_cost', confidence: 0.96, reason: 'Toast unit cost.' },

  // People / place
  'server': { field: 'employee', confidence: 0.96, reason: 'Toast server name.' },
  'employee': { field: 'employee', confidence: 0.96, reason: 'Toast employee name.' },
  'employee name': { field: 'employee', confidence: 0.97, reason: 'Toast employee name.' },
  'location': { field: 'geography', confidence: 0.94, reason: 'Toast location label.' },
  'restaurant location': { field: 'geography', confidence: 0.95, reason: 'Toast restaurant location.' },
  'revenue center': { field: 'category', confidence: 0.9, reason: 'Toast revenue center.' },
  'dining option': { field: 'service_type', confidence: 0.95, reason: 'Toast dining option.' },
  'order source': { field: 'service_type', confidence: 0.94, reason: 'Toast order source channel.' },
  'dining area': { field: 'geography', confidence: 0.88, reason: 'Toast dining area.' },
  'service': { field: 'service_type', confidence: 0.86, reason: 'Toast day-part / service.' },
  'tab name': { field: 'customer', confidence: 0.8, reason: 'Toast tab name; may be guest name.' },
  'tab names': { field: 'customer', confidence: 0.8, reason: 'Toast tab names; may be guest name.' },
};

function scoreToast(fileName: string, headers: string[]): number {
  const name = normalize(fileName);
  const headerText = normalize(headers.join(' '));
  let score = 0;

  for (const hint of TOAST_FILE_HINTS) {
    if (name.includes(normalize(hint))) score += 3;
  }
  for (const hint of TOAST_HEADER_HINTS) {
    if (headerText.includes(normalize(hint))) score += 2;
  }
  // Strong combo: order id + payment id / revenue center is almost certainly Toast.
  const keys = new Set(headers.map(normalize));
  if (keys.has('order id') && (keys.has('payment id') || keys.has('revenue center'))) score += 5;
  if (keys.has('swiped card amount') || keys.has('keyed card amount')) score += 4;
  if (keys.has('master id') && keys.has('menu item')) score += 4;

  return score;
}

function classifyToast(fileName: string, headers: string[]): DatasetType | null {
  const text = normalize(fileName + ' ' + headers.join(' '));
  if (/payment|deposit|card activity|settled deposit/.test(text)) return 'payments';
  if (/order detail|orders?( |$)/.test(text)) return 'transactions';
  if (/product mix|item selection|all items|menu item/.test(text)) return 'transactions';
  if (/time entr|labor|hours worked/.test(text)) return 'time_entries';
  if (/accounting|general ledger|gl account/.test(text)) return 'general_ledger';
  if (/cash management|cash entr/.test(text)) return 'transactions';
  // Detected as Toast but ambiguous sheet → payments is safest for fee analysis.
  return scoreToast(fileName, headers) >= 4 ? 'payments' : null;
}

function mapToastColumn(
  sourceColumn: string,
  dataset: DatasetType,
  _headers: string[]
): { targetField: string; confidence: number; reason: string; confirmed: boolean } | null {
  const key = normalize(sourceColumn);
  const hit = TOAST_ALIASES[key];
  if (!hit) return null;

  // Dataset-aware refinements for ambiguous money columns.
  let field = hit.field;
  let confidence = hit.confidence;
  let reason = `Toast profile: ${hit.reason}`;

  if (dataset === 'payments') {
    if (key === 'amount' || key === 'total' || key === 'total value') {
      field = 'payment_amount';
      confidence = Math.max(confidence, 0.9);
      reason = 'Toast profile: payment amount on a payments export.';
    }
    if (key === 'processing fees' || key === 'credit card fees' || key === 'fees') {
      field = 'expense';
      confidence = Math.max(confidence, 0.97);
    }
  }

  if (dataset === 'transactions' || dataset === 'jobs') {
    if (key === 'net amount' || key === 'gross amount' || key === 'sales') {
      field = 'revenue';
      confidence = Math.max(confidence, 0.93);
      reason = 'Toast profile: sales amount on an orders/product-mix export.';
    }
  }

  return {
    targetField: field,
    confidence,
    reason,
    confirmed: confidence >= 0.9,
  };
}

export const toastProfile: SourceProfile = {
  id: 'toast',
  label: 'Toast POS',
  detect: scoreToast,
  classify: classifyToast,
  mapColumn: mapToastColumn,
};

/** Export list for docs / future UI "Toast pack" button. */
export const TOAST_EXPORT_CHECKLIST = [
  { id: 'settled_deposits', name: 'Settled Deposits / Daily Card Activity', path: 'Reports → Payments → Settled Deposits Daily Breakdown' },
  { id: 'payment_details', name: 'Payment Details', path: 'Reports → Payments or Data Export: Payment Details' },
  { id: 'order_details', name: 'Orders / Order Details', path: 'Reports → Sales → Orders or Data Export: Order Details' },
  { id: 'product_mix', name: 'Product Mix / Item Selection', path: 'Reports → Menus → Product Mix' },
  { id: 'sales_summary', name: 'Sales Summary', path: 'Reports → Sales → Sales Summary' },
  { id: 'accounting_by_day', name: 'Accounting by Day (if GL codes set)', path: 'Reports → Accounting → Accounting by Day' },
] as const;
