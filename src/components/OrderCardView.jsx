import React from 'react'
import { getDeliveryDeadlineInfo } from '../services/orderService'
import { STATUS_LOOKUP, WORKFLOW_STAGES, PRODUCTION_STATUSES } from '../constants/production'
import { ColorSwatch } from './ColorSwatch'
import { OrderContextMenu } from './OrderContextMenu'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
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
  Eye,
  Pencil,
  Trash2,
  Sparkles,
  MoveRight,
  ChevronDown,
} from 'lucide-react'

export function OrderCardView({
  orders,
  onOpenOrder,
  onEditOrder,
  onStatusChange,
  onDeleteOrder,
}) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0d131f] p-12 text-center">
        <div className="mb-3 text-4xl">🔍</div>
        <h3 className="mb-1 text-lg font-semibold text-white">No orders match your criteria</h3>
        <p className="text-sm text-slate-400">
          Try clearing your active search query, timeframe, or priority filters.
        </p>
      </div>
    )
  }

  const formatShortId = (id) => (id ? `#${id.slice(0, 8)}` : '—')

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-label="Order cards view"
    >
      {orders.map((o) => {
        const deadline = getDeliveryDeadlineInfo(o)
        const statusMeta = STATUS_LOOKUP[o.production_status] || STATUS_LOOKUP.order_received
        const colors = o.colors || []
        const isExpress = o.priority === 'express'

        // Determine next workflow stage if applicable
        const currentStep = statusMeta.step
        const nextStage =
          currentStep >= 0 && currentStep < WORKFLOW_STAGES.length - 1
            ? WORKFLOW_STAGES[currentStep + 1]
            : null

        // Mini-stepper percentage
        const pct = Math.max(
          15,
          Math.min(
            100,
            Math.round(
              ((Math.max(0, currentStep) + 1) / WORKFLOW_STAGES.length) * 100
            )
          )
        )

        return (
          <OrderContextMenu
            key={o.id}
            order={o}
            onOpenOrder={onOpenOrder}
            onEditOrder={onEditOrder}
            onDeleteOrder={onDeleteOrder}
          >
            <Card
              onClick={() => onOpenOrder(o)}
              className={`group relative flex flex-col justify-between overflow-hidden border bg-[#111726] shadow-md transition-all hover:border-slate-700 hover:bg-[#141b2c] hover:shadow-xl cursor-pointer ${
                isExpress ? 'border-l-4 border-l-[#ff5e1e]' : 'border-slate-800'
              }`}
            >
            {/* Top Bar: ID, Date, Priority, Actions */}
            <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0a0f19]/60 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard?.writeText(o.id)
                  }}
                  title="Click to copy order ID"
                  className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-cyan hover:bg-slate-800"
                >
                  {formatShortId(o.id)}
                </button>
                <span className="font-mono text-[11px] text-slate-500">
                  {new Date(o.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {isExpress ? (
                  <Badge variant="express" className="gap-1 py-0 px-2 text-[10.5px]">
                    <Sparkles className="h-3 w-3" /> Express
                  </Badge>
                ) : (
                  <span className="text-[10.5px] text-slate-500">Standard</span>
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
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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

            {/* Main Content */}
            <div className="flex-1 p-3.5">
              {/* Item Title & Customer */}
              <div className="mb-3">
                <h4 className="font-semibold text-base text-white line-clamp-2">
                  {o.item}{' '}
                  {o.qty > 1 && (
                    <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[11px] font-mono text-cyan">
                      ×{o.qty}
                    </span>
                  )}
                </h4>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-slate-300">
                    {getInitials(o.customer)}
                  </div>
                  <span className="text-xs font-medium text-slate-300 truncate">
                    {o.customer}
                  </span>
                  {o.customer_contact && (
                    <span className="text-[11px] text-slate-500 truncate">
                      · {o.customer_contact}
                    </span>
                  )}
                </div>
              </div>

              {/* Price & Filament Metrics Strip */}
              <div className="mb-3 flex items-center justify-between rounded-lg bg-[#0a0f19] p-2.5 text-xs">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-500">
                    Price
                  </span>
                  <span className="font-mono text-sm font-bold text-[#05d5b3]">
                    {Number(o.price || 0) > 0
                      ? `₹${Number(o.price).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}`
                      : 'Pending'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">
                    Filament (+10%)
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#ff783b]">
                    {o.weight_g != null && Number(o.weight_g) > 0
                      ? `🧵 ${Math.round(Number(o.weight_g) * 1.1 * 10) / 10}g`
                      : 'Pending'}
                  </span>
                </div>
              </div>

              {/* Swatches & Deadline */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex gap-1 overflow-hidden">
                  {colors.length > 0 ? (
                    colors.slice(0, 3).map((c, i) => (
                      <ColorSwatch
                        key={i}
                        name={c.name}
                        code={c.code}
                        finish={c.finish}
                        role={c.role}
                        compact
                      />
                    ))
                  ) : o.primary_color || o.primary_color_code ? (
                    <ColorSwatch
                      name={o.primary_color}
                      code={o.primary_color_code}
                      finish={o.finish}
                      role="Primary"
                      compact
                    />
                  ) : (
                    <span className="text-xs italic text-slate-500">
                      Standard Primer
                    </span>
                  )}
                </div>

                {o.delivery_date && (
                  <span className={`clean-deadline-tag ${deadline.badgeClass} text-[10px]`}>
                    {deadline.badgeText}
                  </span>
                )}
              </div>

              {/* Mini Stepper */}
              <div className="space-y-1">
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: statusMeta.color || '#ff5e1e',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className="font-semibold flex items-center gap-1"
                    style={{ color: statusMeta.color }}
                  >
                    ● {statusMeta.label}
                  </span>
                  <span className="text-slate-500">
                    {o.delivery_date
                      ? new Date(o.delivery_date).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'No date'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card Footer Actions */}
            <div
              className="flex items-center justify-between border-t border-slate-800/80 bg-[#0a0f19]/40 px-3.5 py-2.5"
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

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-6 text-[11px] text-slate-300 hover:bg-slate-800"
                  onClick={() => onOpenOrder(o)}
                >
                  Inspect
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-6 text-[11px] text-slate-300 hover:bg-slate-800"
                  onClick={() => onEditOrder(o)}
                >
                  Edit
                </Button>
                {nextStage ? (
                  <Button
                    variant="default"
                    size="xs"
                    className="h-6 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-[11px]"
                    onClick={() => onStatusChange(o, nextStage.id)}
                  >
                    <span>Advance →</span>
                  </Button>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald">
                    ✓ Fulfilled
                  </span>
                )}
              </div>
            </div>
            </Card>
          </OrderContextMenu>
        )
      })}
    </div>
  )
}
