import React, { useState } from 'react'
import { getDeliveryDeadlineInfo } from '../services/orderService'
import { PRODUCTION_STATUSES, STATUS_LOOKUP } from '../constants/production'
import { ColorSwatch } from './ColorSwatch'
import { OrderContextMenu } from './OrderContextMenu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
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
  ChevronDown,
} from 'lucide-react'

export function OrderTableView({
  orders,
  onOpenOrder,
  onEditOrder,
  onStatusChange,
  onDeleteOrder,
}) {
  const [copiedId, setCopiedId] = useState(null)

  const handleCopyId = (e, id) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = (e, o) => {
    e.stopPropagation()
    if (
      window.confirm(
        `Permanently delete order #${o.id.slice(0, 8)} ("${o.item}") from production queue?`
      )
    ) {
      onDeleteOrder?.(o)
    }
  }

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

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const formatShortId = (id) => (id ? `#${id.slice(0, 8)}` : '—')

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-[#0e1422] shadow-xl">
      <TooltipProvider>
        <Table aria-label="Production queue orders">
          <TableHeader>
            <TableRow className="border-b border-slate-800 bg-[#090d16] text-[11px] uppercase tracking-wider text-slate-400">
              <TableHead className="py-3 pl-4 pr-3 text-slate-400">Order ID</TableHead>
              <TableHead className="px-3 py-3 text-slate-400">Customer</TableHead>
              <TableHead className="px-3 py-3 text-slate-400">Item &amp; Pricing</TableHead>
              <TableHead className="px-3 py-3 text-slate-400">Priority</TableHead>
              <TableHead className="px-3 py-3 text-slate-400">Delivery Deadline</TableHead>
              <TableHead className="px-3 py-3 text-slate-400">Colours &amp; Finish</TableHead>
              <TableHead className="px-3 py-3 text-slate-400">Status</TableHead>
              <TableHead className="py-3 pl-3 pr-4 text-right text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => {
              const deadline = getDeliveryDeadlineInfo(o)
              const statusMeta =
                STATUS_LOOKUP[o.production_status] || STATUS_LOOKUP.order_received
              const colors = o.colors || []
              const isExpress = o.priority === 'express'
              const isCopied = copiedId === o.id

              return (
                <OrderContextMenu
                  key={o.id}
                  order={o}
                  onOpenOrder={onOpenOrder}
                  onEditOrder={onEditOrder}
                  onDeleteOrder={onDeleteOrder}
                >
                  <TableRow
                    onClick={() => onOpenOrder(o)}
                    className={`group cursor-pointer transition-colors hover:bg-slate-800/40 ${
                      isExpress ? 'bg-[#ff5e1e]/[0.02]' : ''
                    }`}
                  >
                  {/* Order ID */}
                  <TableCell className="py-3 pl-4 pr-3 font-mono">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(e, o.id)}
                          className="rounded bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-cyan hover:bg-slate-800 transition-colors"
                        >
                          {isCopied ? '✓ Copied' : formatShortId(o.id)}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Click to copy ID ({o.id})</TooltipContent>
                    </Tooltip>
                    <span className="block text-[10px] text-slate-500 mt-0.5">
                      {new Date(o.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </TableCell>

                  {/* Customer */}
                  <TableCell className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => onOpenOrder(o)}
                        >
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                            {getInitials(o.customer)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate max-w-[120px] hover:text-cyan transition-colors">
                              {o.customer}
                            </div>
                            {o.customer_contact && (
                              <div className="text-[10.5px] text-slate-500 truncate max-w-[120px]">
                                {o.customer_contact}
                              </div>
                            )}
                          </div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-60 text-xs space-y-1.5" align="start">
                        <div className="font-semibold text-white">{o.customer}</div>
                        <Separator />
                        <div className="text-slate-400 text-[11px] space-y-0.5">
                          {o.customer_contact && (
                            <div>Contact: <span className="text-slate-200">{o.customer_contact}</span></div>
                          )}
                          <div>Item: <span className="text-cyan">{o.item}</span></div>
                          <div>Status: <span className="text-slate-200">{statusMeta.label}</span></div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </TableCell>

                  {/* Item & Pricing */}
                  <TableCell className="px-3 py-3">
                    <div className="font-medium text-white line-clamp-1 max-w-[200px]">
                      {o.item}{' '}
                      {o.qty > 1 && (
                        <span className="rounded bg-slate-800 px-1 py-0.2 text-[10px] font-mono text-cyan">
                          ×{o.qty}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 font-mono text-[11px]">
                      <span className="text-[#05d5b3] font-bold">
                        {Number(o.price || 0) > 0
                          ? `₹${Number(o.price).toLocaleString('en-IN')}`
                          : 'Pending'}
                      </span>
                      {o.weight_g != null && Number(o.weight_g) > 0 && (
                        <span className="text-slate-400">
                          🧵 {Math.round(Number(o.weight_g) * 1.1 * 10) / 10}g
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Priority */}
                  <TableCell className="px-3 py-3 whitespace-nowrap">
                    {isExpress ? (
                      <Badge variant="express" className="py-0 px-2 text-[10.5px]">
                        <Sparkles className="mr-1 h-3 w-3" /> Express
                      </Badge>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Standard</span>
                    )}
                  </TableCell>

                  {/* Deadline */}
                  <TableCell className="px-3 py-3 whitespace-nowrap">
                    {o.delivery_date ? (
                      <div>
                        <span
                          className={`clean-deadline-tag ${deadline.badgeClass} text-[10px]`}
                        >
                          {deadline.badgeText}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {new Date(o.delivery_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-600 italic">None set</span>
                    )}
                  </TableCell>

                  {/* Paint Colours & Finish */}
                  <TableCell className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
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
                        <span className="text-[11px] text-slate-500 italic">Primer</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Status Dropdown / Badge */}
                  <TableCell className="px-3 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/80 px-2.5 py-1 text-[11px] font-medium text-white transition-all hover:border-slate-600"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: statusMeta.color }}
                          />
                          <span>{statusMeta.label}</span>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
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
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>

                  {/* Actions using ButtonGroup and Tooltip */}
                  <TableCell className="py-3 pl-3 pr-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <ButtonGroup className="justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-7 text-cyan hover:bg-slate-800"
                            onClick={() => onOpenOrder(o)}
                            aria-label="Inspect details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Inspect details</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-7 text-slate-300 hover:bg-slate-800"
                            onClick={() => onEditOrder(o)}
                            aria-label="Edit order"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit order</TooltipContent>
                      </Tooltip>

                      {onDeleteOrder && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-7 text-destructive hover:bg-destructive/15"
                              onClick={(e) => handleDelete(e, o)}
                              aria-label="Delete order"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete order</TooltipContent>
                        </Tooltip>
                      )}
                    </ButtonGroup>
                  </TableCell>
                  </TableRow>
                </OrderContextMenu>
              )
            })}
          </TableBody>
        </Table>
      </TooltipProvider>
    </div>
  )
}
