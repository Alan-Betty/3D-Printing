import { describe, it, expect } from 'vitest'
import {
  calculateDashboardStats,
  calculateFilamentMetrics,
  getDaysRemaining,
  getDeliveryDeadlineInfo,
  sortOrders,
  filterOrders,
  normalizeOrder,
  isValidCssColor,
  hasRequiredPrintingSpecs,
} from '../src/services/orderService'

describe('orderService', () => {
  const refDate = new Date('2026-10-14T10:00:00Z')

  const sampleOrders = [
    {
      id: 'ord-1',
      item: 'Cyberpunk Helmet',
      customer: 'Rick Astley',
      price: 2500,
      priority: 'express',
      delivery_date: '2026-10-12', // Overdue by 2 days
      production_status: 'painting_in_progress',
      primary_color: 'Neon Cyan',
      primary_color_code: '#00f3ff',
      created_at: '2026-10-01T10:00:00Z',
    },
    {
      id: 'ord-2',
      item: 'Articulated Dragon',
      customer: 'Sarah Connor',
      price: 1200,
      priority: 'standard',
      delivery_date: '2026-10-14', // Due today
      production_status: 'waiting_to_start',
      primary_color: 'Matte Black',
      primary_color_code: '#111111',
      created_at: '2026-10-02T10:00:00Z',
    },
    {
      id: 'ord-3',
      item: 'Boba Fett Armor Piece',
      customer: 'Din Djarin',
      price: 3800,
      priority: 'express',
      delivery_date: '2026-10-15', // Due tomorrow (in 1 day)
      production_status: 'ready_for_delivery',
      primary_color: 'Forest Green',
      primary_color_code: '#228b22',
      created_at: '2026-10-03T10:00:00Z',
    },
    {
      id: 'ord-4',
      item: 'Miniature Gargoyle',
      customer: 'Geralt of Rivia',
      price: 600,
      priority: 'standard',
      delivery_date: '2026-10-20', // Due in 6 days
      production_status: 'delivered_completed',
      primary_color: 'Granite Grey',
      primary_color_code: '#808080',
      created_at: '2026-09-20T10:00:00Z',
    },
    {
      id: 'ord-5',
      item: 'Prototype Enclosure',
      customer: 'Tony Stark',
      price: 1500,
      priority: 'express',
      delivery_date: '2026-10-10', // Past date but cancelled
      production_status: 'cancelled',
      primary_color: 'Hot Rod Red',
      primary_color_code: '#ff0033',
      created_at: '2026-10-05T10:00:00Z',
    },
    {
      id: 'ord-6',
      item: 'Gothic Vase',
      customer: 'Wednesday Addams',
      price: 900,
      priority: 'standard',
      delivery_date: '2026-10-16', // Due in 2 days (due within 3 days)
      production_status: 'waiting_to_start',
      primary_color: 'Obsidian Black',
      primary_color_code: '#000000',
      created_at: '2026-10-06T10:00:00Z',
    },
  ]

  it('calculates dashboard statistics accurately from records', () => {
    const stats = calculateDashboardStats(sampleOrders, refDate)

    // Total active: ord-1 (painting), ord-2 (waiting), ord-3 (ready), ord-6 (waiting) = 4
    expect(stats.totalActive).toBe(4)
    // Completed: ord-4 = 1
    expect(stats.completed).toBe(1)
    // Awaiting painting: ord-2, ord-6 = 2
    expect(stats.awaitingPainting).toBe(2)
    // Awaiting print (order_received / waiting_to_start): ord-2, ord-6 = 2
    expect(stats.awaitingPrint).toBe(2)
    // Currently being painted: ord-1 = 1
    expect(stats.paintingInProgress).toBe(1)
    // Ready for delivery: ord-3 = 1
    expect(stats.readyForDelivery).toBe(1)
    // Express among active: ord-1, ord-3 = 2 (ord-5 is cancelled)
    expect(stats.express).toBe(2)
    // Overdue among active: ord-1 (2026-10-12 < 2026-10-14) = 1
    expect(stats.overdue).toBe(1)
    // Due today among active: ord-2 (2026-10-14) = 1
    expect(stats.dueToday).toBe(1)
    // Due within 3 days: ord-2 (today), ord-3 (tomorrow), ord-6 (in 2 days) = 3
    expect(stats.dueWithin3Days).toBe(3)
  })

  it('validates mandatory price and weight for printing stage via hasRequiredPrintingSpecs', () => {
    // Both missing or zero -> false
    expect(hasRequiredPrintingSpecs({})).toBe(false)
    expect(hasRequiredPrintingSpecs({ price: 0, weight_g: 0 })).toBe(false)
    expect(hasRequiredPrintingSpecs({ price: 200, weight_g: null })).toBe(false)
    expect(hasRequiredPrintingSpecs({ price: null, weight_g: 50 })).toBe(false)
    expect(hasRequiredPrintingSpecs({ price: 0, weight_g: 50 })).toBe(false)
    expect(hasRequiredPrintingSpecs({ price: 200, weight_g: 0 })).toBe(false)

    // Valid price (> 0) and weight (> 0) -> true
    expect(hasRequiredPrintingSpecs({ price: 250, weight_g: 45 })).toBe(true)
    expect(hasRequiredPrintingSpecs({ price: '300.50', weight_g: '12.4' })).toBe(true)
  })

  it('correctly identifies days remaining and delivery deadline badges', () => {
    // ord-1 is 2 days overdue
    const d1 = getDeliveryDeadlineInfo(sampleOrders[0], refDate)
    expect(d1.isOverdue).toBe(true)
    expect(d1.daysRemaining).toBe(-2)
    expect(d1.badgeText).toContain('Overdue by 2d')

    // ord-2 is due today
    const d2 = getDeliveryDeadlineInfo(sampleOrders[1], refDate)
    expect(d2.isDueToday).toBe(true)
    expect(d2.daysRemaining).toBe(0)
    expect(d2.badgeText).toBe('Due today')

    // ord-3 is due tomorrow
    const d3 = getDeliveryDeadlineInfo(sampleOrders[2], refDate)
    expect(d3.isDueTomorrow).toBe(true)
    expect(d3.daysRemaining).toBe(1)

    // Completed order is not marked overdue even if delivery date has passed
    const d4 = getDeliveryDeadlineInfo(sampleOrders[3], refDate)
    expect(d4.isOverdue).toBe(false)
    expect(d4.badgeText).toBe('Fulfilled')

    // Cancelled order is not marked overdue
    const d5 = getDeliveryDeadlineInfo(sampleOrders[4], refDate)
    expect(d5.isOverdue).toBe(false)
    expect(d5.badgeText).toBe('Cancelled')
  })

  it('sorts orders with overdue first, then express, then upcoming deadlines', () => {
    const sorted = sortOrders(sampleOrders, 'priority', refDate)

    // 1st should be ord-1 (overdue)
    expect(sorted[0].id).toBe('ord-1')
    // 2nd should be ord-3 (active express)
    expect(sorted[1].id).toBe('ord-3')
    // 3rd should be ord-2 (active standard due today)
    expect(sorted[2].id).toBe('ord-2')
    // 4th should be ord-6 (active standard due in 2 days)
    expect(sorted[3].id).toBe('ord-6')
    // Terminal orders (ord-4 completed, ord-5 cancelled) at the bottom
    expect(sorted[4].id === 'ord-4' || sorted[4].id === 'ord-5').toBe(true)
  })

  it('filters orders by query, priority, status, and combined filters', () => {
    // Filter by item query
    const dragonSearch = filterOrders(sampleOrders, { query: 'dragon' }, refDate)
    expect(dragonSearch).toHaveLength(1)
    expect(dragonSearch[0].id).toBe('ord-2')

    // Filter by colour code
    const colorSearch = filterOrders(sampleOrders, { query: '#00f3ff' }, refDate)
    expect(colorSearch).toHaveLength(1)
    expect(colorSearch[0].id).toBe('ord-1')

    // Combined filter: Express + Painting in Progress
    const combined = filterOrders(
      sampleOrders,
      { priority: 'express', status: 'painting_in_progress' },
      refDate
    )
    expect(combined).toHaveLength(1)
    expect(combined[0].id).toBe('ord-1')

    // Filter due in 3 days
    const due3 = filterOrders(sampleOrders, { timeframe: 'due_in_3_days' }, refDate)
    // ord-2 (today), ord-3 (in 1 day), ord-6 (in 2 days)
    expect(due3.map((o) => o.id).sort()).toEqual(['ord-2', 'ord-3', 'ord-6'])
  })

  it('normalizes legacy orders without breaking existing fields', () => {
    const legacy = {
      id: 'leg-1',
      item: 'Spool Holder',
      customer: 'Maker 1',
      price: 500,
      print_type: 'express',
    }
    const normalized = normalizeOrder(legacy)
    expect(normalized.priority).toBe('express')
    expect(normalized.production_status).toBe('order_received')
    expect(normalized.delivery_date).toBeNull()
    expect(normalized.colors).toEqual([])
  })

  it('validates CSS and hex colors for swatches', () => {
    expect(isValidCssColor('#41e0b3')).toBe(true)
    expect(isValidCssColor('#ff6b35')).toBe(true)
    expect(isValidCssColor('#FFF')).toBe(true)
    expect(isValidCssColor('rgb(255, 0, 0)')).toBe(true)
    expect(isValidCssColor('Royal Blue')).toBe(false) // Not a valid CSS color string without hyphen/hex
    expect(isValidCssColor('RAL 5002')).toBe(false)
  })

  describe('calculateFilamentMetrics', () => {
    it('accurately sums filament weight and adds 10% miscellaneous overhead per print', () => {
      const orders = [
        { id: '1', weight_g: 100 }, // net 100, misc 10 -> 110
        { id: '2', weight_g: 50 },  // net 50,  misc 5  -> 55
        { id: '3', weight_g: 25 },  // net 25,  misc 2.5 -> 27.5
      ]
      const metrics = calculateFilamentMetrics(orders)
      expect(metrics.netGrams).toBe(175)
      expect(metrics.miscGrams).toBe(17.5)
      expect(metrics.totalGrams).toBe(192.5)
      expect(metrics.totalKg).toBe(0.19)
      expect(metrics.printCountWithWeight).toBe(3)
    })

    it('handles empty, null, and malformed inputs gracefully', () => {
      expect(calculateFilamentMetrics([])).toEqual({
        netGrams: 0,
        miscGrams: 0,
        totalGrams: 0,
        totalKg: 0,
        printCountWithWeight: 0,
      })
      expect(calculateFilamentMetrics(null)).toEqual({
        netGrams: 0,
        miscGrams: 0,
        totalGrams: 0,
        totalKg: 0,
        printCountWithWeight: 0,
      })
      const messyOrders = [
        { id: 'a', weight_g: null },
        { id: 'b', weight_g: undefined },
        { id: 'c', weight_g: 'invalid' },
        { id: 'd', weight_g: 0 },
        { id: 'e', weight_g: -10 },
        { id: 'f', weight_g: '40' }, // valid parsed string
      ]
      const metrics = calculateFilamentMetrics(messyOrders)
      expect(metrics.netGrams).toBe(40)
      expect(metrics.miscGrams).toBe(4)
      expect(metrics.totalGrams).toBe(44)
      expect(metrics.printCountWithWeight).toBe(1)
    })

    it('accurately calculates the 12 baseline seed orders to exactly 116.6g', () => {
      const seedOrders = [
        { weight_g: 14 },
        { weight_g: 9 },
        { weight_g: 20 },
        { weight_g: 5 },
        { weight_g: 5 },
        { weight_g: 15 },
        { weight_g: 5 },
        { weight_g: 6.5 },
        { weight_g: 6 },
        { weight_g: 8 },
        { weight_g: 10 },
        { weight_g: 2.5 },
      ]
      const metrics = calculateFilamentMetrics(seedOrders)
      expect(metrics.netGrams).toBe(106.0)
      expect(metrics.miscGrams).toBe(10.6)
      expect(metrics.totalGrams).toBe(116.6)
      expect(metrics.totalKg).toBe(0.12)
      expect(metrics.printCountWithWeight).toBe(12)
    })
  })
})

