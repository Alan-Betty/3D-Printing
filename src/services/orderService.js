import { STATUS_LOOKUP } from '../constants/production'

/**
 * Normalizes an order record from the database or form, ensuring all new
 * fields have resilient defaults without corrupting existing records.
 */
export function normalizeOrder(order) {
  if (!order) return null

  // Backward compatibility with legacy print_type ('regular' vs 'express')
  const priority =
    order.priority ||
    (order.print_type === 'express' ? 'express' : 'standard')

  let production_status = order.production_status || 'order_received'
  if (production_status === 'drying_curing' || production_status === 'quality_check') {
    production_status = 'painting_in_progress'
  }

  // Extract multi-colors array or synthesize from primary/secondary fields
  let colors = Array.isArray(order.colors) ? [...order.colors] : []
  if (colors.length === 0 && (order.primary_color || order.primary_color_code)) {
    colors.push({
      role: 'Primary',
      name: order.primary_color || '',
      code: order.primary_color_code || '',
      paint_type: order.paint_type || '',
      finish: order.finish || '',
      notes: order.color_notes || '',
    })
    if (order.secondary_color || order.secondary_color_code) {
      colors.push({
        role: 'Secondary',
        name: order.secondary_color || '',
        code: order.secondary_color_code || '',
        paint_type: order.paint_type || '',
        finish: order.finish || '',
        notes: '',
      })
    }
  }

  return {
    ...order,
    priority,
    production_status,
    print_status:
      order.print_status ||
      (production_status === 'order_received' || production_status === 'waiting_to_start'
        ? 'awaiting_print'
        : 'completed'),
    print_done:
      order.print_done !== undefined
        ? Boolean(order.print_done)
        : production_status !== 'order_received' && production_status !== 'waiting_to_start',
    customer_contact: order.customer_contact || '',
    description: order.description || '',
    delivery_date: order.delivery_date || null,
    primary_color: order.primary_color || colors[0]?.name || '',
    primary_color_code: order.primary_color_code || colors[0]?.code || '',
    secondary_color: order.secondary_color || colors[1]?.name || '',
    secondary_color_code: order.secondary_color_code || colors[1]?.code || '',
    paint_type: order.paint_type || colors[0]?.paint_type || '',
    finish: order.finish || colors[0]?.finish || '',
    special_instructions: order.special_instructions || '',
    color_notes: order.color_notes || '',
    colors,
  }
}

/**
 * Calculates calendar days between today and the delivery date.
 * Returns null if no delivery date is set.
 * < 0 means overdue (e.g., -2 = 2 days overdue).
 * === 0 means due today.
 * > 0 means days remaining (e.g., 1 = due tomorrow).
 */
export function getDaysRemaining(deliveryDate, referenceDate = new Date()) {
  if (!deliveryDate) return null
  const target = new Date(deliveryDate)
  if (Number.isNaN(target.getTime())) return null

  // Normalize both dates to local calendar midnight
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  )
  const dest = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  )

  const diffMs = dest.getTime() - ref.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Returns user-facing status and urgency badges for delivery deadlines.
 */
export function getDeliveryDeadlineInfo(order, referenceDate = new Date()) {
  const normalized = normalizeOrder(order)
  const isTerminal =
    normalized.production_status === 'delivered_completed' ||
    normalized.production_status === 'cancelled'

  if (!normalized.delivery_date) {
    return {
      hasDate: false,
      daysRemaining: null,
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      isDueIn3Days: false,
      badgeText: 'No delivery date',
      badgeClass: 'deadline-none',
      urgency: 'none',
    }
  }

  const days = getDaysRemaining(normalized.delivery_date, referenceDate)

  if (isTerminal) {
    return {
      hasDate: true,
      daysRemaining: days,
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      isDueIn3Days: false,
      badgeText: normalized.production_status === 'delivered_completed' ? 'Fulfilled' : 'Cancelled',
      badgeClass: 'deadline-terminal',
      urgency: 'none',
    }
  }

  if (days < 0) {
    const overdueDays = Math.abs(days)
    return {
      hasDate: true,
      daysRemaining: days,
      isOverdue: true,
      isDueToday: false,
      isDueTomorrow: false,
      isDueIn3Days: false,
      badgeText: `Overdue by ${overdueDays}d`,
      badgeClass: 'deadline-overdue',
      urgency: 'critical',
    }
  }

  if (days === 0) {
    return {
      hasDate: true,
      daysRemaining: 0,
      isOverdue: false,
      isDueToday: true,
      isDueTomorrow: false,
      isDueIn3Days: true,
      badgeText: 'Due today',
      badgeClass: 'deadline-today',
      urgency: 'high',
    }
  }

  if (days === 1) {
    return {
      hasDate: true,
      daysRemaining: 1,
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: true,
      isDueIn3Days: true,
      badgeText: 'Due tomorrow',
      badgeClass: 'deadline-tomorrow',
      urgency: 'high',
    }
  }

  if (days <= 3) {
    return {
      hasDate: true,
      daysRemaining: days,
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      isDueIn3Days: true,
      badgeText: `Due in ${days} days`,
      badgeClass: 'deadline-approaching',
      urgency: 'medium',
    }
  }

  return {
    hasDate: true,
    daysRemaining: days,
    isOverdue: false,
    isDueToday: false,
    isDueTomorrow: false,
    isDueIn3Days: false,
    badgeText: `In ${days} days`,
    badgeClass: 'deadline-normal',
    urgency: 'normal',
  }
}

/**
 * Calculates dashboard statistics strictly derived from the current database records.
 */
export function calculateDashboardStats(rawOrders, referenceDate = new Date()) {
  const orders = (rawOrders || []).map(normalizeOrder)

  let totalActive = 0
  let awaitingPrint = 0
  let printing = 0
  let awaitingPainting = 0 // backward-compatible alias for waiting_to_start
  let paintingInProgress = 0
  let qualityCheck = 0
  let readyForDelivery = 0
  let completed = 0
  let express = 0
  let dueToday = 0
  let overdue = 0
  let dueWithin3Days = 0

  for (const o of orders) {
    const isCompleted = o.production_status === 'delivered_completed'
    const isCancelled = o.production_status === 'cancelled'
    const isActive = !isCompleted && !isCancelled

    if (isCompleted) completed++
    if (!isActive) continue

    totalActive++

    if (o.production_status === 'order_received' || o.production_status === 'waiting_to_start') {
      awaitingPrint++
      awaitingPainting++
    }
    if (o.production_status === 'painting_in_progress') paintingInProgress++
    if (o.production_status === 'ready_for_delivery') readyForDelivery++
    if (o.priority === 'express') express++

    if (o.delivery_date) {
      const days = getDaysRemaining(o.delivery_date, referenceDate)
      if (days !== null) {
        if (days < 0) overdue++
        else if (days === 0) dueToday++
        if (days >= 0 && days <= 3) dueWithin3Days++
      }
    }
  }

  return {
    totalActive,
    awaitingPrint,
    printing,
    awaitingPainting,
    paintingInProgress,
    qualityCheck,
    dryingCuring: 0,
    readyForDelivery,
    completed,
    express,
    dueToday,
    overdue,
    dueWithin3Days,
  }
}

/**
 * Checks whether an order has valid Price (> ₹0) and Print Weight (> 0g).
 * Price and weight are optional at intake (Awaiting Print), but mandatory
 * starting from Printing onwards.
 */
export function hasRequiredPrintingSpecs(order) {
  if (!order) return false
  const priceVal = Number(order.price)
  const weightVal = Number(order.weight_g)
  const hasValidPrice = order.price !== '' && order.price != null && !Number.isNaN(priceVal) && priceVal > 0
  const hasValidWeight = order.weight_g !== '' && order.weight_g != null && !Number.isNaN(weightVal) && weightVal > 0
  return hasValidPrice && hasValidWeight
}

/**
 * Calculates total filament consumption across all prints:
 * Sums all grams of filament, adding 10% extra as miscellaneous (waste, purge, supports) for each print.
 */
export function calculateFilamentMetrics(rawOrders) {
  let netGrams = 0
  let miscGrams = 0
  let totalGrams = 0
  let printCountWithWeight = 0

  for (const o of rawOrders || []) {
    const w = Number(o?.weight_g)
    if (!Number.isNaN(w) && w > 0) {
      const misc = w * 0.10
      netGrams += w
      miscGrams += misc
      totalGrams += w + misc
      printCountWithWeight++
    }
  }

  // Rounded cleanly to 1 decimal place
  const roundedNet = Math.round(netGrams * 10) / 10
  const roundedMisc = Math.round(miscGrams * 10) / 10
  const roundedTotal = Math.round(totalGrams * 10) / 10

  return {
    netGrams: roundedNet,
    miscGrams: roundedMisc,
    totalGrams: roundedTotal,
    totalKg: Math.round((roundedTotal / 1000) * 100) / 100,
    printCountWithWeight,
  }
}

/**
 * Detects deadline warnings for actionable alerting across the dashboard.
 */
export function getDeadlineWarnings(rawOrders, referenceDate = new Date()) {
  const orders = (rawOrders || []).map(normalizeOrder)
  const warnings = []

  const activeOrders = orders.filter(
    (o) => o.production_status !== 'delivered_completed' && o.production_status !== 'cancelled'
  )

  // 1. Overdue orders
  const overdueOrders = activeOrders.filter((o) => {
    const days = getDaysRemaining(o.delivery_date, referenceDate)
    return days !== null && days < 0
  })
  if (overdueOrders.length > 0) {
    warnings.push({
      id: 'warn-overdue',
      type: 'critical',
      title: `${overdueOrders.length} Order${overdueOrders.length > 1 ? 's' : ''} Overdue`,
      message: `Past expected delivery date: ${overdueOrders
        .slice(0, 3)
        .map((o) => `${o.item} (${o.customer})`)
        .join(', ')}${overdueOrders.length > 3 ? '...' : ''}`,
      orderIds: overdueOrders.map((o) => o.id),
      filterKey: 'overdue',
    })
  }

  // 2. Express orders due tomorrow or today
  const urgentExpress = activeOrders.filter((o) => {
    if (o.priority !== 'express') return false
    const days = getDaysRemaining(o.delivery_date, referenceDate)
    return days !== null && (days === 0 || days === 1)
  })
  if (urgentExpress.length > 0) {
    warnings.push({
      id: 'warn-express-tomorrow',
      type: 'urgent',
      title: `${urgentExpress.length} Express Order${urgentExpress.length > 1 ? 's' : ''} Due Immediately`,
      message: urgentExpress
        .slice(0, 3)
        .map((o) => `${o.item} (Due ${getDaysRemaining(o.delivery_date, referenceDate) === 0 ? 'Today' : 'Tomorrow'})`)
        .join(', '),
      orderIds: urgentExpress.map((o) => o.id),
      filterKey: 'express',
    })
  }

  // 3. Orders due today (standard or express)
  const dueTodayOrders = activeOrders.filter((o) => {
    const days = getDaysRemaining(o.delivery_date, referenceDate)
    return days === 0
  })
  if (dueTodayOrders.length > 0) {
    warnings.push({
      id: 'warn-due-today',
      type: 'warning',
      title: `${dueTodayOrders.length} Order${dueTodayOrders.length > 1 ? 's' : ''} Due Today`,
      message: `Scheduled for delivery today: ${dueTodayOrders
        .slice(0, 3)
        .map((o) => `${o.item} (${o.customer})`)
        .join(', ')}`,
      orderIds: dueTodayOrders.map((o) => o.id),
      filterKey: 'due_today',
    })
  }

  // 4. Orders approaching deadline that have not started
  const notStartedApproaching = activeOrders.filter((o) => {
    const days = getDaysRemaining(o.delivery_date, referenceDate)
    const isUnstarted =
      o.production_status === 'order_received' ||
      o.production_status === 'waiting_to_start'
    return isUnstarted && days !== null && days >= 0 && days <= 2
  })
  if (notStartedApproaching.length > 0) {
    warnings.push({
      id: 'warn-not-started',
      type: 'warning',
      title: `${notStartedApproaching.length} Approaching Order${notStartedApproaching.length > 1 ? 's' : ''} Not Started`,
      message: `Orders due within 2 days still awaiting paint work: ${notStartedApproaching
        .slice(0, 3)
        .map((o) => `${o.item}`)
        .join(', ')}`,
      orderIds: notStartedApproaching.map((o) => o.id),
      filterKey: 'waiting_to_start',
    })
  }

  // 5. Orders ready for delivery
  const readyOrders = activeOrders.filter(
    (o) => o.production_status === 'ready_for_delivery'
  )
  if (readyOrders.length > 0) {
    warnings.push({
      id: 'warn-ready',
      type: 'info',
      title: `${readyOrders.length} Order${readyOrders.length > 1 ? 's' : ''} Ready for Delivery`,
      message: `Finished & quality checked: ${readyOrders
        .slice(0, 3)
        .map((o) => `${o.item} (${o.customer})`)
        .join(', ')}`,
      orderIds: readyOrders.map((o) => o.id),
      filterKey: 'ready_for_delivery',
    })
  }

  return warnings
}

/**
 * Validates and formats a color string for display in swatches.
 */
export function isValidCssColor(str) {
  if (!str || typeof str !== 'string') return false
  const s = str.trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return true
  if (/^(rgb|hsl)a?\([\d\s.,%/-]+\)$/i.test(s)) return true
  // Known common CSS named colors
  const named = [
    'black','white','red','blue','green','yellow','orange','purple','cyan','magenta',
    'silver','gray','grey','maroon','olive','lime','aqua','teal','navy','gold','beige',
    'coral','crimson','indigo','ivory','khaki','lavender','plum','salmon','turquoise','violet'
  ]
  return named.includes(s.toLowerCase())
}

/**
 * Powerful multi-dimensional sorting logic considering:
 * 1. Overdue orders
 * 2. Express priority
 * 3. Upcoming delivery deadlines
 * 4. Production status
 */
export function sortOrders(orders, sortKey = 'priority', referenceDate = new Date()) {
  const list = [...(orders || []).map(normalizeOrder)]

  if (sortKey === 'priority') {
    return list.sort((a, b) => {
      const aTerminal = a.production_status === 'delivered_completed' || a.production_status === 'cancelled'
      const bTerminal = b.production_status === 'delivered_completed' || b.production_status === 'cancelled'

      // Terminal orders sort to the bottom
      if (aTerminal && !bTerminal) return 1
      if (!aTerminal && bTerminal) return -1

      const aDays = getDaysRemaining(a.delivery_date, referenceDate)
      const bDays = getDaysRemaining(b.delivery_date, referenceDate)

      const aOverdue = aDays !== null && aDays < 0
      const bOverdue = bDays !== null && bDays < 0

      // 1. Overdue orders first (most overdue first)
      if (aOverdue && !bOverdue) return -1
      if (!aOverdue && bOverdue) return 1
      if (aOverdue && bOverdue) return aDays - bDays // e.g. -5 comes before -1

      // 2. Express priority next
      const aExp = a.priority === 'express'
      const bExp = b.priority === 'express'
      if (aExp && !bExp) return -1
      if (!aExp && bExp) return 1

      // 3. Upcoming delivery deadlines (earliest first)
      if (aDays !== null && bDays !== null) {
        if (aDays !== bDays) return aDays - bDays
      } else if (aDays !== null) {
        return -1
      } else if (bDays !== null) {
        return 1
      }

      // 4. Production status stage (waiting/in progress before later stages)
      const aStep = STATUS_LOOKUP[a.production_status]?.step ?? 99
      const bStep = STATUS_LOOKUP[b.production_status]?.step ?? 99
      if (aStep !== bStep) return aStep - bStep

      // 5. Fallback: newest created first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  if (sortKey === 'delivery_asc') {
    return list.sort((a, b) => {
      if (!a.delivery_date && !b.delivery_date) return 0
      if (!a.delivery_date) return 1
      if (!b.delivery_date) return -1
      return new Date(a.delivery_date) - new Date(b.delivery_date)
    })
  }

  if (sortKey === 'delivery_desc') {
    return list.sort((a, b) => {
      if (!a.delivery_date && !b.delivery_date) return 0
      if (!a.delivery_date) return 1
      if (!b.delivery_date) return -1
      return new Date(b.delivery_date) - new Date(a.delivery_date)
    })
  }

  if (sortKey === 'overdue') {
    return list.sort((a, b) => {
      const aDays = getDaysRemaining(a.delivery_date, referenceDate) ?? 9999
      const bDays = getDaysRemaining(b.delivery_date, referenceDate) ?? 9999
      return aDays - bDays
    })
  }

  if (sortKey === 'newest') {
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  if (sortKey === 'oldest') {
    return list.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  if (sortKey === 'status') {
    return list.sort((a, b) => {
      const aStep = STATUS_LOOKUP[a.production_status]?.step ?? 99
      const bStep = STATUS_LOOKUP[b.production_status]?.step ?? 99
      return aStep - bStep
    })
  }

  return list
}

/**
 * Filter orders by query, priority, status, timeframe, customer, and colour.
 */
export function filterOrders(orders, filters = {}, referenceDate = new Date()) {
  const list = (orders || []).map(normalizeOrder)
  const {
    query = '',
    priority = 'all',
    status = 'all',
    timeframe = 'all',
    customer = '',
    colour = '',
  } = filters

  const q = query.trim().toLowerCase()
  const cFilter = customer.trim().toLowerCase()
  const colFilter = colour.trim().toLowerCase()

  return list.filter((o) => {
    // 1. Text search across Order ID, Customer name, Item name, Colour name, Colour code
    if (q) {
      const idMatch = o.id?.toLowerCase().includes(q)
      const itemMatch = o.item?.toLowerCase().includes(q)
      const custMatch = o.customer?.toLowerCase().includes(q)
      const contactMatch = o.customer_contact?.toLowerCase().includes(q)
      const primaryColMatch =
        o.primary_color?.toLowerCase().includes(q) ||
        o.primary_color_code?.toLowerCase().includes(q)
      const secondaryColMatch =
        o.secondary_color?.toLowerCase().includes(q) ||
        o.secondary_color_code?.toLowerCase().includes(q)
      const multiColMatch = (o.colors || []).some(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q) ||
          c.paint_type?.toLowerCase().includes(q) ||
          c.finish?.toLowerCase().includes(q)
      )

      if (
        !idMatch &&
        !itemMatch &&
        !custMatch &&
        !contactMatch &&
        !primaryColMatch &&
        !secondaryColMatch &&
        !multiColMatch
      ) {
        return false
      }
    }

    // 2. Priority filter
    if (priority !== 'all') {
      if (o.priority !== priority) return false
    }

    // 3. Status filter
    if (status !== 'all') {
      if (status === 'active') {
        if (
          o.production_status === 'delivered_completed' ||
          o.production_status === 'cancelled'
        ) {
          return false
        }
      } else if (o.production_status !== status) {
        return false
      }
    }

    // 4. Timeframe filter
    if (timeframe !== 'all') {
      const days = getDaysRemaining(o.delivery_date, referenceDate)
      const isTerminal =
        o.production_status === 'delivered_completed' ||
        o.production_status === 'cancelled'

      if (timeframe === 'overdue') {
        if (isTerminal || days === null || days >= 0) return false
      } else if (timeframe === 'due_today') {
        if (isTerminal || days !== 0) return false
      } else if (timeframe === 'due_in_3_days') {
        if (isTerminal || days === null || days < 0 || days > 3) return false
      }
    }

    // 5. Specific customer filter
    if (cFilter && !o.customer?.toLowerCase().includes(cFilter)) {
      return false
    }

    // 6. Specific colour filter
    if (colFilter) {
      const hasCol =
        o.primary_color?.toLowerCase().includes(colFilter) ||
        o.primary_color_code?.toLowerCase().includes(colFilter) ||
        o.secondary_color?.toLowerCase().includes(colFilter) ||
        o.secondary_color_code?.toLowerCase().includes(colFilter) ||
        (o.colors || []).some(
          (c) =>
            c.name?.toLowerCase().includes(colFilter) ||
            c.code?.toLowerCase().includes(colFilter)
        )
      if (!hasCol) return false
    }

    return true
  })
}
