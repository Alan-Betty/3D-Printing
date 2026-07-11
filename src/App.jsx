import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase, isConfigured, BUCKET, SIGNED_URL_TTL } from './supabase'

const TABLE = 'sales'
/* single-account gate: username maps to a fixed synthetic email.
   the password is typed by the operator, never stored in this bundle. */
const EMAIL_DOMAIN = 'pyraxis-prints.app'
const toEmail = (u) => `${u.trim().toLowerCase()}@${EMAIL_DOMAIN}`
const sanitize = (name) => name.replace(/[^\w.\-]+/g, '_')

/* ---------- format helpers ---------- */
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

const fullDate = (ts) =>
  new Date(ts).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

/* turn stored storage paths into short-lived signed URLs */
async function enrich(rows) {
  return Promise.all(
    rows.map(async (r) => {
      let imageUrls = []
      if (r.images?.length) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(r.images, SIGNED_URL_TTL)
        imageUrls = (data || []).map((d) => d.signedUrl).filter(Boolean)
      }
      let modelFiles = []
      if (r.model_files?.length) {
        const paths = r.model_files.map((m) => m.path)
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrls(paths, SIGNED_URL_TTL)
        modelFiles = r.model_files.map((m, idx) => ({
          name: m.name,
          url: data?.[idx]?.signedUrl || null,
        }))
      }
      return { ...r, imageUrls, modelFiles }
    }),
  )
}

const friendly = (err) => {
  const msg = err?.message || String(err)
  if (/schema cache|does not exist|42P01/i.test(msg))
    return 'Database not set up. Run supabase/schema.sql in the SQL editor (see README).'
  if (/row-level security|permission|not authorized|403/i.test(msg))
    return 'Blocked by Row Level Security. Publish the policies from schema.sql (see README).'
  if (/bucket/i.test(msg))
    return 'Storage bucket "sales" missing. Run schema.sql to create it (see README).'
  return msg
}

/* ==================================================================
   ROOT — config check + auth gate
   ================================================================== */
export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!isConfigured) return <Setup />
  if (!authReady) return <Splash />
  if (!session) return <Login />
  return <Ledger user={session.user} />
}

function Splash() {
  return (
    <div className="splash">
      <SpoolMark className="empty-mark spinning" />
    </div>
  )
}

function Setup() {
  return (
    <div className="gate">
      <div className="gate-grid" aria-hidden="true" />
      <div className="gate-card">
        <div className="gate-hazard" aria-hidden="true" />
        <div className="gate-brand">
          <SpoolMark className="gate-mark" />
          <span>Pyraxis Prints</span>
        </div>
        <div className="gate-eyebrow">
          <LockIcon /> Setup required
        </div>
        <h1 className="gate-title">Connect<br />Supabase</h1>
        <p className="gate-sub">
          Add your Supabase URL and anon key, then reload. Two ways:
        </p>
        <ol className="setup-list">
          <li>
            Create <code>.env.local</code> with <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> (see <code>.env.example</code>), or
          </li>
          <li>
            paste them directly into <code>src/supabase.js</code>.
          </li>
        </ol>
        <p className="gate-sub" style={{ marginTop: 18 }}>
          Then run <code>supabase/schema.sql</code> in the Supabase SQL editor and
          create the operator user. Full steps in the README.
        </p>
        <div className="gate-foot">
          <span className="gate-dot" /> Find keys in Supabase → Project Settings → API
        </div>
      </div>
    </div>
  )
}

/* ==================================================================
   LOGIN — Authorized Personnel Only
   ================================================================== */
function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return setErr('Enter username and password.')
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({
      email: toEmail(username),
      password,
    })
    if (error) {
      const msg = error.message || ''
      setErr(
        /disabled|not enabled/i.test(msg)
          ? 'Email sign-in is disabled in Supabase (see README).'
          : /rate|too many/i.test(msg)
            ? 'Too many attempts. Wait a moment and retry.'
            : 'Access denied — credentials not recognized.',
      )
      setBusy(false)
    }
    // success → onAuthStateChange swaps in the ledger
  }

  return (
    <div className="gate">
      <div className="gate-grid" aria-hidden="true" />
      <form className="gate-card" onSubmit={submit}>
        <div className="gate-hazard" aria-hidden="true" />
        <div className="gate-brand">
          <SpoolMark className="gate-mark" />
          <span>Pyraxis Prints</span>
        </div>

        <div className="gate-eyebrow">
          <LockIcon /> Restricted terminal
        </div>
        <h1 className="gate-title">Authorized<br />Personnel Only</h1>
        <p className="gate-sub">Sign in to access the sales ledger.</p>

        <label htmlFor="g-user">Username</label>
        <input
          id="g-user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Rick Astley"
          autoComplete="off"
          autoCapitalize="off"
          autoFocus
        />

        <label htmlFor="g-pass">Password</label>
        <div className="gate-passwrap">
          <input
            id="g-pass"
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <button
            type="button"
            className="gate-eye"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {err && <div className="gate-err">{err}</div>}

        <button className="gate-btn" type="submit" disabled={busy}>
          {busy ? (
            <>
              <SpinIcon /> Verifying…
            </>
          ) : (
            <>
              Authenticate <ArrowIcon />
            </>
          )}
        </button>

        <div className="gate-foot">
          <span className="gate-dot" /> Secured by Supabase Auth · access is logged
        </div>
      </form>
    </div>
  )
}

/* ==================================================================
   LEDGER — the app (authed)
   ================================================================== */
function Ledger({ user }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query_, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const loadSales = async () => {
    const { data, error: e } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
    if (e) {
      setError(friendly(e))
      setLoading(false)
      return
    }
    setSales(await enrich(data || []))
    setError('')
    setLoading(false)
  }

  useEffect(() => {
    loadSales()
    const channel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE },
        () => loadSales(),
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = useMemo(
    () => sales.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
    [sales],
  )
  const avg = sales.length ? total / sales.length : 0
  const best = sales.reduce((m, s) => Math.max(m, Number(s.price) || 0), 0)
  const zFill = best ? Math.min(100, (avg / best) * 100) : 0

  const filtered = useMemo(() => {
    const t = query_.trim().toLowerCase()
    if (!t) return sales
    return sales.filter(
      (s) =>
        s.item?.toLowerCase().includes(t) || s.customer?.toLowerCase().includes(t),
    )
  }, [sales, query_])

  const removeSale = async (sale) => {
    setSelected(null)
    // optimistic removal
    setSales((prev) => prev.filter((s) => s.id !== sale.id))
    try {
      const paths = [
        ...(sale.images || []),
        ...(sale.model_files || []).map((m) => m.path),
      ].filter(Boolean)
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
      const { error: e } = await supabase.from(TABLE).delete().eq('id', sale.id)
      if (e) throw e
    } catch (e) {
      setError(`Could not delete: ${friendly(e)}`)
      loadSales()
    }
  }

  return (
    <div className="shell">
      <Masthead count={sales.length} loading={loading} error={!!error} user={user} />

      {error && <div className="banner">{error}</div>}

      <section className="console" aria-label="Sales summary">
        <div className="cell">
          <div className="cell-label">
            <SpoolDot /> Total revenue
          </div>
          <div className="cell-value big">
            <span className="cur">₹</span>
            {money(total)}
          </div>
          <div className="cell-sub">{sales.length} deposits logged</div>
        </div>

        <div className="cell">
          <div className="cell-label">Avg sale · build height</div>
          <div className="cell-value mid" style={{ color: 'var(--teal)' }}>
            ₹{money(avg)}
          </div>
          <div className="cell-sub">vs. best ₹{money(best)}</div>
          <div className="zbar" aria-hidden="true">
            <div className="zbar-fill" style={{ height: `${zFill}%` }} />
          </div>
        </div>

        <div className="cell">
          <div className="cell-label">Top layer</div>
          <div className="cell-value mid">₹{money(best)}</div>
          <div className="cell-sub">highest single sale</div>
        </div>
      </section>

      <SaleForm onError={setError} onSaved={loadSales} />

      <div className="ledger-bar">
        <div className="ledger-title">
          Ledger <span>/ {filtered.length} layers</span>
        </div>
        <div className="search">
          <SearchIcon />
          <input
            value={query_}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="filter item or customer"
            aria-label="Filter sales"
          />
        </div>
      </div>

      {loading ? (
        <div className="empty">
          <SpoolMark className="empty-mark spinning" />
          <p>Connecting to workshop…</p>
        </div>
      ) : filtered.length === 0 ? (
        <Empty hasSales={sales.length > 0} />
      ) : (
        <div className="stack">
          {filtered.map((s, i) => (
            <SaleRow
              key={s.id}
              sale={s}
              idx={filtered.length - i}
              onOpen={() => setSelected(s)}
              onRemove={() => removeSale(s)}
            />
          ))}
        </div>
      )}

      {selected && (
        <Detail
          sale={selected}
          onClose={() => setSelected(null)}
          onRemove={() => removeSale(selected)}
        />
      )}
    </div>
  )
}

/* ---------- masthead ---------- */
function Masthead({ count, loading, error, user }) {
  const name = (user?.email || '').split('@')[0]
  const display = name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Operator'
  return (
    <header className="masthead">
      <div className="brand">
        <SpoolMark />
        <div>
          <h1 className="brand-name">
            Layer<b>Ledger</b>
          </h1>
          <div className="brand-tag">Pyraxis Prints · deposited layer by layer</div>
        </div>
      </div>
      <div className="masthead-right">
        <div className="masthead-meta">
          <div className={error ? 'live off' : 'live'}>
            <span className="dot" />
            {error ? 'offline' : loading ? 'syncing…' : `${count} layers on plate`}
          </div>
          <div className="whoami">{display}</div>
        </div>
        <button
          className="signout"
          onClick={() => supabase.auth.signOut()}
          title="Sign out"
        >
          <SignOutIcon />
        </button>
      </div>
    </header>
  )
}

/* ---------- form ---------- */
const MODEL_EXT = '.stl,.3mf,.obj,.gcode,.step,.stp,.zip'

/* reusable drag-and-drop + browse zone (optional camera source) */
function DropField({ accept, multiple = true, camera = false, hasItems, idleText, onAdd }) {
  const fileRef = useRef(null)
  const camRef = useRef(null)
  const [drag, setDrag] = useState(false)

  const pick = (list, el) => {
    onAdd(list)
    if (el) el.value = '' // allow re-picking the same file
  }
  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer?.files?.length) onAdd(e.dataTransfer.files)
  }
  const browse = () => fileRef.current?.click()

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => pick(e.target.files, e.target)}
      />
      {camera && (
        <input
          ref={camRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => pick(e.target.files, e.target)}
        />
      )}
      <div
        className={`dropzone ${drag ? 'over' : ''} ${hasItems ? 'has' : ''}`}
        onClick={browse}
        onKeyDown={(e) =>
          (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), browse())
        }
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDrag(false)
        }}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
      >
        <UploadIcon />
        <div className="dz-text">
          <span className="dz-main">{drag ? 'Drop to add' : idleText}</span>
          <span className="dz-sub">Drag &amp; drop, or click to browse — multiple ok</span>
        </div>
        {camera && (
          <button
            type="button"
            className="dz-cam"
            onClick={(e) => {
              e.stopPropagation()
              camRef.current?.click()
            }}
          >
            <CameraIcon /> Camera
          </button>
        )}
      </div>
    </>
  )
}

function SaleForm({ onError, onSaved }) {
  const [item, setItem] = useState('')
  const [customer, setCustomer] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')
  const [weight, setWeight] = useState('')
  const [printType, setPrintType] = useState('regular')
  const [modelFiles, setModelFiles] = useState([])
  const [images, setImages] = useState([])
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)

  const previews = useMemo(
    () => images.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    [images],
  )
  useEffect(
    () => () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
    [previews],
  )

  const priceNum = Number(price)
  const valid =
    item.trim() && customer.trim() && price !== '' && !Number.isNaN(priceNum) && priceNum >= 0

  const bad = (v) => (touched && !String(v).trim() ? 'err' : '')

  const onlyImages = (files) => files.filter((f) => f.type.startsWith('image/'))
  const addImages = (list) => {
    const arr = onlyImages(Array.from(list || []))
    if (arr.length) setImages((prev) => [...prev, ...arr])
  }
  const addModels = (list) => {
    const arr = Array.from(list || [])
    if (arr.length) setModelFiles((prev) => [...prev, ...arr])
  }

  const reset = () => {
    setItem('')
    setCustomer('')
    setQty('1')
    setPrice('')
    setWeight('')
    setPrintType('regular')
    setModelFiles([])
    setImages([])
    setTouched(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return setTouched(true)
    setBusy(true)
    onError('')
    try {
      const id = crypto.randomUUID()

      const modelMetas = []
      for (let i = 0; i < modelFiles.length; i++) {
        const f = modelFiles[i]
        const path = `${id}/model_${i}_${sanitize(f.name)}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, f)
        if (error) throw error
        modelMetas.push({ path, name: f.name })
      }

      const imagePaths = []
      for (let i = 0; i < images.length; i++) {
        const f = images[i]
        const path = `${id}/img_${i}_${sanitize(f.name)}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, f)
        if (error) throw error
        imagePaths.push(path)
      }

      const { error } = await supabase.from(TABLE).insert({
        id,
        item: item.trim(),
        customer: customer.trim(),
        qty: Math.max(1, Math.round(Number(qty) || 1)),
        price: priceNum,
        weight_g: weight === '' ? null : Number(weight),
        print_type: printType,
        model_files: modelMetas,
        images: imagePaths,
      })
      if (error) throw error

      reset()
      onSaved()
    } catch (err) {
      onError(`Save failed: ${friendly(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="log" onSubmit={submit} noValidate>
      <div className="log-head">Log a sale</div>

      <div className="grid">
        <div className={`field col-6 ${bad(item)}`}>
          <label htmlFor="f-item">Item printed</label>
          <input
            id="f-item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Articulated dragon"
          />
        </div>

        <div className={`field col-6 ${bad(customer)}`}>
          <label htmlFor="f-customer">Customer</label>
          <input
            id="f-customer"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Jordan R."
          />
        </div>

        <div className="field col-3">
          <label htmlFor="f-qty">Qty ordered</label>
          <div className="unit-wrap pcs">
            <input
              id="f-qty"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              type="number"
              min="1"
              step="1"
              placeholder="1"
            />
          </div>
        </div>

        <div className={`field col-3 ${touched && !valid && price === '' ? 'err' : ''}`}>
          <label htmlFor="f-price">Price sold</label>
          <div className="unit-wrap rupee">
            <input
              id="f-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="field col-3">
          <label htmlFor="f-weight">Print weight</label>
          <div className="unit-wrap gram">
            <input
              id="f-weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              inputMode="decimal"
              type="number"
              min="0"
              step="1"
            />
          </div>
        </div>

        <div className="field col-3">
          <label>Print speed</label>
          <div className="seg" role="radiogroup" aria-label="Print speed">
            <button
              type="button"
              role="radio"
              aria-checked={printType === 'regular'}
              className={printType === 'regular' ? 'on' : ''}
              onClick={() => setPrintType('regular')}
            >
              Regular
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={printType === 'express'}
              className={printType === 'express' ? 'on express' : 'express'}
              onClick={() => setPrintType('express')}
            >
              <BoltIcon /> Express
            </button>
          </div>
        </div>

        <div className="field col-12">
          <label>Model files — optional</label>
          <DropField
            accept={MODEL_EXT}
            hasItems={modelFiles.length > 0}
            idleText="Drop STL / 3MF / OBJ / G-code here"
            onAdd={addModels}
          />
          {modelFiles.length > 0 && (
            <div className="file-chips">
              {modelFiles.map((f, i) => (
                <div className="fchip" key={i}>
                  <FileIcon />
                  <span>{f.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setModelFiles((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="field col-12">
          <label>Final product photos — optional</label>
          <DropField
            accept="image/*"
            camera
            hasItems={previews.length > 0}
            idleText="Drop photos of the finished print here"
            onAdd={addImages}
          />
          {previews.length > 0 && (
            <div className="thumbs">
              {previews.map((p, i) => (
                <div className="thumb" key={i}>
                  <img src={p.url} alt={p.name} />
                  <button
                    type="button"
                    className="thumb-x"
                    aria-label={`Remove ${p.name}`}
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="form-foot">
        <span className={`hint ${touched && !valid ? 'warn' : ''}`}>
          {touched && !valid
            ? 'Item, customer, and price are required.'
            : 'Files upload to Supabase Storage · record saved to Postgres.'}
        </span>
        <button className="deposit" type="submit" disabled={busy}>
          {busy ? (
            <>
              <SpinIcon /> Depositing…
            </>
          ) : (
            <>
              <PlusIcon /> Deposit layer
            </>
          )}
        </button>
      </div>
    </form>
  )
}

/* ---------- ledger row ---------- */
function SaleRow({ sale, idx, onOpen, onRemove }) {
  const ts = tsMillis(sale)
  const shots = sale.imageUrls?.length || 0
  const qty = sale.qty || 1
  return (
    <article className="layer" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpen())}
    >
      <div className="layer-idx">
        <span className="striate" />
        {String(idx).padStart(2, '0')}
      </div>

      <div className="layer-main">
        <div className="layer-item" title={sale.item}>
          {sale.item}
          {qty > 1 && <span className="qty-pill">×{qty}</span>}
          {sale.print_type === 'express' && (
            <span className="badge exp">
              <BoltIcon /> Express
            </span>
          )}
        </div>
        <div className="layer-meta">
          <span className="who">{sale.customer}</span>
          {sale.weight_g != null && (
            <>
              <span className="sep">·</span>
              <span>{sale.weight_g} g</span>
            </>
          )}
          {shots > 0 && (
            <>
              <span className="sep">·</span>
              <span className="tag">
                <PhotoIcon /> {shots}
              </span>
            </>
          )}
          {sale.model_files?.length > 0 && (
            <>
              <span className="sep">·</span>
              <span className="tag">
                <FileIcon /> {sale.model_files.length}{' '}
                {sale.model_files.length > 1 ? 'files' : 'file'}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="layer-right">
        <div>
          <div className="layer-price">
            <span className="c">₹</span>
            {money(sale.price)}
          </div>
          <div className="layer-date">{relTime(ts)}</div>
        </div>
        <button
          className="kill"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Remove sale: ${sale.item}`}
          title="Remove"
        >
          <TrashIcon />
        </button>
      </div>
    </article>
  )
}

/* ---------- detail modal ---------- */
function Detail({ sale, onClose, onRemove }) {
  const imgs = sale.imageUrls || []
  const [active, setActive] = useState(imgs[0] || null)
  const ts = tsMillis(sale)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="sheet-x" onClick={onClose} aria-label="Close">
          <XIcon />
        </button>

        <div className="sheet-head">
          <div className="sheet-eyebrow">
            {sale.print_type === 'express' ? (
              <span className="badge exp">
                <BoltIcon /> Express print
              </span>
            ) : (
              <span className="badge reg">Regular print</span>
            )}
            <span className="sheet-time">{fullDate(ts)}</span>
          </div>
          <h2 className="sheet-title">{sale.item}</h2>
        </div>

        {imgs.length > 0 && (
          <div className="gallery">
            <div className="gallery-main">
              <img src={active || imgs[0]} alt={sale.item} />
            </div>
            {imgs.length > 1 && (
              <div className="gallery-strip">
                {imgs.map((u, i) => (
                  <button
                    key={i}
                    className={`gthumb ${active === u ? 'on' : ''}`}
                    onClick={() => setActive(u)}
                  >
                    <img src={u} alt={`${sale.item} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="specs">
          <Spec label="Customer" value={sale.customer} />
          <Spec label="Qty ordered" value={`${sale.qty || 1} pcs`} />
          <Spec label="Price sold" value={`₹${money(sale.price)}`} accent />
          <Spec label="Print weight" value={sale.weight_g != null ? `${sale.weight_g} g` : '—'} />
          <Spec
            label="Print speed"
            value={sale.print_type === 'express' ? 'Express' : 'Regular'}
          />
        </div>

        {(sale.modelFiles?.length || 0) > 0 && (
          <div className="file-list">
            {sale.modelFiles.map((m, i) => (
              <a
                key={i}
                className="file-btn"
                href={m.url || undefined}
                target="_blank"
                rel="noreferrer noopener"
              >
                <FileIcon />
                <span className="fname">{m.name}</span>
                <span className="fopen">View ↗</span>
              </a>
            ))}
          </div>
        )}

        <div className="sheet-actions">
          {(sale.modelFiles?.length || 0) === 0 && (
            <div className="file-btn ghost">
              <FileIcon /> No model files attached
            </div>
          )}
          <button className="del-btn" onClick={onRemove}>
            <TrashIcon /> Delete sale
          </button>
        </div>
      </div>
    </div>
  )
}

function Spec({ label, value, accent }) {
  return (
    <div className="spec">
      <div className="spec-label">{label}</div>
      <div className={`spec-value ${accent ? 'accent' : ''}`}>{value}</div>
    </div>
  )
}

function Empty({ hasSales }) {
  return (
    <div className="empty">
      <SpoolMark className="empty-mark" />
      <h3>{hasSales ? 'No layers match that filter' : 'The build plate is empty'}</h3>
      <p>
        {hasSales
          ? 'Clear the filter to see every sale.'
          : 'Log your first sale above to start the stack.'}
      </p>
    </div>
  )
}

/* ---------- icons ---------- */
function SpoolMark({ className = 'brand-mark' }) {
  return (
    <svg className={className} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="13" stroke="#FF6B35" strokeWidth="3" />
      <circle cx="22" cy="22" r="4.6" fill="#41E0B3" />
      <path d="M22 6a16 16 0 0 1 11.3 4.7" stroke="#FF6B35" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}
function SpoolDot() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden="true">
      <circle cx="4.5" cy="4.5" r="4" fill="#FF6B35" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="15" height="15">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function BoltIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" width="11" height="11">
      <path d="M7 1 2.5 6.8H5.5L5 11l4.5-5.8H6.5L7 1Z" fill="currentColor" />
    </svg>
  )
}
function FileIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" width="13" height="13">
      <path d="M3 1.5h5L11 4.5V12.5H3V1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8 1.5V5h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
function PhotoIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" width="13" height="13">
      <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5" cy="6" r="1.1" fill="currentColor" />
      <path d="m2.5 10 3-3 2.5 2.5L10 8l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}
function CameraIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="14" height="14">
      <path d="M2 5.5h2l1-1.5h4l1 1.5h2a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="8" cy="8.8" r="2.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
function UploadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" width="20" height="20">
      <path d="M10 13V4M6.5 7.5 10 4l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 12.5V15a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.2 9.2 12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" width="14" height="14">
      <path d="M2.5 3.5h9M5 3.5V2.5h4v1M4 3.5l.5 8h5l.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function XIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" aria-hidden="true" width="11" height="11">
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
function SpinIcon() {
  return (
    <svg className="spin" viewBox="0 0 16 16" fill="none" aria-hidden="true" width="15" height="15">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden="true" width="12" height="12">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}
function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="15" height="15">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="15" height="15">
      <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="15" height="15">
      <path d="M6 3.8A6.5 6.5 0 0 1 8 3.5c4 0 6.5 4.5 6.5 4.5a12 12 0 0 1-1.8 2.3M4 4.8A11.6 11.6 0 0 0 1.5 8S4 12.5 8 12.5a6.4 6.4 0 0 0 2.4-.45M2 2l12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
function SignOutIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="15" height="15">
      <path d="M6 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H6M10 5l3 3-3 3M13 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
