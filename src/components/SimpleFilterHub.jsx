import React, { useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Badge } from '@/components/ui/badge'
import { InputGroup, InputLeftElement, InputRightElement } from '@/components/ui/input-group'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Toggle } from '@/components/ui/toggle'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Search,
  X,
  AlertTriangle,
  Zap,
  Clock,
  Table as TableIcon,
  LayoutGrid,
  Kanban,
  RotateCcw,
} from 'lucide-react'

/**
 * Enhanced Control Center & Operational Filter Hub
 * Built with shadcn components and responsive mobile design.
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
    <div
      className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#0d131f] p-3 sm:p-4 shadow-lg"
      role="search"
      aria-label="Studio order control center"
    >
      {/* Top Row: Omni Search + Urgent Action Chips + View Switcher */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search Bar with InputGroup */}
        <div className="flex-1">
          <InputGroup>
            <InputLeftElement>
              <Search className="h-4 w-4 text-slate-400" />
            </InputLeftElement>
            <Input
              ref={searchInputRef}
              type="text"
              value={filters.query}
              onChange={handleQueryChange}
              placeholder="Search orders by item, customer, phone, color... (Press /)"
              className="pl-9 pr-8 h-9 border-slate-700/80 bg-[#121929] text-xs text-white placeholder:text-slate-500 focus-visible:ring-primary"
              aria-label="Search orders"
            />
            {filters.query && (
              <InputRightElement>
                <button
                  type="button"
                  onClick={() => onFilterChange({ query: '' })}
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              </InputRightElement>
            )}
          </InputGroup>
        </div>

        {/* Chips and View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <TooltipProvider>
            {/* Overdue Alert Chip */}
            {stats?.overdue > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={filters.timeframe === 'overdue'}
                    onPressedChange={toggleOverdue}
                    size="sm"
                    className={`gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                      filters.timeframe === 'overdue'
                        ? 'border-destructive bg-destructive/25 text-white ring-1 ring-destructive/40'
                        : 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 animate-pulse text-destructive" />
                    <span>{stats.overdue} Overdue</span>
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Filter orders past deadline</TooltipContent>
              </Tooltip>
            )}

            {/* Express Queue Chip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  pressed={filters.priority === 'express'}
                  onPressedChange={togglePriority}
                  size="sm"
                  className={`gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                    filters.priority === 'express'
                      ? 'border-[#ff5e1e] bg-[#ff5e1e]/25 text-white ring-1 ring-[#ff5e1e]/40'
                      : 'border-[#ff5e1e]/40 bg-[#ff5e1e]/10 text-[#ff783b] hover:bg-[#ff5e1e]/20'
                  }`}
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Express ({stats?.express || 0})</span>
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>Filter by Express high-priority queue</TooltipContent>
            </Tooltip>

            {/* Due Soon Chip */}
            {stats?.dueWithin3Days > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={filters.timeframe === 'due_in_3_days'}
                    onPressedChange={toggleDueSoon}
                    size="sm"
                    className={`gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                      filters.timeframe === 'due_in_3_days'
                        ? 'border-amber bg-amber/25 text-white ring-1 ring-amber/40'
                        : 'border-amber/40 bg-amber/10 text-amber hover:bg-amber/20'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Next 3 Days ({stats.dueWithin3Days})</span>
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>Orders due within 3 days</TooltipContent>
              </Tooltip>
            )}

            {/* View Mode Segmented Control using ToggleGroup */}
            <div className="rounded-lg border border-slate-700/80 bg-[#121929] p-0.5">
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(val) => {
                  if (val) {
                    onViewModeChange(val)
                    if (val === 'kanban' && filters.status !== 'all') {
                      onFilterChange({ status: 'all' })
                    }
                  }
                }}
                className="gap-0.5"
              >
                <ToggleGroupItem
                  value="kanban"
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-slate-400 hover:text-white"
                  title="Kanban Board View"
                >
                  <Kanban className="h-3.5 w-3.5" />
                  <span>Board</span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="card"
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-slate-400 hover:text-white"
                  title="Card Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Cards</span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="table"
                  size="sm"
                  className="h-7 px-2.5 text-xs gap-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-slate-400 hover:text-white"
                  title="Dense Table View"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Table</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </TooltipProvider>
        </div>
      </div>

      <Separator className="bg-slate-800/80 my-0.5" />

      {/* Bottom Row: Pipeline Status Stepper Tabs with live count tags */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
        <nav
          className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none"
          aria-label="Production pipeline filter tabs"
        >
          <button
            type="button"
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              filters.status === 'all'
                ? 'bg-[#1e293b] text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
            onClick={() => handleStatusTab('all')}
          >
            <span>All Active</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {stats?.totalActive ?? totalCount}
            </span>
          </button>

          <button
            type="button"
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              filters.status === 'order_received'
                ? 'bg-[#1e293b] text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
            onClick={() => handleStatusTab('order_received')}
          >
            <span>Awaiting Print</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {stats?.awaitingPrint || 0}
            </span>
          </button>

          <button
            type="button"
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              filters.status === 'painting_in_progress'
                ? 'bg-[#1e293b] text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
            onClick={() => handleStatusTab('painting_in_progress')}
          >
            <span>Painting</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {stats?.paintingInProgress || 0}
            </span>
          </button>

          <button
            type="button"
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              filters.status === 'ready_for_delivery'
                ? 'bg-[#1e293b] text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
            onClick={() => handleStatusTab('ready_for_delivery')}
          >
            <span>Ready for Delivery</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {stats?.readyForDelivery || 0}
            </span>
          </button>

          <button
            type="button"
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              filters.status === 'delivered_completed'
                ? 'bg-[#1e293b] text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
            onClick={() => handleStatusTab('delivered_completed')}
          >
            <span>Completed</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {stats?.completed || 0}
            </span>
          </button>
        </nav>

        {/* Telemetry info and Clear Filters button */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
          {filamentMetrics && (
            <span
              title={`Net filament: ${filamentMetrics.netGrams}g + 10% misc overhead (${filamentMetrics.miscGrams}g)`}
              className="font-mono text-[11px] font-semibold text-[#ff783b]"
            >
              🧵 {filamentMetrics.totalGrams}g <span className="opacity-60 text-[10px]">(+10%)</span>
            </span>
          )}

          {isFiltered && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={onResetFilters}
                    className="h-7 text-xs text-slate-400 hover:text-white"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" /> Clear
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset all active filters and search</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <span className="text-slate-400 text-[11px]">
            Showing <strong className="text-white">{filteredCount}</strong> of {totalCount}
          </span>
        </div>
      </div>
    </div>
  )
}
