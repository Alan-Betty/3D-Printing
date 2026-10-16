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
  const [username, setUsername] = useState('Thulasi')
  const [password, setPassword] = useState('Type-C')
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
          title="Click for instant 1-click access"
        >
          ⚡ Auto-Fill Operator: <strong>Thulasi</strong> / <strong>Type-C</strong> (Click to enter)
        </div>

        <div className="gate-input-wrap">
          <div className="form-group">
            <label className="form-label" htmlFor="g-user">Site User ID</label>
            <input
              id="g-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Thulasi"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="g-pass">Password</label>
            <div className="gate-pass-row">
              <input
                id="g-pass"
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Type-C"
                autoComplete="current-password"
                required
                style={{ width: '100%', paddingRight: '40px' }}
              />
              <button
                type="button"
                className="gate-eye-btn"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        </div>

        {err && (
          <div className="banner banner-error" style={{ marginBottom: '16px' }}>
            {err}
          </div>
        )}

        <button className="btn-primary" type="submit" disabled={busy} style={{ width: '100%', padding: '12px' }}>
          {busy ? 'Authenticating Terminal…' : 'Sign In to Studio Console →'}
        </button>
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

  const handleCopySql = () => {
    navigator.clipboard?.writeText(MIGRATION_SQL).then(() => {
      setSqlCopied(true)
      setTimeout(() => setSqlCopied(false), 3000)
    })
  }

  // Active view: 'dashboard' | 'print-ledger' | 'new-order'
  const [activeNav, setActiveNav] = useState('dashboard')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'card' | 'kanban'

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
    <div className="shell">
      {/* Studio Header & Command HUD */}
      <header className="app-header">
        <div className="header-brand-block">
          <div className="brand-spool-wrap">
            <SpoolMark className="brand-spool-logo" />
          </div>
          <div className="header-title-col">
            <div className="header-title-row">
              <span className="app-name">Layer<b>Ledger</b></span>
              <span className="studio-badge">Pyraxis Prints</span>
            </div>
            <div className="header-tagline">
              3D Print &amp; Finishing Production Console
            </div>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <nav className="mode-nav-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeNav === 'dashboard'}
            className={`mode-tab ${activeNav === 'dashboard' ? 'mode-tab-active' : ''}`}
            onClick={() => setActiveNav('dashboard')}
          >
            <span>📋</span> Painting Dashboard
            <span className="tab-badge">{dashboardStats.totalActive}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeNav === 'print-ledger'}
            className={`mode-tab ${activeNav === 'print-ledger' ? 'mode-tab-active' : ''}`}
            onClick={() => setActiveNav('print-ledger')}
          >
            <span>🖨️</span> Print Sales Ledger
            <span className="tab-badge teal">{deliveredSalesCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeNav === 'new-order'}
            className={`mode-tab ${activeNav === 'new-order' ? 'mode-tab-active' : ''}`}
            onClick={() => setActiveNav('new-order')}
          >
            <span>➕</span> New Order Intake
          </button>
        </nav>

        {/* Right Telemetry HUD & Operator Info */}
        <div className="header-meta-block">
          <div className="hud-stat-pill">
            <span className="hud-label">Total Revenue</span>
            <span className="hud-val">₹{money(total)}</span>
          </div>

          <div
            className="hud-stat-pill"
            title={`Filament: ${filamentMetrics.netGrams}g net + 10% misc (${filamentMetrics.miscGrams}g)`}
          >
            <span className="hud-label">Filament (+10%)</span>
            <span className="hud-val filament">{filamentMetrics.totalGrams} g</span>
          </div>

          <div className="operator-chip" title={`Operator: ${user?.user_metadata?.username || 'Thulasi'}`}>
            <div className="operator-avatar">
              {(user?.user_metadata?.username || 'T')[0].toUpperCase()}
            </div>
            <span>{user?.user_metadata?.username || 'Thulasi'}</span>
            <span className="connection-dot" title={isConfigured ? 'Live Cloud Sync' : 'Local Storage Mode'} />
          </div>

          <button
            type="button"
            className="signout-btn"
            onClick={onSignOut}
            title="Sign out of console"
          >
            ⇥
          </button>
        </div>
      </header>

      {/* Global Status Notifications */}
      {error && <div className="banner banner-error">{error}</div>}
      {warningBanner && (
        <div className="banner banner-warning">
          <div>
            ⚠️ {warningBanner}{' '}
            <code style={{ fontSize: '11px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
              001_order_management.sql
            </code>
          </div>
          <div className="banner-actions">
            <button type="button" className="banner-btn" onClick={handleCopySql}>
              {sqlCopied ? '✓ Copied SQL!' : '📋 Copy SQL'}
            </button>
            <button
              type="button"
              style={{ color: 'inherit', fontSize: '14px' }}
              onClick={() => setWarningBanner('')}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {successBanner && <div className="banner banner-success">✓ {successBanner}</div>}

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
            <div className="table-wrapper" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <SpoolMark className="brand-mark spinning" style={{ width: 44, height: 44, margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--muted)', fontSize: '13.5px', margin: 0 }}>Syncing studio production queue…</p>
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
        <DeliveredLedger
          sales={sales}
          onOpenOrder={(o) => setSelectedOrder(o)}
          onEditOrder={(o) => setEditingOrder(o)}
          onRemoveOrder={removeSale}
        />
      )}

      {/* VIEW 3: NEW ORDER INTAKE */}
      {activeNav === 'new-order' && (
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
      )}

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
