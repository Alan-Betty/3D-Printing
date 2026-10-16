import { describe, it, expect } from 'vitest'
import {
  calculateDashboardStats,
  getDeadlineWarnings,
  getDeliveryDeadlineInfo,
  sortOrders,
  filterOrders,
  normalizeOrder,
  isValidCssColor,
} from '../src/services/orderService'
import {
  PRODUCTION_STATUSES,
  STATUS_LOOKUP,
  WORKFLOW_STAGES,
  PRIORITIES,
} from '../src/constants/production'
import { logOrderChange, fetchOrderHistory } from '../src/services/historyService'

describe('Comprehensive Order Management and Production Tracking Suite', () => {
  const refDate = new Date('2026-10-14T00:00:00Z')

  describe('1. Production Statuses & Workflow Progression', () => {
    it('defines the required production statuses (with drying, quality check, and redundant printing removed)', () => {
      const expectedIds = [
        'order_received',
        'painting_in_progress',
        'ready_for_delivery',
        'delivered_completed',
        'on_hold',
        'cancelled',
      ]
      expect(PRODUCTION_STATUSES.map((s) => s.id)).toEqual(expectedIds)
      expect(PRODUCTION_STATUSES).toHaveLength(6)
    })

    it('orders the linear pipeline workflow correctly (0 to 3 without drying, QC, or duplicate print tab)', () => {
      expect(WORKFLOW_STAGES.map((s) => s.id)).toEqual([
        'order_received',
        'painting_in_progress',
        'ready_for_delivery',
        'delivered_completed',
      ])
      expect(STATUS_LOOKUP.waiting_to_start.label).toBe('Awaiting Print')
      expect(STATUS_LOOKUP.on_hold.step).toBe(-1)
      expect(STATUS_LOOKUP.cancelled.step).toBe(-2)
    })
  })

  describe('2. Order Priority System', () => {
    it('supports Standard and Express priorities without modifying prices', () => {
      const order = normalizeOrder({
        id: 'ord-prio-1',
        item: 'Scale Dragon',
        customer: 'Elena Rostova',
        price: 2500,
        priority: 'standard',
      })

      expect(order.priority).toBe('standard')
      expect(order.price).toBe(2500)

      // Elevating priority to express
      const expressOrder = normalizeOrder({
        ...order,
        priority: 'express',
      })

      expect(expressOrder.priority).toBe('express')
      expect(expressOrder.price).toBe(2500) // Price strictly preserved
    })

    it('sensibly sorts overdue orders first, then express, then deadline, then status', () => {
      const orders = [
        {
          id: 'ord-normal-future',
          priority: 'standard',
          delivery_date: '2026-10-20', // Future
          production_status: 'order_received',
          created_at: '2026-10-01',
        },
        {
          id: 'ord-express-tomorrow',
          priority: 'express',
          delivery_date: '2026-10-15', // Tomorrow
          production_status: 'waiting_to_start',
          created_at: '2026-10-02',
        },
        {
          id: 'ord-overdue-standard',
          priority: 'standard',
          delivery_date: '2026-10-12', // 2 days overdue
          production_status: 'painting_in_progress',
          created_at: '2026-10-03',
        },
        {
          id: 'ord-overdue-express',
          priority: 'express',
          delivery_date: '2026-10-11', // 3 days overdue
          production_status: 'painting_in_progress',
          created_at: '2026-10-04',
        },
        {
          id: 'ord-completed',
          priority: 'express',
          delivery_date: '2026-10-10',
          production_status: 'delivered_completed',
          created_at: '2026-10-01',
        },
      ]

      const sorted = sortOrders(orders, 'priority', refDate)

      // Overdue orders come first (most overdue first: 2026-10-11 before 2026-10-12)
      expect(sorted[0].id).toBe('ord-overdue-express')
      expect(sorted[1].id).toBe('ord-overdue-standard')
      // Next active express
      expect(sorted[2].id).toBe('ord-express-tomorrow')
      // Next active standard
      expect(sorted[3].id).toBe('ord-normal-future')
      // Terminal completed order at the bottom
      expect(sorted[4].id).toBe('ord-completed')
    })
  })

  describe('3. Delivery Date & Deadline Tracking', () => {
    it('accurately identifies overdue, due today, due tomorrow, and due in 3 days', () => {
      const overdueOrder = { delivery_date: '2026-10-10', production_status: 'waiting_to_start' }
      const dueTodayOrder = { delivery_date: '2026-10-14', production_status: 'painting_in_progress' }
      const dueTomorrowOrder = { delivery_date: '2026-10-15', production_status: 'ready_for_delivery' }
      const due3DaysOrder = { delivery_date: '2026-10-17', production_status: 'painting_in_progress' }
      const futureOrder = { delivery_date: '2026-10-25', production_status: 'order_received' }

      expect(getDeliveryDeadlineInfo(overdueOrder, refDate).isOverdue).toBe(true)
      expect(getDeliveryDeadlineInfo(dueTodayOrder, refDate).isDueToday).toBe(true)
      expect(getDeliveryDeadlineInfo(dueTomorrowOrder, refDate).isDueTomorrow).toBe(true)
      expect(getDeliveryDeadlineInfo(due3DaysOrder, refDate).isDueIn3Days).toBe(true)
      expect(getDeliveryDeadlineInfo(futureOrder, refDate).isDueIn3Days).toBe(false)
    })

    it('does not flag fulfilled or cancelled orders as overdue even if delivery date has passed', () => {
      const delivered = { delivery_date: '2026-10-01', production_status: 'delivered_completed' }
      const cancelled = { delivery_date: '2026-10-01', production_status: 'cancelled' }

      expect(getDeliveryDeadlineInfo(delivered, refDate).isOverdue).toBe(false)
      expect(getDeliveryDeadlineInfo(cancelled, refDate).isOverdue).toBe(false)
    })
  })

  describe('4. Paint Colour and Specification Tracking', () => {
    it('supports single-colour and multi-colour orders with specifications', () => {
      const order = normalizeOrder({
        item: 'Gundam Shield',
        customer: 'Amuro Ray',
        price: 1800,
        primary_color: 'Cobalt Blue',
        primary_color_code: '#0047ab',
        secondary_color: 'Signal White',
        secondary_color_code: '#ffffff',
        paint_type: 'Polyurethane',
        finish: 'Gloss',
        special_instructions: 'Apply 2 coats clear gloss. Mask center yellow cross.',
        color_notes: 'Matched to RAL 5013',
      })

      expect(order.primary_color).toBe('Cobalt Blue')
      expect(order.primary_color_code).toBe('#0047ab')
      expect(order.secondary_color).toBe('Signal White')
      expect(order.paint_type).toBe('Polyurethane')
      expect(order.finish).toBe('Gloss')
      expect(order.special_instructions).toContain('clear gloss')
      expect(order.colors).toHaveLength(2)
      expect(order.colors[0].role).toBe('Primary')
      expect(order.colors[1].role).toBe('Secondary')
    })

    it('generates visual colour swatches for valid HEX and CSS colors and handles codes gracefully', () => {
      expect(isValidCssColor('#4169E1')).toBe(true)
      expect(isValidCssColor('#fff')).toBe(true)
      expect(isValidCssColor('rgb(10, 20, 30)')).toBe(true)
      // Descriptive manufacturer names without hex are not valid CSS colors, but preserved as text
      expect(isValidCssColor('RAL 5002')).toBe(false)
      expect(isValidCssColor('Midnight Navy')).toBe(false)
    })
  })

  describe('5. Audit Trail & Chronological History Logging', () => {
    it('records and retrieves timestamped order history without leaking secrets', async () => {
      const saleId = 'test-sale-uuid-' + Date.now()
      const mockUser = { email: 'lead.operator@pyraxis-prints.app' }

      const entry1 = await logOrderChange({
        saleId,
        fieldChanged: 'production_status',
        oldValue: 'Order Received',
        newValue: 'Waiting to Start',
        notes: 'Prepped surface with 400-grit sandpaper',
        user: mockUser,
      })

      expect(entry1.sale_id).toBe(saleId)
      expect(entry1.field_changed).toBe('production_status')
      expect(entry1.old_value).toBe('Order Received')
      expect(entry1.new_value).toBe('Waiting to Start')
      expect(entry1.changed_by).toBe('lead.operator')
      expect(entry1.notes).toContain('Prepped surface')
      expect(entry1.created_at).toBeDefined()

      const entry2 = await logOrderChange({
        saleId,
        fieldChanged: 'priority',
        oldValue: 'standard',
        newValue: 'express',
        notes: 'Customer requested rush turnaround',
        user: mockUser,
      })

      const history = await fetchOrderHistory(saleId)
      expect(history.length).toBeGreaterThanOrEqual(2)
      // Chronological descending
      expect(history[0].field_changed).toBe('priority')
      expect(history[1].field_changed).toBe('production_status')
    })
  })

  describe('6. Dashboard Statistics and Warnings Integrity', () => {
    it('calculates all 9 statistics matching actual records and filters cancelled orders', () => {
      const orders = [
        { production_status: 'waiting_to_start', priority: 'standard', delivery_date: '2026-10-14' }, // due today
        { production_status: 'waiting_to_start', priority: 'express', delivery_date: '2026-10-15' }, // due tomorrow
        { production_status: 'painting_in_progress', priority: 'standard', delivery_date: '2026-10-13' }, // overdue by 1d
        { production_status: 'ready_for_delivery', priority: 'express', delivery_date: '2026-10-16' }, // due in 2d
        { production_status: 'delivered_completed', priority: 'standard', delivery_date: '2026-10-10' }, // completed
        { production_status: 'cancelled', priority: 'express', delivery_date: '2026-10-09' }, // cancelled
        { production_status: 'on_hold', priority: 'standard', delivery_date: '2026-10-25' }, // active on hold
      ]

      const stats = calculateDashboardStats(orders, refDate)

      // Total active = 7 - 1 completed - 1 cancelled = 5
      expect(stats.totalActive).toBe(5)
      expect(stats.awaitingPainting).toBe(2)
      expect(stats.paintingInProgress).toBe(1)
      expect(stats.readyForDelivery).toBe(1)
      expect(stats.completed).toBe(1)
      // Express active = waiting_to_start (express) + ready_for_delivery (express) = 2 (cancelled excluded!)
      expect(stats.express).toBe(2)
      expect(stats.dueToday).toBe(1)
      expect(stats.overdue).toBe(1)
      // Due in 3 days = today (14), tomorrow (15), in 2d (16) = 3
      expect(stats.dueWithin3Days).toBe(3)

      const warnings = getDeadlineWarnings(orders, refDate)
      expect(warnings.some((w) => w.filterKey === 'overdue')).toBe(true)
      expect(warnings.some((w) => w.filterKey === 'express')).toBe(true)
      expect(warnings.some((w) => w.filterKey === 'due_today')).toBe(true)
      expect(warnings.some((w) => w.filterKey === 'ready_for_delivery')).toBe(true)
    })
  })
})
