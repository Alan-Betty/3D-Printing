import { useRef, useEffect } from 'react'

/**
 * Enhanced Control Center & Operational Filter Hub
 * Provides quick omni-search with keyboard shortcut ('/'),
 * urgent action chips (Overdue, Express, Due Soon),
 * tactile view mode switcher, and interactive pipeline stage tabs.
 */
export function SimpleFilterHub({
  viewMode,
  onViewModeChange,
  filters,
  onFilterChange,
  onResetFilters,
  stats,
  filamentMetrics,
  totalCount,
  filteredCount,
}) {
  const searchInputRef = useRef(null)

  const isFiltered =
    Boolean(filters.query) ||
    filters.priority !== 'all' ||
    filters.status !== 'all' ||
    filters.timeframe !== 'all' ||
    Boolean(filters.colour)

  // Global hotkey: press '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleQueryChange = (e) => {
    onFilterChange({ query: e.target.value })
  }

  const togglePriority = () => {
    onFilterChange({
      priority: filters.priority === 'express' ? 'all' : 'express',
    })
  }

  const toggleOverdue = () => {
    onFilterChange({
      timeframe: filters.timeframe === 'overdue' ? 'all' : 'overdue',
    })
  }

  const toggleDueSoon = () => {
    onFilterChange({
      timeframe: filters.timeframe === 'due_in_3_days' ? 'all' : 'due_in_3_days',
    })
  }

  const handleStatusTab = (statusId) => {
    onFilterChange({
      status: filters.status === statusId ? 'all' : statusId,
    })
  }

  return (
    <div className="simple-hub" role="search" aria-label="Studio order control center">
      {/* Top Row: Omni Search + Urgent Action Chips + View Switcher */}
      <div className="hub-top-row">
        <div className="hub-search-wrap">
          <span className="hub-search-icon" aria-hidden="true">🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            className="hub-search-input"
            value={filters.query}
            onChange={handleQueryChange}
            placeholder="Search orders by item, customer, phone, or color... (Press /)"
            aria-label="Search orders"
          />
          {filters.query && (
            <button
              type="button"
              className="hub-clear-search-btn"
              onClick={() => onFilterChange({ query: '' })}
              aria-label="Clear search"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="hub-quick-actions">
          {/* Overdue Alert Chip */}
          {stats?.overdue > 0 && (
            <button
              type="button"
              className={`hub-chip urgent-overdue pulse ${filters.timeframe === 'overdue' ? 'active' : ''}`}
              onClick={toggleOverdue}
              title="Show overdue orders requiring immediate attention"
            >
              <span>⚠️</span>
              <span>{stats.overdue} Overdue</span>
            </button>
          )}

          {/* Express Queue Chip */}
          <button
            type="button"
            className={`hub-chip express-chip ${filters.priority === 'express' ? 'active' : ''}`}
            onClick={togglePriority}
            title="Filter by Express queue"
          >
            <span>⚡ Express ({stats?.express || 0})</span>
          </button>

          {/* Due Soon Chip */}
          {stats?.dueWithin3Days > 0 && (
            <button
              type="button"
              className={`hub-chip ${filters.timeframe === 'due_in_3_days' ? 'active' : ''}`}
              onClick={toggleDueSoon}
              title="Filter orders due within next 3 days"
            >
              <span>⏳ Next 3 Days ({stats.dueWithin3Days})</span>
            </button>
          )}

          {/* View Mode Segmented Control */}
          <div className="hub-view-switcher" role="radiogroup" aria-label="Display view mode">
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'table'}
              className={`hub-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => onViewModeChange('table')}
              title="Dense Data Grid View"
            >
              <span>▦</span> Table
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'card'}
              className={`hub-view-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => onViewModeChange('card')}
              title="Visual Card Grid View"
            >
              <span>🪟</span> Cards
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={viewMode === 'kanban'}
              className={`hub-view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => {
                onViewModeChange('kanban')
                if (filters.status !== 'all') {
                  onFilterChange({ status: 'all' })
                }
              }}
              title="Production Kanban Board"
            >
              <span>📋</span> Board
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Pipeline Status Stepper Tabs with live count tags */}
      <div className="hub-bottom-row">
        <nav className="hub-pipeline-tabs" aria-label="Production pipeline filter tabs">
          <button
            type="button"
            className={`hub-tab ${filters.status === 'all' ? 'active' : ''}`}
            onClick={() => handleStatusTab('all')}
          >
            All Active <span className="hub-tab-count">{stats?.totalActive ?? totalCount}</span>
          </button>

          <button
            type="button"
            className={`hub-tab ${filters.status === 'order_received' ? 'active' : ''}`}
            onClick={() => handleStatusTab('order_received')}
          >
            Awaiting Print <span className="hub-tab-count">{stats?.awaitingPrint || 0}</span>
          </button>

          <button
            type="button"
            className={`hub-tab ${filters.status === 'painting_in_progress' ? 'active' : ''}`}
            onClick={() => handleStatusTab('painting_in_progress')}
          >
            Painting <span className="hub-tab-count">{stats?.paintingInProgress || 0}</span>
          </button>

          <button
            type="button"
            className={`hub-tab ${filters.status === 'ready_for_delivery' ? 'active' : ''}`}
            onClick={() => handleStatusTab('ready_for_delivery')}
          >
            Ready for Delivery <span className="hub-tab-count">{stats?.readyForDelivery || 0}</span>
          </button>

          <button
            type="button"
            className={`hub-tab ${filters.status === 'delivered_completed' ? 'active' : ''}`}
            onClick={() => handleStatusTab('delivered_completed')}
          >
            Completed <span className="hub-tab-count">{stats?.completed || 0}</span>
          </button>
        </nav>

        {/* Status Meta Info / Clear Filters */}
        <div className="hub-meta-info">
          {filamentMetrics && (
            <span
              title={`Net filament: ${filamentMetrics.netGrams}g + 10% misc overhead (${filamentMetrics.miscGrams}g) across ${filamentMetrics.printCountWithWeight} weighted prints`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}
            >
              <span>🧵</span> {filamentMetrics.totalGrams}g <span style={{ opacity: 0.65, fontSize: '11px' }}>(+10%)</span>
            </span>
          )}

          {isFiltered && (
            <button
              type="button"
              className="hub-reset-btn"
              onClick={onResetFilters}
              title="Reset all active filters"
            >
              ✕ Clear Filters
            </button>
          )}

          <span style={{ fontSize: '12px' }}>
            Showing <strong style={{ color: 'var(--text-bright)' }}>{filteredCount}</strong> of {totalCount}
          </span>
        </div>
      </div>
    </div>
  )
}
