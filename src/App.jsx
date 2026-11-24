import { useEffect, useMemo, useState } from 'react'
import { supabase, isConfigured, BUCKET, SIGNED_URL_TTL } from './supabase'
import {
  PRODUCTION_STATUSES,
  STATUS_LOOKUP,
} from './constants/production'
import {
  normalizeOrder,
  calculateDashboardStats,
  calculateFilamentMetrics,
  sortOrders,
  filterOrders,
  hasRequiredPrintingSpecs,
} from './services/orderService'
import { logOrderChange } from './services/historyService'
import { getInitialSeedOrders } from './services/mockData'

import { SimpleFilterHub } from './components/SimpleFilterHub'
import { OrderTableView } from './components/OrderTableView'
import { OrderCardView } from './components/OrderCardView'
import { OrderKanbanView } from './components/OrderKanbanView'
import { OrderDetailModal } from './components/OrderDetailModal'
import { EditOrderModal } from './components/EditOrderModal'
import { RequiredPrintingSpecsModal } from './components/RequiredPrintingSpecsModal'
import { NewOrderIntake } from './components/NewOrderIntake'
import { DeliveredLedger } from './components/DeliveredLedger'
import { MIGRATION_SQL } from './constants/migrationSql'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputRightElement } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command'

const TABLE = 'sales'
const LOCAL_STORAGE_KEY = 'layerledger_orders_v2'
const ORDER_OVERRIDES_KEY = 'layerledger_order_overrides'

const getOrderOverrides = () => {
  try {
    return JSON.parse(localStorage.getItem(ORDER_OVERRIDES_KEY) || '{}')
  } catch {
    return {}
  }
}

const saveOrderOverride = (orderId, updates) => {
  try {
    const current = getOrderOverrides()
    current[orderId] = { ...(current[orderId] || {}), ...updates }
    localStorage.setItem(ORDER_OVERRIDES_KEY, JSON.stringify(current))
  } catch (e) {
    console.warn('Could not save order override:', e)
  }
}

const EMAIL_DOMAIN = 'pyraxis-prints.app'
const toEmail = (u) => `${u.trim().toLowerCase()}@${EMAIL_DOMAIN}`

const money = (n) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/* Turn storage paths into signed URLs or local storage fallback */
async function enrich(rows) {
  return Promise.all(
    rows.map(async (r) => {
      let imageUrls = []
      if (r.images?.length) {
        if (isConfigured) {
          try {
            const { data } = await supabase.storage
              .from(BUCKET)
              .createSignedUrls(r.images, SIGNED_URL_TTL)
            imageUrls = (data || []).map((d) => d.signedUrl).filter(Boolean)
          } catch {
            imageUrls = []
          }
        }
        if (!imageUrls.length) {
          imageUrls = r.images.map((p) =>
            p.startsWith('http') || p.startsWith('blob:') ? p : `/storage/sales/${p}`
          )
        }
      }

      let modelFiles = []
      if (r.model_files?.length) {
        if (isConfigured) {
          try {
            const paths = r.model_files.map((m) => m.path)
            const { data } = await supabase.storage
              .from(BUCKET)
              .createSignedUrls(paths, SIGNED_URL_TTL)
            modelFiles = r.model_files.map((m, idx) => ({
              name: m.name,
              url: data?.[idx]?.signedUrl || `/storage/sales/${m.path}`,
            }))
          } catch {
            modelFiles = r.model_files.map((m) => ({
              name: m.name,
              url: `/storage/sales/${m.path}`,
            }))
          }
        } else {
          modelFiles = r.model_files.map((m) => ({
            name: m.name,
            url: `/storage/sales/${m.path}`,
          }))
        }
      }
      return normalizeOrder({ ...r, imageUrls, modelFiles })
    })
  )
}

const friendly = (err) => {
  const msg = err?.message || String(err)
  if (/schema cache|does not exist|42P01/i.test(msg))
    return 'Database columns missing. Run supabase/migrations/001_order_management.sql in SQL Editor.'
  if (/row-level security|permission|not authorized|403/i.test(msg))
    return 'Blocked by Row Level Security. Run supabase/schema.sql in SQL Editor.'
  if (/bucket/i.test(msg))
    return 'Storage bucket "sales" missing. Run schema.sql to create it.'
  return msg
}

/* ==================================================================
   ROOT COMPONENT
   ================================================================== */
export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('layerledger_active_user') || 'Thulasi'
  })
  const [operatorLoggedIn, setOperatorLoggedIn] = useState(() => {
    return (
      localStorage.getItem('layerledger_operator_logged_in') === 'true' ||
      localStorage.getItem('layerledger_sandbox_session') === 'true'
    )
  })

  useEffect(() => {
    if (!isConfigured) {
      setAuthReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!authReady) {
    return (
      <div className="gate">
        <SpoolMark className="brand-mark spinning" style={{ width: 64, height: 64 }} />
      </div>
    )
  }

  // Show login terminal if not logged in
  if (!session && !operatorLoggedIn) {
    return (
      <Login
        onEnterSandbox={(uname = 'Thulasi') => {
          localStorage.setItem('layerledger_operator_logged_in', 'true')
          localStorage.setItem('layerledger_active_user', uname)
          setCurrentUser(uname)
          setOperatorLoggedIn(true)
        }}
      />
    )
  }

  const effectiveUser = session?.user || {
    id: currentUser.toLowerCase(),
    email: `${currentUser.toLowerCase()}@pyraxis-prints.app`,
    user_metadata: { username: currentUser },
  }

  return (
    <Ledger
      user={effectiveUser}
      isSandbox={!isConfigured}
      onSignOut={() => {
        if (isConfigured) supabase.auth.signOut()
        localStorage.removeItem('layerledger_operator_logged_in')
        localStorage.removeItem('layerledger_sandbox_session')
        localStorage.removeItem('layerledger_active_user')
        setOperatorLoggedIn(false)
        setSession(null)
      }}
    />
  )
}

/* ==================================================================
   LOGIN / OPERATOR TERMINAL
   ================================================================== */
const SITE_CREDENTIALS = {
  userId: 'Thulasi',
  password: 'Type-C',
}

function Login({ onEnterSandbox }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  const submit = async (e) => {
    if (e) e.preventDefault()
    const trimmedId = username.trim()
    if (!trimmedId || !password) return setErr('Please enter Site User ID and Password.')
    setBusy(true)
    setErr('')

    // 1. Primary site credentials check
    if (
      trimmedId.toLowerCase() === SITE_CREDENTIALS.userId.toLowerCase() &&
      password === SITE_CREDENTIALS.password
    ) {
      setTimeout(() => {
        onEnterSandbox(SITE_CREDENTIALS.userId)
        setBusy(false)
      }, 150)
      return
    }

    // 2. Fallback to Supabase Auth if configured
    if (isConfigured) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: toEmail(trimmedId),
          password,
        })
        if (!error) {
          onEnterSandbox(trimmedId)
          setBusy(false)
          return
        }
      } catch {}
    }

    setBusy(false)
    setErr('Invalid credentials. Site User ID is "Thulasi" and password is "Type-C".')
  }

  const handleQuickDemo = () => {
    setUsername('Thulasi')
    setPassword('Type-C')
    onEnterSandbox('Thulasi')
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="gate-brand">
          <div className="brand-spool-wrap">
            <SpoolMark className="gate-spool-logo" />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <span className="studio-badge">Pyraxis Prints Studio</span>
        </div>
        <h1 className="gate-title">LayerLedger Console</h1>
        <p className="gate-sub">Enter operator credentials to access production tracking and order management.</p>

        {/* 1-Click Quick Demo Access Chip */}
        <div
          className="gate-demo-chip"
          onClick={handleQuickDemo}
          title="Click to fill operator demo login"
        >
          ⚡ Demo Access: <strong>Thulasi</strong> / <strong>Type-C</strong> (Click to fill)
        </div>

        <FieldGroup className="gate-input-wrap space-y-3">
          <Field>
            <FieldLabel htmlFor="g-user">Site User ID</FieldLabel>
            <Input
              id="g-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Site User ID"
              autoComplete="username"
              required
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="g-pass">Password</FieldLabel>
            <InputGroup>
              <Input
                id="g-pass"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                autoComplete="current-password"
                required
                className="pr-10"
              />
              <InputRightElement>
                <button
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors"
                  onClick={() => setShow((s) => !s)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? '🙈' : '👁️'}
                </button>
              </InputRightElement>
            </InputGroup>
          </Field>
        </FieldGroup>

        {err && (
          <div className="banner banner-error my-3 text-xs">
            {err}
          </div>
        )}

        <Button
          type="submit"
          disabled={busy}
          className="w-full mt-4 py-2.5 text-sm bg-primary text-white hover:bg-primary/90 flex items-center justify-center gap-2"
        >
          {busy ? (
            <>
              <Spinner size="sm" className="text-white" />
              <span>Authenticating Terminal…</span>
            </>
          ) : (
            'Sign In to Studio Console →'
          )}
        </Button>
      </form>
    </div>
  )
}

/* ==================================================================
   LEDGER / MAIN STUDIO CONSOLE
   ================================================================== */
function Ledger({ user, isSandbox, onSignOut }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [warningBanner, setWarningBanner] = useState('')
  const [sqlCopied, setSqlCopied] = useState(false)
  const [successBanner, setSuccessBanner] = useState('')
  const [commandOpen, setCommandOpen] = useState(false)

  // Keyboard shortcut Ctrl+K / Cmd+K for Command Palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCopySql = () => {
    navigator.clipboard?.writeText(MIGRATION_SQL).then(() => {
      setSqlCopied(true)
      setTimeout(() => setSqlCopied(false), 3000)
    })
  }

  // Active view: 'dashboard' | 'print-ledger' | 'new-order'
  const [activeNav, setActiveNav] = useState('dashboard')
  const [viewMode, setViewMode] = useState('kanban') // 'table' | 'card' | 'kanban' - default to cards board!

  // Search & Filters
  const [filters, setFilters] = useState({
    query: '',
    priority: 'all',
    status: 'all',
    timeframe: 'all',
    customer: '',
    colour: '',
    sort: 'priority',
  })

  // Modals
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [printingSpecsPrompt, setPrintingSpecsPrompt] = useState(null)

  const loadSales = async (silent = false) => {
    if (!silent && sales.length === 0) {
      setLoading(true)
    }

    if (isConfigured) {
      try {
        const { data, error: e } = await supabase
          .from(TABLE)
          .select('*')
          .order('created_at', { ascending: false })

        if (e) throw e

        if (data && data.length > 0) {
          const overrides = getOrderOverrides()
          const merged = data.map((r) => {
            const o = overrides[r.id]
            return o ? { ...r, ...o } : r
          })
          const enriched = await enrich(merged)
          setSales(enriched)
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(enriched))
          } catch {}
          setError('')
          setLoading(false)
          return
        }
      } catch (err) {
        console.warn('Could not fetch from Supabase, loading fallback:', err)
        setError(friendly(err))
      }
    }

    // Local Storage / Seed Fallback
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
      let parsed = raw ? JSON.parse(raw) : null
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
        parsed = getInitialSeedOrders()
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed))
      }
      const enriched = await enrich(parsed)
      setSales(enriched)
    } catch {
      const enriched = await enrich(getInitialSeedOrders())
      setSales(enriched)
    }
    setLoading(false)
  }

  const persistSandboxSales = (newSales) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newSales))
    } catch (e) {
      console.warn('Could not persist to localStorage:', e)
    }
  }

  useEffect(() => {
    loadSales()

    if (isConfigured) {
      const channel = supabase
        .channel('sales-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: TABLE },
          () => loadSales(true)
        )
        .subscribe()
      return () => supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!successBanner) return
    const timer = setTimeout(() => setSuccessBanner(''), 4000)
    return () => clearTimeout(timer)
  }, [successBanner])

  // Financial & Workshop Telemetry
  const total = useMemo(
    () => sales.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
    [sales]
  )
  const dashboardStats = useMemo(() => calculateDashboardStats(sales), [sales])
  const filamentMetrics = useMemo(() => calculateFilamentMetrics(sales), [sales])

  // Filtered orders for Painting Dashboard
  const filteredOrders = useMemo(() => {
    const matched = filterOrders(sales, filters)
    return sortOrders(matched, filters.sort)
  }, [sales, filters])

  // For Kanban: keep all columns visible while respecting query & priority
  const kanbanOrders = useMemo(() => {
    const kanbanFilters = { ...filters, status: 'all' }
    const matched = filterOrders(sales, kanbanFilters)
    return sortOrders(matched, filters.sort)
  }, [sales, filters])

  // Delivered orders count
  const deliveredSalesCount = useMemo(() => {
    return sales.filter((s) => s.production_status === 'delivered_completed').length
  }, [sales])

  // Status transition handler
  const handleStatusChange = async (order, newStatus, notes = '') => {
    if (!order || order.production_status === newStatus) return

    const targetMeta = STATUS_LOOKUP[newStatus]
    const isTargetPrintingOrBeyond = targetMeta && targetMeta.step >= 1

    if (isTargetPrintingOrBeyond && !hasRequiredPrintingSpecs(order)) {
      setPrintingSpecsPrompt({
        order,
        targetStatus: newStatus,
        notes,
      })
      return
    }

    const oldStatus = order.production_status
    const updated = { ...order, production_status: newStatus }

    setSales((prev) => {
      const next = prev.map((s) => (s.id === order.id ? updated : s))
      persistSandboxSales(next)
      return next
    })
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(updated)
    }

    await logOrderChange({
      saleId: order.id,
      fieldChanged: 'production_status',
      oldValue: STATUS_LOOKUP[oldStatus]?.label || oldStatus,
      newValue: STATUS_LOOKUP[newStatus]?.label || newStatus,
      notes,
      user,
    })

    if (isConfigured) {
      try {
        const { error: e } = await supabase
          .from(TABLE)
          .update({ production_status: newStatus })
          .eq('id', order.id)
        if (e) throw e
      } catch (err) {
        saveOrderOverride(order.id, { production_status: newStatus })
        setWarningBanner('Status updated locally. Cloud schema update recommended.')
      }
    }

    setSuccessBanner(
      `Order #${order.id.slice(0, 8)} transitioned to "${STATUS_LOOKUP[newStatus]?.label || newStatus}"`
    )
  }

  // Mandatory printing specs confirmed
  const handleConfirmPrintingSpecs = async ({ price: p, weight_g: w }) => {
    if (!printingSpecsPrompt) return
    const { order, targetStatus, notes = '' } = printingSpecsPrompt
    const oldStatus = order.production_status

    const updated = {
      ...order,
      price: p,
      weight_g: w,
      production_status: targetStatus,
    }

    setSales((prev) => {
      const next = prev.map((s) => (s.id === order.id ? updated : s))
      persistSandboxSales(next)
      return next
    })
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(updated)
    }

    await logOrderChange({
      saleId: order.id,
      fieldChanged: 'production_status',
      oldValue: STATUS_LOOKUP[oldStatus]?.label || oldStatus,
      newValue: STATUS_LOOKUP[targetStatus]?.label || targetStatus,
      notes: `Captured mandatory specs (Price: ₹${p}, Weight: ${w}g)${notes ? ` · ${notes}` : ''}`,
      user,
    })

    if (isConfigured) {
      try {
        await supabase
          .from(TABLE)
          .update({ price: p, weight_g: w, production_status: targetStatus })
          .eq('id', order.id)
      } catch {
        saveOrderOverride(order.id, { price: p, weight_g: w, production_status: targetStatus })
      }
    }

    setPrintingSpecsPrompt(null)
    setSuccessBanner(`Captured specs and moved order to "${STATUS_LOOKUP[targetStatus]?.label || targetStatus}"`)
  }

  // Save edited order
  const handleSaveOrder = async (order, updates) => {
    const { imageUrls, modelFiles, ...dbUpdates } = updates

    let enriched = { ...order, ...updates }
    try {
      const [res] = await enrich([enriched])
      if (res) enriched = res
    } catch {}

    const updated = normalizeOrder(enriched)

    setSales((prev) => {
      const next = prev.map((s) => (s.id === order.id ? updated : s))
      persistSandboxSales(next)
      return next
    })
    if (selectedOrder?.id === order.id) {
      setSelectedOrder(updated)
    }

    await logOrderChange({
      saleId: order.id,
      fieldChanged: 'order_updated',
      oldValue: null,
      newValue: 'Specifications Updated',
      user,
    })

    if (isConfigured) {
      try {
        const { error: e } = await supabase.from(TABLE).update(dbUpdates).eq('id', order.id)
        if (e) throw e
      } catch {
        saveOrderOverride(order.id, updates)
      }
    }

    setSuccessBanner(`Order #${order.id.slice(0, 8)} updated successfully.`)
  }

  // Remove order
  const removeSale = async (sale) => {
    setSelectedOrder(null)
    setEditingOrder(null)

    setSales((prev) => {
      const next = prev.filter((s) => s.id !== sale.id)
      persistSandboxSales(next)
      return next
    })

    if (isConfigured) {
      try {
        const paths = [
          ...(sale.images || []),
          ...(sale.model_files || []).map((m) => m.path),
        ].filter(Boolean)
        if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
        await supabase.from(TABLE).delete().eq('id', sale.id)
      } catch (e) {
        console.warn('Could not delete from Supabase:', e)
      }
    }

    setSuccessBanner(`Order #${sale.id.slice(0, 8)} removed from ledger.`)
  }

  const handleFilterChange = (partial) => {
    setFilters((prev) => ({ ...prev, ...partial }))
  }

  const handleResetFilters = () => {
    setFilters({
      query: '',
      priority: 'all',
      status: 'all',
      timeframe: 'all',
      customer: '',
      colour: '',
      sort: 'priority',
    })
  }

  return (
    <TooltipProvider>
    <div className="shell">
      {/* Studio Header & Command HUD */}
      <header className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-3.5 sm:p-4 rounded-xl border border-slate-800 bg-[#0d131f]/95 shadow-xl mb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 border border-slate-800 shadow-[0_0_15px_rgba(255,94,30,0.25)]">
            <SpoolMark className="h-7 w-7" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white font-display">
                Layer<span className="text-primary">Ledger</span>
              </span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary border border-primary/20">
                Pyraxis Prints
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              3D Print &amp; Finishing Production Console
            </div>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full lg:w-auto" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeNav === 'dashboard'}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeNav === 'dashboard'
                ? 'bg-[#1e293b] text-white shadow ring-1 ring-slate-700'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
            onClick={() => setActiveNav('dashboard')}
          >
            <span>📋</span> Painting Dashboard
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {dashboardStats.totalActive}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeNav === 'print-ledger'}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeNav === 'print-ledger'
                ? 'bg-[#1e293b] text-white shadow ring-1 ring-slate-700'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
            onClick={() => setActiveNav('print-ledger')}
          >
            <span>🖨️</span> Print Sales Ledger
            <span className="rounded-full bg-[#2dd4bf]/20 px-1.5 py-0.2 text-[10px] text-[#2dd4bf] font-bold">
              {deliveredSalesCount}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeNav === 'new-order'}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
              activeNav === 'new-order'
                ? 'bg-[#1e293b] text-white shadow ring-1 ring-slate-700'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
            onClick={() => setActiveNav('new-order')}
          >
            <span>➕</span> New Order Intake
          </button>
        </nav>

        {/* Right Telemetry HUD & Operator Info */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2 pt-2 border-t border-slate-800/80 lg:border-t-0 lg:pt-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setCommandOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 h-8 border-slate-800 bg-[#0a0f19] text-slate-400 hover:text-white text-xs"
                >
                  <span>Quick Find</span>
                  <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded bg-slate-800 px-1 font-mono text-[9px] text-slate-400">
                    ⌘K
                  </kbd>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open studio command search (Ctrl+K)</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0a0f19] px-2.5 py-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500">Revenue</span>
            <span className="font-mono font-bold text-[#05d5b3]">₹{money(total)}</span>
          </div>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#0a0f19] px-2.5 py-1 text-xs cursor-default">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Filament</span>
                  <span className="font-mono font-bold text-[#ff783b]">{filamentMetrics.totalGrams} g</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {filamentMetrics.netGrams}g net print + 10% misc ({filamentMetrics.miscGrams}g)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <HoverCard>
            <HoverCardTrigger asChild>
              <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-xs text-white cursor-pointer hover:border-slate-600 transition-colors">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {(user?.user_metadata?.username || 'T')[0].toUpperCase()}
                </div>
                <span className="font-medium text-xs">{user?.user_metadata?.username || 'Thulasi'}</span>
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConfigured ? 'bg-emerald animate-pulse' : 'bg-amber'
                  }`}
                />
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-64 space-y-2 text-xs" align="end">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-white">Operator Console</span>
                <Badge variant={isConfigured ? "emerald" : "outline"} className="text-[10px]">
                  {isConfigured ? "Cloud Synced" : "Local Sandbox"}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-1 text-slate-300">
                <div>Operator: <strong className="text-white">{user?.user_metadata?.username || 'Thulasi'}</strong></div>
                <div>Studio: <span className="text-cyan">Pyraxis Prints Studio</span></div>
                <div>Queue: <span>{sales.length} total orders recorded</span></div>
              </div>
            </HoverCardContent>
          </HoverCard>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  onClick={onSignOut}
                  aria-label="Sign out of console"
                >
                  ⇥
                </button>
              </TooltipTrigger>
              <TooltipContent>Sign out of console</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Global Status Notifications */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/15 p-3 text-xs text-destructive">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError('')} className="text-sm">✕</button>
        </div>
      )}
      {warningBanner && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-amber/40 bg-amber/15 p-3 text-xs text-amber">
          <div>
            ⚠️ {warningBanner}{' '}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-[11px] font-mono">
              001_order_management.sql
            </code>
          </div>
          <div className="flex items-center gap-2">
            <Button size="xs" variant="outline" onClick={handleCopySql} className="h-6 text-[11px]">
              {sqlCopied ? '✓ Copied SQL!' : '📋 Copy SQL'}
            </Button>
            <button
              type="button"
              className="text-slate-400 hover:text-white"
              onClick={() => setWarningBanner('')}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {successBanner && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-[#10b981]/40 bg-[#10b981]/15 p-3 text-xs text-[#34d399] animate-in fade-in">
          <span>✓ {successBanner}</span>
          <button type="button" onClick={() => setSuccessBanner('')} className="text-sm">✕</button>
        </div>
      )}

      {/* VIEW 1: DASHBOARD */}
      {activeNav === 'dashboard' && (
        <main>
          <SimpleFilterHub
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            stats={dashboardStats}
            filamentMetrics={filamentMetrics}
            totalCount={sales.length}
            filteredCount={filteredOrders.length}
          />

          {loading && sales.length === 0 ? (
            <div className="space-y-4 rounded-xl border border-slate-800 bg-[#0d131f] p-8 text-center shadow-xl">
              <div className="flex flex-col items-center justify-center gap-2">
                <Spinner size="lg" className="text-cyan animate-spin" />
                <p className="text-sm font-semibold text-white">Syncing studio production queue…</p>
                <p className="text-xs text-slate-400">Loading orders, print weights and paint specs</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : viewMode === 'table' ? (
            <OrderTableView
              orders={filteredOrders}
              onOpenOrder={(o) => setSelectedOrder(o)}
              onEditOrder={(o) => setEditingOrder(o)}
              onStatusChange={handleStatusChange}
              onDeleteOrder={removeSale}
            />
          ) : viewMode === 'card' ? (
            <OrderCardView
              orders={filteredOrders}
              onOpenOrder={(o) => setSelectedOrder(o)}
              onEditOrder={(o) => setEditingOrder(o)}
              onStatusChange={handleStatusChange}
              onDeleteOrder={removeSale}
            />
          ) : (
            <OrderKanbanView
              orders={kanbanOrders}
              onOpenOrder={(o) => setSelectedOrder(o)}
              onEditOrder={(o) => setEditingOrder(o)}
              onStatusChange={handleStatusChange}
              onDeleteOrder={removeSale}
            />
          )}
        </main>
      )}

      {/* VIEW 2: DELIVERED PRINT SALES LEDGER */}
      {activeNav === 'print-ledger' && (
        <main>
          <DeliveredLedger
            sales={sales}
            onOpenOrder={(o) => setSelectedOrder(o)}
            onEditOrder={(o) => setEditingOrder(o)}
            onRemoveOrder={removeSale}
          />
        </main>
      )}

      {/* VIEW 3: NEW ORDER INTAKE */}
      {activeNav === 'new-order' && (
        <main>
          <NewOrderIntake
            user={user}
            isSandbox={!isConfigured || isSandbox}
            onError={setError}
            onSaved={(newOrder) => {
              if (newOrder && (!isConfigured || isSandbox)) {
                setSales((prev) => {
                  const next = [normalizeOrder(newOrder), ...prev]
                  persistSandboxSales(next)
                  return next
                })
              } else {
                loadSales(true)
              }
              setActiveNav('dashboard')
              setFilters((prev) => ({ ...prev, status: 'order_received', query: '' }))
              setSuccessBanner(`Order #${newOrder?.id ? newOrder.id.slice(0, 8) : 'new'} logged into Awaiting Print queue!`)
            }}
          />
        </main>
      )}

      {/* Command Palette Dialog (Cmd+K / Ctrl+K) */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search orders by item, customer, ID, or color..." />
        <CommandList>
          <CommandEmpty>No matching orders or commands found.</CommandEmpty>
          <CommandGroup heading="Navigation Actions">
            <CommandItem
              onSelect={() => {
                setActiveNav('dashboard')
                setCommandOpen(false)
              }}
            >
              📋 Switch to Painting Dashboard
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setActiveNav('print-ledger')
                setCommandOpen(false)
              }}
            >
              🖨️ Switch to Print Sales Ledger
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setActiveNav('new-order')
                setCommandOpen(false)
              }}
            >
              ➕ Create New Order Intake
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading={`Active Orders (${sales.length})`}>
            {sales.slice(0, 10).map((o) => (
              <CommandItem
                key={o.id}
                value={`${o.item} ${o.customer} ${o.id} ${o.primary_color || ''}`}
                onSelect={() => {
                  setSelectedOrder(o)
                  setCommandOpen(false)
                }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-[10.5px] text-cyan">#{o.id.slice(0, 8)}</span>
                  <span className="font-medium text-white truncate">{o.item}</span>
                  <span className="text-[11px] text-slate-400">· {o.customer}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[#05d5b3] text-xs font-bold">
                    {Number(o.price) > 0 ? `₹${money(o.price)}` : 'Pending'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {STATUS_LOOKUP[o.production_status]?.label || 'Active'}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          user={user}
          onClose={() => setSelectedOrder(null)}
          onEditOrder={(o) => {
            setSelectedOrder(null)
            setEditingOrder(o)
          }}
          onStatusChange={handleStatusChange}
          onRemoveOrder={removeSale}
        />
      )}

      {/* Edit Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={handleSaveOrder}
          onDeleteOrder={removeSale}
        />
      )}

      {/* Required Printing Specs Gate Modal */}
      {printingSpecsPrompt && (
        <RequiredPrintingSpecsModal
          order={printingSpecsPrompt.order}
          targetStatus={printingSpecsPrompt.targetStatus}
          onConfirm={handleConfirmPrintingSpecs}
          onCancel={() => setPrintingSpecsPrompt(null)}
        />
      )}
    </div>
    </TooltipProvider>
  )
}

function SpoolMark({ className = 'brand-mark', style = {} }) {
  return (
    <svg className={className} style={style} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="13" stroke="#FF5E1E" strokeWidth="3" />
      <circle cx="22" cy="22" r="4.6" fill="#00F0FF" />
      <path d="M22 6a16 16 0 0 1 11.3 4.7" stroke="#FF5E1E" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}
