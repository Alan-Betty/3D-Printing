import React, { useState } from 'react'
import { PRODUCTION_STATUSES, STATUS_LOOKUP } from '../constants/production'
import { getDeliveryDeadlineInfo } from '../services/orderService'
import { ColorSwatch } from './ColorSwatch'
import { OrderContextMenu } from './OrderContextMenu'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  MoreVertical,
  MoveRight,
  ArrowRightCircle,
  Eye,
  Pencil,
  Trash2,
  Clock,
  Sparkles,
  AlertTriangle,
  Layers,
  ChevronDown,
} from 'lucide-react'

export function OrderKanbanView({
  orders,
  onOpenOrder,
  onEditOrder,
  onStatusChange,
  onDeleteOrder,
}) {
  const [draggedOrderId, setDraggedOrderId] = useState(null)
  const [activeDropColumn, setActiveDropColumn] = useState(null)
  const [selectedMobileColumn, setSelectedMobileColumn] = useState('all')

  const handleDragStart = (e, orderId) => {
    e.dataTransfer.setData('text/plain', orderId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedOrderId(orderId)
  }

  const handleDragEnd = () => {
    setDraggedOrderId(null)
    setActiveDropColumn(null)
  }

  const handleDragOver = (e, colId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (activeDropColumn !== colId) {
      setActiveDropColumn(colId)
    }
  }

  const handleDragLeave = (e, colId) => {
    if (activeDropColumn === colId) {
      setActiveDropColumn(null)
    }
  }

  const handleDrop = (e, targetStatusId) => {
    e.preventDefault()
    setActiveDropColumn(null)
    const orderId = e.dataTransfer.getData('text/plain') || draggedOrderId
    setDraggedOrderId(null)
    if (!orderId) return

    const targetOrder = orders.find((o) => o.id === orderId)
    if (targetOrder && targetOrder.production_status !== targetStatusId) {
      onStatusChange(targetOrder, targetStatusId)
    }
  }

  const formatShortId = (id) => (id ? `#${id.slice(0, 8)}` : '—')

  // Filter columns if mobile column tab is active
  const displayedColumns =
    selectedMobileColumn === 'all'
      ? PRODUCTION_STATUSES
      : PRODUCTION_STATUSES.filter((c) => c.id === selectedMobileColumn)

  return (
    <div className="w-full space-y-4">
      {/* Mobile Column Quick Switcher Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:hidden scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedMobileColumn('all')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            selectedMobileColumn === 'all'
              ? 'bg-[#1e293b] text-white shadow'
              : 'bg-[#0f172a] text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>All Columns</span>
          <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
            {orders.length}
          </span>
        </button>
        {PRODUCTION_STATUSES.map((col) => {
          const count = orders.filter((o) => o.production_status === col.id).length
          const isActive = selectedMobileColumn === col.id
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setSelectedMobileColumn(col.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#1e293b] text-white shadow'
                  : 'bg-[#0f172a] text-slate-400 hover:text-slate-200'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: col.color }}
              />
              <span>{col.label}</span>
              <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Kanban Columns Grid / Board */}
      <div
        className="kanban-full-width grid min-w-0 grid-cols-1 gap-3 pb-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        role="region"
        aria-label="Production stages kanban board"
      >
        {displayedColumns.map((col) => {
          const colOrders = orders.filter((o) => o.production_status === col.id)
          const colTotalValue = colOrders.reduce(
            (sum, o) => sum + (Number(o.price) || 0),
            0
          )
          const isOver = activeDropColumn === col.id

          return (
            <div
              key={col.id}
              className={`flex min-w-0 flex-col rounded-xl border bg-[#0d131f]/95 p-3 transition-all duration-200 ${
                isOver
                  ? 'border-primary ring-2 ring-primary/40 bg-[#141d2f]'
                  : 'border-slate-800/80'
              }`}
              style={{
                borderTopColor: col.color,
                borderTopWidth: '3px',
              }}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="mb-3 flex flex-col gap-1 border-b border-slate-800/60 pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shadow-sm"
                      style={{
                        backgroundColor: col.color,
                        boxShadow: `0 0 8px ${col.color}88`,
                      }}
                    />
                    <h4 className="text-sm font-semibold tracking-wide text-white">
                      {col.label}
                    </h4>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-slate-700/80 bg-slate-800/80 px-2 py-0 text-xs font-mono font-bold text-slate-200"
                  >
                    {colOrders.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate pr-1">{col.desc}</span>
                  {colTotalValue > 0 && (
                    <span className="shrink-0 font-mono font-semibold text-[#05d5b3]">
                      ₹{colTotalValue.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Column Body / Draggable Cards Container */}
              <div className="flex flex-1 flex-col gap-3 min-h-[160px]">
                {colOrders.length === 0 ? (
                  <div
                    className={`flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center text-xs transition-colors ${
                      isOver
                        ? 'border-primary text-primary bg-primary/5'
                        : 'border-slate-800/80 text-slate-500'
                    }`}
                  >
                    <Layers className="mb-2 h-6 w-6 opacity-40" />
                    <span>Drop orders here</span>
                    <span className="text-[10px] text-slate-600 mt-0.5">
                      Move to {col.label}
                    </span>
                  </div>
                ) : (
                  colOrders.map((o) => {
                    const deadline = getDeliveryDeadlineInfo(o)
                    const isExpress = o.priority === 'express'
                    const colors = o.colors || []
                    const currentIdx = PRODUCTION_STATUSES.findIndex(
                      (s) => s.id === o.production_status
                    )
                    const nextStatus =
                      currentIdx < PRODUCTION_STATUSES.length - 1 &&
                      PRODUCTION_STATUSES[currentIdx + 1].step >= 0
                        ? PRODUCTION_STATUSES[currentIdx + 1]
                        : null

                    const isBeingDragged = draggedOrderId === o.id

                    return (
                      <OrderContextMenu
                        key={o.id}
                        order={o}
                        onOpenOrder={onOpenOrder}
                        onEditOrder={onEditOrder}
                        onDeleteOrder={onDeleteOrder}
                      >
                        <Card
                          draggable
                          onDragStart={(e) => handleDragStart(e, o.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onOpenOrder(o)}
                          className={`group relative cursor-grab border bg-[#111726] p-3 shadow-md transition-all hover:border-slate-700 hover:bg-[#141b2c] hover:shadow-lg active:cursor-grabbing ${
                            isBeingDragged ? 'opacity-40 scale-[0.98]' : 'opacity-100'
                          } ${
                            isExpress
                              ? 'border-l-4 border-l-[#ff5e1e]'
                              : 'border-slate-800'
                          }`}
                        >
                        {/* Top ID & Priority Row */}
                        <div className="mb-2 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard?.writeText(o.id)
                            }}
                            title="Click to copy order ID"
                            className="rounded bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10.5px] text-cyan hover:bg-slate-800"
                          >
                            {formatShortId(o.id)}
                          </button>

                          <div className="flex items-center gap-1.5">
                            {isExpress ? (
                              <Badge variant="express" className="gap-1 py-0 px-2 text-[10.5px]">
                                <Sparkles className="h-3 w-3" /> Express
                              </Badge>
                            ) : (
                              <span className="text-[10.5px] text-slate-400">
                                Standard
                              </span>
                            )}

                            {/* Dropdown Menu for Move & Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-6 w-6 rounded flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white"
                                  title="Order Actions"
                                  aria-label="Order actions"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onOpenOrder(o)}>
                                  <Eye className="mr-2 h-3.5 w-3.5 text-cyan" /> Inspect Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEditOrder(o)}>
                                  <Pencil className="mr-2 h-3.5 w-3.5 text-slate-300" /> Edit Order
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />
                                <DropdownMenuLabel>Move to list</DropdownMenuLabel>
                                {PRODUCTION_STATUSES.map((status) => (
                                  <DropdownMenuItem
                                    key={status.id}
                                    disabled={o.production_status === status.id}
                                    onClick={() => onStatusChange(o, status.id)}
                                    className="flex items-center gap-2"
                                  >
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: status.color }}
                                    />
                                    <span>{status.label}</span>
                                    {o.production_status === status.id && (
                                      <span className="ml-auto text-[10px] text-slate-400">(current)</span>
                                    )}
                                  </DropdownMenuItem>
                                ))}

                                {onDeleteOrder && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (
                                          window.confirm(
                                            `Permanently delete order #${o.id.slice(
                                              0,
                                              8
                                            )} ("${o.item}")?`
                                          )
                                        ) {
                                          onDeleteOrder(o)
                                        }
                                      }}
                                      className="text-destructive hover:bg-destructive/15 focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Order
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Item Title & Customer */}
                        <div className="mb-2">
                          <h5 className="font-semibold text-sm leading-snug text-white line-clamp-2">
                            {o.item}{' '}
                            {o.qty > 1 && (
                              <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[11px] font-mono text-cyan">
                                ×{o.qty}
                              </span>
                            )}
                          </h5>
                          <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                            <span className="truncate">👤 {o.customer}</span>
                            {o.customer_contact && (
                              <span className="text-[11px] text-slate-500 truncate max-w-[100px]">
                                {o.customer_contact}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price & Filament Weight Strip */}
                        <div className="mb-2.5 flex items-center justify-between rounded-md bg-[#0a0f18] px-2.5 py-1.5 text-xs">
                          <span className="font-mono font-bold text-[#05d5b3]">
                            {Number(o.price || 0) > 0
                              ? `₹${Number(o.price).toLocaleString('en-IN')}`
                              : 'Quote Pending'}
                          </span>
                          {o.weight_g != null && Number(o.weight_g) > 0 ? (
                            <span
                              className="font-mono text-[11px] text-[#ff783b]"
                              title={`+10% misc overhead: ${
                                Math.round(Number(o.weight_g) * 1.1 * 10) / 10
                              }g`}
                            >
                              🧵 {Math.round(Number(o.weight_g) * 1.1 * 10) / 10}g
                            </span>
                          ) : (
                            <span className="text-[11px] italic text-slate-500">
                              Weight TBD
                            </span>
                          )}
                        </div>

                        {/* Colors & Delivery Deadline */}
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex gap-1 overflow-hidden">
                            {colors.length > 0 ? (
                              colors.slice(0, 2).map((c, i) => (
                                <ColorSwatch key={i} name={c.name} code={c.code} compact />
                              ))
                            ) : o.primary_color || o.primary_color_code ? (
                              <ColorSwatch
                                name={o.primary_color}
                                code={o.primary_color_code}
                                compact
                              />
                            ) : (
                              <span className="text-[10.5px] italic text-slate-500">
                                Primer Only
                              </span>
                            )}
                          </div>

                          {o.delivery_date && (
                            <span
                              className={`clean-deadline-tag ${deadline.badgeClass} text-[10px] py-0.5 px-1.5`}
                            >
                              {deadline.badgeText}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons Footer */}
                        <div
                          className="flex items-center justify-between border-t border-slate-800/80 pt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Move to another list Dropdown button */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-6 gap-1 border-slate-700 bg-slate-800/60 text-[11px] text-slate-300 hover:bg-slate-700"
                              >
                                <span>Move</span>
                                <ChevronDown className="h-3 w-3 opacity-60" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuLabel>Move order to...</DropdownMenuLabel>
                              {PRODUCTION_STATUSES.map((status) => (
                                <DropdownMenuItem
                                  key={status.id}
                                  disabled={o.production_status === status.id}
                                  onClick={() => onStatusChange(o, status.id)}
                                  className="flex items-center gap-2"
                                >
                                  <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: status.color }}
                                  />
                                  <span>{status.label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Quick Advance button */}
                          {nextStatus ? (
                            <Button
                              variant="default"
                              size="xs"
                              className="h-6 gap-1 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-[11px]"
                              onClick={() => onStatusChange(o, nextStatus.id)}
                              title={`Advance to ${nextStatus.label}`}
                            >
                              <span>→ {nextStatus.label}</span>
                            </Button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald">
                              ✓ Completed
                            </span>
                          )}
                        </div>
                        </Card>
                      </OrderContextMenu>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
