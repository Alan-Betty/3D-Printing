import React, { useEffect, useState } from 'react'
import { PRODUCTION_STATUSES, STATUS_LOOKUP } from '../constants/production'
import { getDeliveryDeadlineInfo } from '../services/orderService'
import { fetchOrderHistory } from '../services/historyService'
import { ColorSwatch } from './ColorSwatch'
import { ProgressIndicator } from './ProgressIndicator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from '@/components/ui/item'
import { AttachmentList, AttachmentItem } from '@/components/ui/attachment'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
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
  X,
  Sparkles,
  Calendar,
  Layers,
  ChevronDown,
  Pencil,
  Trash2,
  Clock,
  History,
  FileText,
  Image as ImageIcon,
  Box,
} from 'lucide-react'

export function OrderDetailModal({
  order,
  user,
  onClose,
  onEditOrder,
  onStatusChange,
  onRemoveOrder,
}) {
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'status' | 'history' | 'files'
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(
    order?.production_status || 'order_received'
  )
  const [statusNote, setStatusNote] = useState('')
  const [activePhoto, setActivePhoto] = useState(order?.imageUrls?.[0] || null)

  const deadline = getDeliveryDeadlineInfo(order)
  const statusMeta =
    STATUS_LOOKUP[order.production_status] || STATUS_LOOKUP.order_received
  const isExpress = order.priority === 'express'
  const colors = order.colors || []
  const photos = order.imageUrls || []
  const modelFiles = order.modelFiles || []

  // Load chronological history when opened
  useEffect(() => {
    if (!order?.id) return
    setLoadingHistory(true)
    fetchOrderHistory(order.id)
      .then((entries) => setHistory(entries))
      .catch((err) => console.warn('Could not load history:', err))
      .finally(() => setLoadingHistory(false))
  }, [order?.id, order?.production_status])

  useEffect(() => {
    const handleKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleUpdateStatusSubmit = async (e) => {
    e.preventDefault()
    if (selectedStatus === order.production_status && !statusNote.trim()) return
    await onStatusChange(order, selectedStatus, statusNote.trim())
    setStatusNote('')
  }

  const formatDateTime = (ts) => {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const weightNum = Number(order.weight_g)
  const hasValidWeight =
    order.weight_g != null && !Number.isNaN(weightNum) && weightNum > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in-50"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-3xl flex-col max-h-[92vh] overflow-hidden rounded-xl border border-slate-800 bg-[#0d131f] shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-order-title"
      >
        {/* Header Bar */}
        <div className="flex flex-col gap-2 border-b border-slate-800 bg-[#090d16] p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-cyan font-bold bg-cyan/10 px-2 py-0.5 rounded border border-cyan/20">
                #{order.id.slice(0, 8)}
              </span>
              <span className="text-slate-400">
                Placed: {formatDateTime(order.created_at)}
              </span>
              {isExpress ? (
                <Badge variant="express" className="py-0 px-2 text-[10.5px]">
                  <Sparkles className="mr-1 h-3 w-3" /> Express
                </Badge>
              ) : (
                <Badge variant="muted" className="text-[10.5px]">
                  Standard
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Move to list dropdown in header */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-7 gap-1 border-slate-700 bg-slate-800/80 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: statusMeta.color }}
                    />
                    <span>{statusMeta.label}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Move order to list</DropdownMenuLabel>
                  {PRODUCTION_STATUSES.map((status) => (
                    <DropdownMenuItem
                      key={status.id}
                      disabled={order.production_status === status.id}
                      onClick={() => onStatusChange(order, status.id)}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span>{status.label}</span>
                      {order.production_status === status.id && (
                        <span className="ml-auto text-[10px] text-slate-400">(current)</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                className="rounded-sm p-1 text-slate-400 hover:text-white"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <h2
            id="modal-order-title"
            className="text-lg sm:text-xl font-bold text-white tracking-tight"
          >
            {order.item}{' '}
            {order.qty > 1 && (
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-cyan">
                ×{order.qty}
              </span>
            )}
          </h2>
        </div>

        {/* Modal Navigation Tabs using shadcn Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
          <div className="border-b border-slate-800 bg-[#0b0f19] px-4 overflow-x-auto">
            <TabsList className="bg-transparent h-auto p-0 gap-1">
              <TabsTrigger
                value="overview"
                className="gap-1.5 px-3 py-2.5 text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Overview &amp; Specs</span>
              </TabsTrigger>
              <TabsTrigger
                value="status"
                className="gap-1.5 px-3 py-2.5 text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Production Tracker</span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="gap-1.5 px-3 py-2.5 text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none"
              >
                <History className="h-3.5 w-3.5" />
                <span>Activity Log ({history.length})</span>
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="gap-1.5 px-3 py-2.5 text-xs data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none"
              >
                <Box className="h-3.5 w-3.5" />
                <span>Files &amp; Photos ({photos.length + modelFiles.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Delivery Deadline Alert Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-800 bg-[#111726] p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/80 text-cyan">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      Expected Delivery Target
                    </div>
                    <div className="text-sm font-semibold text-white">
                      {order.delivery_date
                        ? new Date(order.delivery_date).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'No delivery date assigned'}
                    </div>
                  </div>
                </div>

                {order.delivery_date && (
                  <span
                    className={`clean-deadline-tag ${deadline.badgeClass} self-start sm:self-center text-xs py-1 px-2.5`}
                  >
                    {deadline.badgeText}
                  </span>
                )}
              </div>

              {/* Order Information Grid */}
              <div className="rounded-lg border border-slate-800 bg-[#111726] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Order &amp; Customer Specs
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-md bg-[#0a0f19] p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Customer
                    </span>
                    <span className="block text-sm font-semibold text-white mt-0.5 truncate">
                      {order.customer}
                    </span>
                  </div>

                  <div className="rounded-md bg-[#0a0f19] p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Contact
                    </span>
                    <span className="block text-xs text-slate-300 mt-0.5 truncate">
                      {order.customer_contact || 'None provided'}
                    </span>
                  </div>

                  <div className="rounded-md bg-[#0a0f19] p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Quantity
                    </span>
                    <span className="block text-sm font-semibold text-white mt-0.5">
                      {order.qty || 1} pcs
                    </span>
                  </div>

                  <div className="rounded-md bg-[#0a0f19] p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Price Charged
                    </span>
                    <span className="block text-sm font-bold font-mono text-[#05d5b3] mt-0.5">
                      {Number(order.price || 0) > 0 ? (
                        `₹${Number(order.price).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}`
                      ) : (
                        <span className="italic text-slate-500 text-xs">Pending Quote</span>
                      )}
                    </span>
                  </div>

                  <div className="rounded-md bg-[#0a0f19] p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Filament Used (+10%)
                    </span>
                    <span className="block text-xs font-mono font-semibold text-[#ff783b] mt-0.5">
                      {hasValidWeight ? (
                        <span>
                          {Math.round(weightNum * 1.1 * 10) / 10}g{' '}
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({weightNum}g net)
                          </span>
                        </span>
                      ) : (
                        <span className="italic text-slate-500 text-xs">Pending Weight</span>
                      )}
                    </span>
                  </div>

                  <div className="rounded-md bg-[#0a0f19] p-3">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Pipeline Status
                    </span>
                    <span
                      className="block text-xs font-bold mt-0.5"
                      style={{ color: statusMeta.color }}
                    >
                      ● {statusMeta.label}
                    </span>
                  </div>
                </div>

                {order.description && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Order Description / Notes
                    </span>
                    <p className="mt-1 text-xs text-slate-300 bg-[#0a0f19] p-2.5 rounded">
                      {order.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Paint & Finishing Specifications */}
              <div className="rounded-lg border border-slate-800 bg-[#111726] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Paint Colours &amp; Surface Specifications
                </h3>

                <div className="flex flex-wrap gap-2 mb-3">
                  {colors.length > 0 ? (
                    colors.map((c, i) => (
                      <ColorSwatch
                        key={i}
                        name={c.name}
                        code={c.code}
                        finish={c.finish}
                        paintType={c.paint_type}
                        role={c.role || `Colour #${i + 1}`}
                      />
                    ))
                  ) : order.primary_color || order.primary_color_code ? (
                    <>
                      <ColorSwatch
                        name={order.primary_color}
                        code={order.primary_color_code}
                        finish={order.finish}
                        paintType={order.paint_type}
                        role="Primary Colour"
                      />
                      {(order.secondary_color || order.secondary_color_code) && (
                        <ColorSwatch
                          name={order.secondary_color}
                          code={order.secondary_color_code}
                          finish={order.finish}
                          paintType={order.paint_type}
                          role="Secondary Colour"
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-xs italic text-slate-500">
                      Standard primer finish. No custom paint specified.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Paint Chemistry
                    </span>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {order.paint_type || 'Unspecified'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Surface Finish
                    </span>
                    <div className="text-xs text-slate-300 mt-0.5">
                      {order.finish || 'Standard'}
                    </div>
                  </div>
                </div>

                {order.special_instructions && (
                  <div className="mt-3 rounded border border-[#ff5e1e]/30 bg-[#ff5e1e]/10 p-2.5 text-xs text-slate-200">
                    <div className="font-mono text-[10px] font-bold text-primary">
                      SPECIAL PAINTING INSTRUCTIONS
                    </div>
                    <div className="mt-1">{order.special_instructions}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTION TRACKER */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-800 bg-[#111726] p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Workflow Pipeline Progress
                </h3>
                <ProgressIndicator status={order.production_status} />
              </div>

              <div className="rounded-lg border border-slate-800 bg-[#111726] p-4">
                <h3 className="text-sm font-semibold text-white">
                  Shift Production List / Stage
                </h3>
                <p className="mt-0.5 mb-3 text-xs text-slate-400">
                  Select a destination list to immediately move this order.
                </p>

                <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRODUCTION_STATUSES.map((s) => {
                      const isSelected = selectedStatus === s.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedStatus(s.id)}
                          className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-slate-800 bg-[#0a0f19] hover:border-slate-700'
                          }`}
                        >
                          <span
                            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <div>
                            <div className="text-xs font-semibold text-white">
                              {s.label}
                            </div>
                            <div className="text-[10.5px] text-slate-400 line-clamp-1">
                              {s.desc}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="status-note-input"
                      className="text-xs font-medium text-slate-300"
                    >
                      Operator Note / Rationale (Optional)
                    </label>
                    <Input
                      id="status-note-input"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="e.g. Priming complete; moved to paint booth"
                      className="text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    disabled={
                      selectedStatus === order.production_status && !statusNote.trim()
                    }
                    className="w-full sm:w-auto"
                  >
                    Confirm Stage Update →
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY HISTORY */}
          {activeTab === 'history' && (
            <div className="rounded-lg border border-slate-800 bg-[#111726] p-4">
              <h3 className="text-sm font-semibold text-white">
                Accountability &amp; Activity Log
              </h3>
              <p className="mt-0.5 mb-3 text-xs text-slate-400">
                Audit trail of changes made to this order.
              </p>

              {loadingHistory ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : history.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No logged changes yet for this order.
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <Item key={h.id} className="bg-[#0a0f19] border-slate-800">
                      <ItemMedia className="text-primary bg-primary/10 border-primary/20 shrink-0">
                        <History className="h-4 w-4" />
                      </ItemMedia>
                      <ItemContent>
                        <div className="flex items-center justify-between">
                          <ItemTitle className="text-primary font-semibold text-xs">
                            {h.field_changed === 'production_status'
                              ? 'Production Status Changed'
                              : `Updated ${h.field_changed}`}
                          </ItemTitle>
                          <span className="font-mono text-[10px] text-slate-500">
                            {formatDateTime(h.created_at)}
                          </span>
                        </div>
                        <ItemDescription className="text-slate-300">
                          {h.old_value && (
                            <span className="text-slate-500">
                              From: <em>{h.old_value}</em> →{' '}
                            </span>
                          )}
                          <span>
                            To: <strong className="text-white">{h.new_value}</strong>
                          </span>
                        </ItemDescription>
                        {h.notes && (
                          <div className="text-[11px] text-[#05d5b3] italic pt-0.5">
                            "{h.notes}"
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 pt-0.5">
                          Operator: <span className="text-slate-400">{h.changed_by || 'Operator'}</span>
                        </div>
                      </ItemContent>
                    </Item>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FILES & PHOTOS */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              {/* Photos Gallery */}
              <div className="rounded-lg border border-slate-800 bg-[#111726] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    Product Photos ({photos.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 text-xs text-primary"
                    onClick={() => {
                      onClose()
                      onEditOrder(order)
                    }}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Edit Photos
                  </Button>
                </div>

                {photos.length > 0 ? (
                  <div>
                    <div className="flex max-h-[320px] w-full items-center justify-center overflow-hidden rounded-lg bg-black mb-2">
                      <img
                        src={activePhoto || photos[0]}
                        alt={order.item}
                        className="max-h-[320px] max-w-full object-contain"
                      />
                    </div>
                    {photos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {photos.map((u, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setActivePhoto(u)}
                            className={`h-14 w-14 shrink-0 overflow-hidden rounded border-2 transition-all ${
                              activePhoto === u
                                ? 'border-primary ring-1 ring-primary'
                                : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={u}
                              alt="thumb"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No product photos attached.
                  </div>
                )}
              </div>

              {/* 3D CAD Models */}
              <div className="rounded-lg border border-slate-800 bg-[#111726] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    3D CAD &amp; Slicer Model Files ({modelFiles.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="xs"
                    className="h-7 text-xs text-cyan"
                    onClick={() => {
                      onClose()
                      onEditOrder(order)
                    }}
                  >
                    <Box className="mr-1 h-3 w-3" /> Manage Files
                  </Button>
                </div>

                {modelFiles.length > 0 ? (
                  <div className="space-y-2">
                    {modelFiles.map((m, i) => (
                      <AttachmentItem
                        key={i}
                        name={m.name}
                        size={m.size}
                        type="model"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No 3D CAD models attached.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Tabs>

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-[#090d16] p-3 sm:p-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-destructive hover:bg-destructive/15"
            onClick={() => {
              if (
                window.confirm(
                  `Permanently remove order for "${order.item}" from the studio ledger?`
                )
              ) {
                onRemoveOrder(order)
              }
            }}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete Order
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="text-xs"
              onClick={() => onEditOrder(order)}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit Specs
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
