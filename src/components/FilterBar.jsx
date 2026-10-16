import { PRODUCTION_STATUSES, SORT_OPTIONS } from '../constants/production'

export function FilterBar({
  viewMode,
  onViewModeChange,
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  filteredCount,
}) {
  const isFiltered =
    Boolean(filters.query?.trim()) ||
    filters.priority !== 'all' ||
    filters.status !== 'all' ||
    filters.timeframe !== 'all' ||
    Boolean(filters.customer?.trim()) ||
    Boolean(filters.colour?.trim())

  const quickChips = [
    { label: 'All', active: !isFiltered, apply: () => onResetFilters() },
    {
      label: 'Active Only',
      active: filters.status === 'active' && filters.priority === 'all' && filters.timeframe === 'all',
      apply: () => onFilterChange({ status: 'active', priority: 'all', timeframe: 'all' }),
    },
    {
      label: '⚡ Express',
      active: filters.priority === 'express',
      apply: () => onFilterChange({ priority: 'express' }),
    },
    {
      label: '⚠️ Overdue',
      active: filters.timeframe === 'overdue',
      apply: () => onFilterChange({ timeframe: 'overdue' }),
    },
    {
      label: '📅 Due Today',
      active: filters.timeframe === 'due_today',
      apply: () => onFilterChange({ timeframe: 'due_today' }),
    },
    {
      label: '⏳ Next 3 Days',
      active: filters.timeframe === 'due_in_3_days',
      apply: () => onFilterChange({ timeframe: 'due_in_3_days' }),
    },
    {
      label: 'Painting',
      active: filters.status === 'painting_in_progress',
      apply: () => onFilterChange({ status: 'painting_in_progress' }),
    },
    {
      label: 'Ready for Delivery',
      active: filters.status === 'ready_for_delivery',
      apply: () => onFilterChange({ status: 'ready_for_delivery' }),
    },
  ]

  return (
    <div className="toolbar" aria-label="Order filters and view options">
      {/* Primary Toolbar Row */}
      <div className="toolbar-main">
        {/* Search input */}
        <div className="toolbar-search">
          <svg className="search-svg" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={filters.query || ''}
            onChange={(e) => onFilterChange({ query: e.target.value })}
            placeholder="Search by Order ID, customer, item, color name, or HEX code..."
            aria-label="Search orders"
          />
          {filters.query && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => onFilterChange({ query: '' })}
              aria-label="Clear search text"
            >
              ✕
            </button>
          )}
        </div>

        {/* View Switcher Tabs */}
        <div className="toolbar-views" role="tablist" aria-label="Queue view mode">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'table'}
            className={`tview-btn ${viewMode === 'table' ? 'tview-active' : ''}`}
            onClick={() => onViewModeChange('table')}
            title="Compact Table View"
          >
            <span aria-hidden="true">⊞</span> Table
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'card'}
            className={`tview-btn ${viewMode === 'card' ? 'tview-active' : ''}`}
            onClick={() => onViewModeChange('card')}
            title="Card Grid View"
          >
            <span aria-hidden="true">▦</span> Cards
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'kanban'}
            className={`tview-btn ${viewMode === 'kanban' ? 'tview-active' : ''}`}
            onClick={() => onViewModeChange('kanban')}
            title="Kanban Production Board"
          >
            <span aria-hidden="true">▥</span> Production Board
          </button>
        </div>
      </div>

      {/* Quick Filter Chips & Detailed Selectors */}
      <div className="toolbar-secondary">
        <div className="quick-chips-scroll" role="toolbar" aria-label="Quick filters">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              className={`qchip ${chip.active ? 'qchip-active' : ''}`}
              onClick={chip.apply}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="toolbar-dropdowns">
          {/* Status selector */}
          <div className="select-pill">
            <span className="select-icon">🏷️</span>
            <select
              value={filters.status || 'all'}
              onChange={(e) => onFilterChange({ status: e.target.value })}
              aria-label="Filter by production status"
            >
              <option value="all">Status: All</option>
              <option value="active">Status: Active Queue</option>
              {PRODUCTION_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  Status: {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort selector */}
          <div className="select-pill">
            <span className="select-icon">⇅</span>
            <select
              value={filters.sort || 'priority'}
              onChange={(e) => onFilterChange({ sort: e.target.value })}
              aria-label="Sort queue by"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters CTA */}
          {isFiltered && (
            <button
              type="button"
              className="toolbar-reset-btn"
              onClick={onResetFilters}
              title="Reset all active filters"
            >
              Reset Filters ✕
            </button>
          )}

          <div className="toolbar-count">
            <strong>{filteredCount}</strong> of {totalCount} orders
          </div>
        </div>
      </div>
    </div>
  )
}
