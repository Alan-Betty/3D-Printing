/**
 * Production statuses, priority definitions, and paint specification options.
 */

export const PRODUCTION_STATUSES = [
  {
    id: 'order_received',
    label: 'Awaiting Print',
    step: 0,
    color: '#8b94a3',
    badgeClass: 'status-received',
    desc: 'Intake logged · Queued for 3D printing (Price & Weight optional)',
  },
  {
    id: 'painting_in_progress',
    label: 'Painting',
    step: 1,
    color: '#e5a93b',
    badgeClass: 'status-painting',
    desc: 'Currently in the paint booth or detailing bench',
  },
  {
    id: 'ready_for_delivery',
    label: 'Ready for Delivery',
    step: 2,
    color: '#34d399',
    badgeClass: 'status-ready',
    desc: 'Packed, labeled, awaiting courier or customer pickup',
  },
  {
    id: 'delivered_completed',
    label: 'Completed',
    step: 3,
    color: '#10b981',
    badgeClass: 'status-completed',
    desc: 'Fulfilled, handed over to client or courier',
  },
  {
    id: 'on_hold',
    label: 'On Hold',
    step: -1,
    color: '#f59e0b',
    badgeClass: 'status-hold',
    desc: 'Paused awaiting client clarification, materials, or painting review',
  },
  {
    id: 'cancelled',
    label: 'Cancelled',
    step: -2,
    color: '#ef4444',
    badgeClass: 'status-cancelled',
    desc: 'Order aborted or refunded; removed from active queues',
  },
]

export const STATUS_LOOKUP = {
  ...Object.fromEntries(PRODUCTION_STATUSES.map((s) => [s.id, s])),
  // Legacy alias for waiting_to_start
  waiting_to_start: {
    id: 'waiting_to_start',
    label: 'Awaiting Print',
    step: 0,
    color: '#8b94a3',
    badgeClass: 'status-received',
    desc: 'Mapped to awaiting print',
  },
  // Legacy alias for drying_curing
  drying_curing: {
    id: 'drying_curing',
    label: 'Painting',
    step: 1,
    color: '#e5a93b',
    badgeClass: 'status-painting',
    desc: 'Mapped to painting',
  },
  // Legacy alias for quality_check
  quality_check: {
    id: 'quality_check',
    label: 'Painting',
    step: 1,
    color: '#e5a93b',
    badgeClass: 'status-painting',
    desc: 'Mapped to painting',
  },
}

export const WORKFLOW_STAGES = PRODUCTION_STATUSES.filter((s) => s.step >= 0)

export const PRIORITIES = [
  {
    id: 'standard',
    label: 'Standard',
    desc: 'Normal processing priority. Follows assigned delivery date.',
  },
  {
    id: 'express',
    label: 'Express',
    desc: 'Higher processing priority. Highlighted in production queues.',
  },
]

export const PAINT_FINISHES = [
  'Matte',
  'Satin',
  'Gloss',
  'Semi-Gloss',
  'High-Gloss',
  'Metallic',
  'Textured',
]

export const PAINT_TYPES = [
  'Acrylic',
  'Enamel',
  'Polyurethane',
  'Epoxy',
  'Lacquer',
  'Automotive Spray',
  'Primer + Topcoat',
  'Powder Coat / Other',
]

export const SORT_OPTIONS = [
  { id: 'priority', label: 'Highest Priority (Overdue > Express > Deadline)' },
  { id: 'delivery_asc', label: 'Earliest Delivery Date' },
  { id: 'overdue', label: 'Most Overdue First' },
  { id: 'newest', label: 'Newest Orders First' },
  { id: 'oldest', label: 'Oldest Orders First' },
  { id: 'status', label: 'Current Production Stage' },
]
