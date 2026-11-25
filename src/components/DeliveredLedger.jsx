import React, { useState, useMemo } from 'react'
import { calculateFilamentMetrics } from '../services/orderService'
import { STATUS_LOOKUP } from '../constants/production'
import { OrderContextMenu } from './OrderContextMenu'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import { InputGroup, InputLeftElement, InputRightElement } from '@/components/ui/input-group'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import { Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from '@/components/ui/item'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Search,
  Eye,
  Pencil,
  Trash2,
  Sparkles,
  Printer,
  LayoutGrid,
  Table as TableIcon,
  X,
  TrendingUp,
  Layers,
  Scale,
  Award,
} from 'lucide-react'

const money = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const tsMillis = (s) => (s.created_at ? new Date(s.created_at).getTime() : Date.now())

function relTime(ts) {
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export function DeliveredLedger({
  sales,
  onOpenOrder,
  onEditOrder,
  onRemoveOrder,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('cards') // 'cards' | 'table'

  // Filter delivered orders only
  const deliveredSales = useMemo(() => {
    return sales.filter((s) => s.production_status === 'delivered_completed')
  }, [sales])

  const total = useMemo(
    () => deliveredSales.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
    [deliveredSales]
  )
  const avg = useMemo(
    () => (deliveredSales.length ? total / deliveredSales.length : 0),
    [deliveredSales, total]
  )
  const best = useMemo(
    () => deliveredSales.reduce((max, s) => Math.max(max, Number(s.price) || 0), 0),
    [deliveredSales]
  )
  const zFill = useMemo(
    () => (best > 0 ? Math.min(100, Math.round((avg / best) * 100)) : 0),
    [avg, best]
  )
  const filamentMetrics = useMemo(
    () => calculateFilamentMetrics(deliveredSales),
    [deliveredSales]
  )

  // Filter by search query
  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return deliveredSales
    return deliveredSales.filter(
      (s) =>
        (s.item || '').toLowerCase().includes(q) ||
        (s.customer || '').toLowerCase().includes(q) ||
        (s.customer_contact || '').toLowerCase().includes(q) ||
        (s.primary_color || '').toLowerCase().includes(q)
    )
  }, [deliveredSales, searchQuery])

  return (
    <section className="space-y-6" aria-label="Delivered print sales ledger">
      {/* Workshop Telemetry Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="border-slate-800 bg-[#0d131f] p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-[#05d5b3]" /> Total Revenue
                </span>
                <span className="h-2 w-2 rounded-full bg-[#05d5b3]" />
              </div>
              <div className="font-mono text-2xl font-bold text-[#05d5b3] my-1">
                ₹{money(total)}
              </div>
              <div className="text-[11px] text-slate-500">
                {deliveredSales.length} completed prints
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom">Cumulative gross revenue from all fulfilled prints</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="border-slate-800 bg-[#0d131f] p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-[#ff783b]" /> Filament Consumed
                </span>
                <span>🧵</span>
              </div>
              <div className="font-mono text-2xl font-bold text-[#ff783b] my-1">
                {filamentMetrics.totalGrams} <span className="text-sm font-normal text-slate-400">g</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {filamentMetrics.netGrams}g net + 10% misc ({filamentMetrics.miscGrams}g)
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom">Estimated spool material consumption across all delivered jobs</TooltipContent>
        </Tooltip>

        {/* 3D Printer Z-Axis Build Height Visualizer with Progress */}
        <Card className="border-slate-800 bg-[#0d131f] p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-cyan" /> Avg Sale · Z-Build
            </span>
            <span className="font-mono text-[10px] text-cyan">{zFill}%</span>
          </div>
          <div className="my-1.5">
            <div className="font-mono text-xl font-bold text-[#05d5b3] mb-1.5">
              ₹{money(avg)}
            </div>
            <Progress value={zFill} className="h-2 bg-slate-900" indicatorClassName="bg-gradient-to-r from-teal to-cyan" />
          </div>
          <div className="text-[10.5px] text-slate-500">
            Z-ratio: {zFill}% of top print (₹{money(best)})
          </div>
        </Card>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="border-slate-800 bg-[#0d131f] p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-amber-400" /> Top Single Print
                </span>
                <span>🏆</span>
              </div>
              <div className="font-mono text-2xl font-bold text-white my-1">
                ₹{money(best)}
              </div>
              <div className="text-[11px] text-slate-500">
                Highest individual completed record
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="bottom">Single most valuable delivered order on record</TooltipContent>
        </Tooltip>
      </div>

      <Separator className="bg-slate-800/80" />

      {/* Search & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Printer className="h-4 w-4 text-cyan" />
            <span>Delivered Prints on Build Plate</span>
            <span className="font-mono text-xs font-normal text-slate-400">
              ({filteredSales.length} of {deliveredSales.length} completed)
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-full sm:w-72">
            <InputGroup>
              <InputLeftElement>
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </InputLeftElement>
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter item, customer, or color..."
                className="pl-8 pr-8 text-xs border-slate-800 bg-[#0d131f]"
              />
              {searchQuery && (
                <InputRightElement>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </InputRightElement>
              )}
            </InputGroup>
          </div>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(val) => val && setViewMode(val)}
            className="border border-slate-800 rounded-md p-0.5 bg-[#0d131f] shrink-0"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value="cards"
                  aria-label="Card view"
                  size="sm"
                  className="h-7 px-2 text-xs data-[state=on]:bg-slate-800 data-[state=on]:text-cyan"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="top">Card view</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <ToggleGroupItem
                  value="table"
                  aria-label="Table view"
                  size="sm"
                  className="h-7 px-2 text-xs data-[state=on]:bg-slate-800 data-[state=on]:text-cyan"
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </ToggleGroupItem>
              </TooltipTrigger>
              <TooltipContent side="top">Table view</TooltipContent>
            </Tooltip>
          </ToggleGroup>
        </div>
      </div>

      {/* Layer Stack / Content View */}
      {filteredSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0d131f] p-12 text-center">
          <div className="mb-3 text-4xl">🖨️</div>
          <h4 className="text-base font-semibold text-white">No delivered print orders found</h4>
          <p className="mt-1 text-xs text-slate-400">
            {searchQuery
              ? 'No delivered orders matched your search query.'
              : 'Orders will appear here once marked Completed in the Painting Dashboard.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View using shadcn Table components */
        <div className="rounded-xl border border-slate-800 bg-[#0e1422] overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-900/60 border-b border-slate-800">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="w-16 font-mono text-xs">Layer</TableHead>
                <TableHead className="text-xs">Print Item</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Weight &amp; Material</TableHead>
                <TableHead className="text-xs text-right">Price</TableHead>
                <TableHead className="text-xs text-right">Completed</TableHead>
                <TableHead className="w-24 text-center text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((s, i) => {
                const idx = filteredSales.length - i
                const ts = tsMillis(s)
                const isExpress = s.priority === 'express' || s.print_type === 'express'

                return (
                  <OrderContextMenu
                    key={s.id}
                    order={s}
                    onOpenOrder={onOpenOrder}
                    onEditOrder={onEditOrder}
                    onDeleteOrder={onRemoveOrder}
                  >
                    <TableRow
                      className="border-slate-800/80 hover:bg-slate-800/40 cursor-pointer"
                      onClick={() => onOpenOrder(s)}
                    >
                    <TableCell className="font-mono text-xs font-bold text-cyan">
                      L-{String(idx).padStart(2, '0')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">{s.item}</span>
                        {s.qty > 1 && (
                          <span className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-cyan">
                            ×{s.qty}
                          </span>
                        )}
                        {isExpress && (
                          <Badge variant="express" className="py-0 px-1.5 text-[9px]">
                            Express
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <span className="text-xs text-slate-300 underline-offset-2 hover:underline cursor-pointer">
                            {s.customer}
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-64 border-slate-700 bg-[#0d131f] text-xs space-y-1.5">
                          <div className="font-semibold text-white">{s.customer}</div>
                          {s.customer_contact && (
                            <div className="text-slate-400 text-[11px] font-mono">
                              {s.customer_contact}
                            </div>
                          )}
                          <div className="text-slate-500 text-[10px] pt-1 border-t border-slate-800">
                            Delivered record #{s.id?.slice(0, 8)}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        {s.weight_g != null && <span>🧵 {s.weight_g}g</span>}
                        {s.primary_color && (
                          <span className="inline-flex items-center gap-1 ml-1">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: s.primary_color_code || '#888' }}
                            />
                            <span>{s.primary_color}</span>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-[#05d5b3] text-xs">
                      ₹{money(s.price)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-[11px] text-slate-500">
                      {relTime(ts)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                      <ButtonGroup className="justify-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-7 px-1.5 text-cyan hover:bg-slate-800"
                              onClick={() => onOpenOrder(s)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Inspect</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="xs"
                              className="h-7 px-1.5 text-slate-300 hover:bg-slate-800"
                              onClick={() => onEditOrder(s)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">Edit</TooltipContent>
                        </Tooltip>

                        {onRemoveOrder && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-7 px-1.5 text-destructive hover:bg-destructive/15"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Permanently delete delivered print "${s.item}" from ledger?`
                                    )
                                  ) {
                                    onRemoveOrder(s)
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Delete</TooltipContent>
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
        </div>
      ) : (
        /* Card View using Item and Card primitives */
        <div className="space-y-2.5">
          {filteredSales.map((s, i) => {
            const idx = filteredSales.length - i
            const ts = tsMillis(s)
            const shots = s.images?.length || s.imageUrls?.length || 0
            const isExpress = s.priority === 'express' || s.print_type === 'express'

            return (
              <OrderContextMenu
                key={s.id}
                order={s}
                onOpenOrder={onOpenOrder}
                onEditOrder={onEditOrder}
                onDeleteOrder={onRemoveOrder}
              >
                <Card
                  onClick={() => onOpenOrder(s)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-slate-800 bg-[#0e1422] p-3.5 hover:border-slate-700 hover:bg-[#111728] transition-all cursor-pointer"
                >
                {/* Left: Layer Number & Item component */}
                <Item className="gap-3 min-w-0">
                  <ItemMedia className="flex h-9 w-12 shrink-0 items-center justify-center rounded bg-slate-900 border border-slate-800 font-mono text-xs font-bold text-cyan">
                    L-{String(idx).padStart(2, '0')}
                  </ItemMedia>

                  <ItemContent className="min-w-0 space-y-1">
                    <ItemTitle className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="font-semibold text-white truncate">
                        {s.item}
                      </span>
                      {s.qty > 1 && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-cyan">
                          ×{s.qty}
                        </span>
                      )}
                      {isExpress ? (
                        <Badge variant="express" className="py-0 px-2 text-[10px]">
                          <Sparkles className="mr-1 h-2.5 w-2.5" /> Express
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-500">Regular</span>
                      )}
                      <Badge variant="emerald" className="py-0 px-2 text-[10px]">
                        ● Completed
                      </Badge>
                    </ItemTitle>

                    <ItemDescription className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <span className="text-slate-300 hover:text-white cursor-pointer underline-offset-2 hover:underline">
                            👤 {s.customer}
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-60 border-slate-700 bg-[#0d131f] text-xs">
                          <div className="font-semibold text-white">{s.customer}</div>
                          {s.customer_contact && (
                            <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                              {s.customer_contact}
                            </div>
                          )}
                        </HoverCardContent>
                      </HoverCard>

                      {s.weight_g != null && (
                        <span>
                          · 🧵 {s.weight_g}g{' '}
                          <span className="text-[#ff783b] text-[10.5px]">
                            (+10%: {Math.round(Number(s.weight_g) * 1.1 * 10) / 10}g)
                          </span>
                        </span>
                      )}
                      {shots > 0 && <span>· 📷 {shots} photo{shots > 1 ? 's' : ''}</span>}
                      {s.model_files?.length > 0 && (
                        <span>· 🧊 {s.model_files.length} file{s.model_files.length > 1 ? 's' : ''}</span>
                      )}
                      {s.primary_color && (
                        <span className="inline-flex items-center gap-1.5">
                          ·
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: s.primary_color_code || '#888' }}
                          />
                          <span>{s.primary_color}</span>
                        </span>
                      )}
                    </ItemDescription>
                  </ItemContent>
                </Item>

                {/* Right: Price, RelTime & ButtonGroup Actions */}
                <div
                  className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 border-t border-slate-800/80 sm:border-t-0 sm:pt-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-left sm:text-right">
                    <div className="font-mono text-base font-bold text-[#05d5b3]">
                      ₹{money(s.price)}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {relTime(ts)}
                    </div>
                  </div>

                  <ButtonGroup className="gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 text-xs text-cyan hover:bg-slate-800"
                          onClick={() => onOpenOrder(s)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Inspect details</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 text-xs text-slate-300 hover:bg-slate-800"
                          onClick={() => onEditOrder(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Edit order</TooltipContent>
                    </Tooltip>

                    {onRemoveOrder && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="xs"
                            className="h-7 text-xs text-destructive hover:bg-destructive/15"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Permanently delete delivered print "${s.item}" from ledger?`
                                )
                              ) {
                                onRemoveOrder(s)
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Delete from ledger</TooltipContent>
                      </Tooltip>
                    )}
                  </ButtonGroup>
                </div>
                </Card>
              </OrderContextMenu>
            )
          })}
        </div>
      )}
    </section>
  )
}
