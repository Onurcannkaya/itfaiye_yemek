import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getStoredConfig, saveConfig, clearConfig, createSupabase, PERSONNEL_SEED, SQL_SCHEMA, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from './lib/supabase'

// ── Helpers ──────────────────────────────────────────
const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const DAYS_TR = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi']
const COST_KEY = 'itfaiye_daily_cost'

function fmtDate(d) { return d.toISOString().split('T')[0] }
function fmtDateTR(d) { return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}, ${DAYS_TR[d.getDay()]}` }
function getCost() { return parseInt(localStorage.getItem(COST_KEY)) || 180 }
function setCost(v) { localStorage.setItem(COST_KEY, String(v)) }

const cardV = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }
const listV = { hidden: {}, visible: { transition: { staggerChildren: 0.035 } } }
const modalV = { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.92 } }

// ── Toast ────────────────────────────────────────────
function Toast({ toast, onClose }) {
  useEffect(() => { if (toast) { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) } }, [toast, onClose])
  const colors = { success: 'bg-emerald-600', error: 'bg-red-600', warning: 'bg-amber-600', info: 'bg-sky-600' }
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }
  return (
    <AnimatePresence>
      {toast && (
        <motion.div initial={{ opacity: 0, y: -30, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -30, x: '-50%' }}
          className="fixed top-4 left-1/2 z-[100] max-w-md w-[90%]">
          <div className={`${colors[toast.type]||'bg-slate-700'} text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3`}>
            <span className="text-lg font-bold">{icons[toast.type]||'ℹ'}</span>
            <span className="text-sm font-medium flex-1">{toast.msg}</span>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">&times;</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Logo ─────────────────────────────────────────────
function Logo({ src, fallback, alt }) {
  const [err, setErr] = useState(false)
  if (err || !src) return (
    <div className="w-14 h-14 rounded-full bg-slate-700/60 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">{fallback}</div>
  )
  return (
    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shrink-0 shadow-lg shadow-white/10 border border-white/30 overflow-hidden p-0.5">
      <img src={src} alt={alt} onError={() => setErr(true)} className="w-full h-full object-contain rounded-full" />
    </div>
  )
}

// ── SupaConnect Modal ────────────────────────────────
function SupaConnectModal({ onConnect, onClose, hasExisting }) {
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState(null)
  const [showSQL, setShowSQL] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const cfg = getStoredConfig()
    if (cfg) { setUrl(cfg.url || ''); setKey(cfg.anonKey || '') }
  }, [])

  const testConn = async () => {
    if (!url.trim() || !key.trim()) { setResult({ ok: false, msg: 'URL ve Key boş olamaz.' }); return }
    setTesting(true); setResult(null)
    try {
      const sb = createSupabase(url.trim(), key.trim())
      const { data, error } = await sb.from('personnel').select('id').limit(1)
      if (error) throw error
      setResult({ ok: true, msg: 'Bağlantı başarılı!' })
    } catch (e) {
      const msg = e?.code === '42P01' ? 'Tablolar bulunamadı. SQL şemasını çalıştırın.' : `Hata: ${e?.message || 'Bilinmeyen'}`
      setResult({ ok: false, msg })
    }
    setTesting(false)
  }

  const connect = () => { saveConfig(url.trim(), key.trim()); onConnect(url.trim(), key.trim()) }
  const copySQL = () => { navigator.clipboard.writeText(SQL_SCHEMA); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div variants={modalV} initial="hidden" animate="visible" exit="exit" className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><span className="text-2xl">🔗</span> Supabase Bağlantısı</h2>
          {hasExisting && <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">Supabase URL</label>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://xxxxx.supabase.co"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none transition text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-400 mb-1.5 block">Anon Key</label>
            <input value={key} onChange={e => setKey(e.target.value)} placeholder="eyJhbGciOi..."
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none transition text-sm font-mono" type="password" />
          </div>

          {result && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-xl text-sm font-medium ${result.ok ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/50' : 'bg-red-900/40 text-red-400 border border-red-700/50'}`}>
              {result.ok ? '✓' : '✕'} {result.msg}
            </motion.div>
          )}

          <div className="flex gap-3">
            <button onClick={testConn} disabled={testing}
              className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition disabled:opacity-50 active:scale-95">
              {testing ? '⏳ Test ediliyor...' : '🔍 Bağlantıyı Test Et'}
            </button>
            <button onClick={connect} disabled={!result?.ok}
              className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-95">
              🚀 Bağlan
            </button>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-700">
          <button onClick={() => setShowSQL(!showSQL)} className="text-sm text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1.5">
            <span>{showSQL ? '▼' : '▶'}</span> SQL Şeması {showSQL ? 'Gizle' : 'Göster'}
          </button>
          {showSQL && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
              <div className="relative">
                <pre className="bg-slate-950 rounded-xl p-4 text-xs text-slate-300 overflow-x-auto max-h-64 font-mono whitespace-pre-wrap border border-slate-800">{SQL_SCHEMA}</pre>
                <button onClick={copySQL} className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-white font-medium transition">
                  {copied ? '✓ Kopyalandı' : '📋 Kopyala'}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Bu SQL'i Supabase Dashboard → SQL Editor'de çalıştırın.</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Personnel Modal ──────────────────────────────────
function PersonnelModal({ supabase, personnel, onClose, refresh, showToast }) {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editingId) {
        const { error } = await supabase.from('personnel').update({ name: name.trim(), title: title.trim() || null }).eq('id', editingId)
        if (error) throw error
        showToast('Personel güncellendi', 'success')
      } else {
        const maxOrder = personnel.length > 0 ? Math.max(...personnel.map(p => p.order_index)) : 0
        const { error } = await supabase.from('personnel').insert({ name: name.trim(), title: title.trim() || null, order_index: maxOrder + 1 })
        if (error) throw error
        showToast('Yeni personel eklendi', 'success')
      }
      setName(''); setTitle(''); setEditingId(null)
      await refresh()
    } catch (err) { showToast(`Hata: ${err.message}`, 'error') }
    setLoading(false)
  }

  const handleEdit = (p) => {
    setEditingId(p.id)
    setName(p.name)
    setTitle(p.title || '')
  }

  const handleDelete = async (id, pName) => {
    if (!window.confirm(`"${pName}" silinecek. Emin misiniz?`)) return
    setLoading(true)
    try {
      const { error } = await supabase.from('personnel').delete().eq('id', id)
      if (error) throw error
      showToast('Personel silindi', 'success')
      await refresh()
    } catch (err) { showToast(`Hata: ${err.message}`, 'error') }
    setLoading(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div variants={modalV} initial="hidden" animate="visible" exit="exit" className="bg-card rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-border max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="text-xl font-bold text-text-main flex items-center gap-2"><span className="text-2xl">👥</span> Personel Yönetimi</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-main text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSave} className="mb-4 bg-surface rounded-2xl p-4 border border-border shrink-0">
          <div className="flex gap-2">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad" required
              className="flex-1 px-3 py-2 rounded-xl bg-card border border-border text-text-main focus:border-sky-500 focus:outline-none transition text-sm" />
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Unvan (Opsiyonel)"
              className="w-32 px-3 py-2 rounded-xl bg-card border border-border text-text-main focus:border-sky-500 focus:outline-none transition text-sm" />
          </div>
          <div className="flex gap-2 mt-3">
            <button type="submit" disabled={loading || !name.trim()}
              className="flex-1 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition disabled:opacity-50">
              {loading ? '⏳' : editingId ? 'Kaydet' : '➕ Ekle'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setName(''); setTitle('') }}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition">
                İptal
              </button>
            )}
          </div>
        </form>

        <div className="flex-1 overflow-y-auto min-h-[50vh] pr-2 space-y-2">
          {personnel.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-3">
                <span className="text-text-muted font-bold text-xs w-5">{i+1}.</span>
                <div>
                  <div className="font-semibold text-text-main text-sm">{p.name}</div>
                  {p.title && <div className="text-[10px] text-sky-500 font-bold uppercase">{p.title}</div>}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg bg-card border border-border text-text-muted hover:text-sky-400 transition" title="Düzenle">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 rounded-lg bg-card border border-border text-text-muted hover:text-red-400 transition" title="Sil">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Date Navigator ───────────────────────────────────
function DateNavigator({ date, onChange }) {
  const isToday = fmtDate(date) === fmtDate(new Date())
  const shift = (n) => { const d = new Date(date); d.setDate(d.getDate() + n); onChange(d) }

  return (
    <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
      <button onClick={() => shift(-1)} className="w-11 h-11 rounded-xl bg-card hover:bg-surface text-text-main flex items-center justify-center transition active:scale-90 border border-border text-lg">‹</button>
      <div className="relative">
        <input type="date" value={fmtDate(date)} onChange={e => onChange(new Date(e.target.value + 'T12:00:00'))}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
        <div className={`px-5 py-2.5 rounded-xl font-semibold text-sm cursor-pointer border transition ${isToday ? 'bg-fire/10 border-fire/40 text-fire-glow' : 'bg-card border-border text-text-main'}`}>
          📅 {fmtDateTR(date)}
        </div>
      </div>
      <button onClick={() => shift(1)} className="w-11 h-11 rounded-xl bg-card hover:bg-surface text-text-main flex items-center justify-center transition active:scale-90 border border-border text-lg">›</button>
      {!isToday && (
        <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} onClick={() => onChange(new Date())}
          className="px-4 py-2.5 rounded-xl bg-fire/20 border border-fire/40 text-fire-glow text-sm font-bold hover:bg-fire/30 transition active:scale-95">
          Bugün
        </motion.button>
      )}
    </div>
  )
}

// ── Stats Bar ────────────────────────────────────────
function StatsBar({ personnel, payments }) {
  const total = personnel.length
  const paidCount = payments.filter(p => p.status === 'paid').length
  const unpaidCount = payments.filter(p => p.status === 'unpaid').length
  const totalDebt = payments.filter(p => p.status === 'unpaid').reduce((s, p) => s + Number(p.amount), 0)
  const hasPayments = payments.length > 0

  return (
    <div className="grid grid-cols-4 gap-2.5 mb-6">
      <motion.div whileHover={{ scale: 1.03 }} className="bg-card rounded-2xl p-3.5 text-center border border-border">
        <div className="text-2xl font-extrabold text-text-main">{total}</div>
        <div className="text-[11px] text-text-muted font-medium mt-0.5">Personel</div>
      </motion.div>
      <motion.div whileHover={{ scale: 1.03 }} className="bg-card rounded-2xl p-3.5 text-center border border-border">
        <div className="text-2xl font-extrabold text-red-500">{unpaidCount}</div>
        <div className="text-[11px] text-text-muted font-medium mt-0.5">Borçlu</div>
      </motion.div>
      <motion.div whileHover={{ scale: 1.03 }} className="bg-card rounded-2xl p-3.5 text-center border border-border">
        <div className="text-2xl font-extrabold text-emerald-500">{paidCount}</div>
        <div className="text-[11px] text-text-muted font-medium mt-0.5">Ödendi</div>
      </motion.div>
      <motion.div whileHover={{ scale: 1.03 }} className="bg-card rounded-2xl p-3.5 text-center border border-border">
        <div className="text-2xl font-extrabold text-amber-500">{hasPayments ? `${totalDebt.toLocaleString('tr-TR')}` : '—'}</div>
        <div className="text-[11px] text-text-muted font-medium mt-0.5">Bakiye ₺</div>
      </motion.div>
    </div>
  )
}

// ── Personnel Card ───────────────────────────────────
function PersonnelCard({ person, payment, onToggle, idx }) {
  const isPaid = payment?.status === 'paid'
  const hasPayment = !!payment

  return (
    <motion.div variants={cardV} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
      onClick={() => hasPayment && onToggle(person.id, payment)}
      className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
        !hasPayment ? 'bg-surface border-border opacity-50' :
        isPaid ? 'bg-card-paid border-border-paid hover:border-paid' :
        'bg-card-unpaid border-border-unpaid hover:border-fire'
      }`}
      role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && hasPayment && onToggle(person.id, payment)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${
            !hasPayment ? 'bg-card border-border text-text-muted' : isPaid ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-300'
          }`}>{idx + 1}</div>
          <div className="min-w-0">
            <div className="font-semibold text-text-main text-[15px] truncate">{person.name}</div>
            {person.title && (
              <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                person.title === 'Başçavuş' ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30' : 'bg-sky-600/20 text-sky-400 border border-sky-600/30'
              }`}>{person.title}</span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {!hasPayment ? (
            <span className="text-text-muted text-sm">—</span>
          ) : isPaid ? (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Ödendi
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-red-600 dark:text-red-400">{Number(payment.amount).toLocaleString('tr-TR')} ₺</span>
              <div className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main App ─────────────────────────────────────────
export default function App() {
  const [supabase, setSupabase] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showPersonnel, setShowPersonnel] = useState(false)
  const [personnel, setPersonnel] = useState([])
  const [payments, setPayments] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [dailyCost, setDailyCost] = useState(getCost)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [isLightMode, setIsLightMode] = useState(() => localStorage.getItem('itfaiye_theme') === 'light')

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light')
      localStorage.setItem('itfaiye_theme', 'light')
    } else {
      document.documentElement.classList.remove('light')
      localStorage.setItem('itfaiye_theme', 'dark')
    }
  }, [isLightMode])

  const show = useCallback((msg, type = 'success') => setToast({ msg, type }), [])

  // ── Init: auto-connect with defaults or stored config ──
  useEffect(() => {
    const cfg = getStoredConfig()
    const url = cfg?.url || DEFAULT_SUPABASE_URL
    const key = cfg?.anonKey || DEFAULT_SUPABASE_ANON_KEY
    if (url && key) {
      const sb = createSupabase(url, key)
      setSupabase(sb)
      if (!cfg) saveConfig(url, key)
    } else {
      setShowSettings(true)
      setLoading(false)
    }
  }, [])

  const fetchPersonnel = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      let { data, error } = await supabase.from('personnel').select('*').order('order_index')
      if (error) throw error
      if (!data || data.length === 0) {
        const { error: seedErr } = await supabase.from('personnel').insert(PERSONNEL_SEED)
        if (seedErr) throw seedErr
        const res = await supabase.from('personnel').select('*').order('order_index')
        data = res.data
      }
      setPersonnel(data || [])
    } catch (e) {
      show(`Personel yüklenemedi: ${e.message}`, 'error')
      setShowSettings(true)
    }
    setLoading(false)
  }, [supabase, show])

  // ── Load personnel when supabase connects ──
  useEffect(() => {
    fetchPersonnel()
  }, [fetchPersonnel])

  // ── Fetch payments when date changes ──
  useEffect(() => {
    if (!supabase || personnel.length === 0) return
    fetchPayments()
  }, [supabase, selectedDate, personnel])

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase.from('payments').select('*').eq('payment_date', fmtDate(selectedDate))
      if (error) throw error
      setPayments(data || [])
    } catch (e) { show('Ödemeler yüklenemedi', 'error') }
  }

  const handleConnect = (url, key) => {
    const sb = createSupabase(url, key)
    setSupabase(sb)
    setShowSettings(false)
  }

  const handleDisconnect = () => {
    clearConfig()
    setSupabase(null)
    setPersonnel([])
    setPayments([])
    setShowSettings(true)
    show('Bağlantı kesildi', 'info')
  }

  const bulkCharge = async () => {
    if (actionLoading) return
    setActionLoading(true)
    try {
      const dateStr = fmtDate(selectedDate)
      const { data: existing } = await supabase.from('payments').select('id').eq('payment_date', dateStr).limit(1)
      if (existing && existing.length > 0) {
        if (!window.confirm('Bu gün için zaten kayıt var. Mevcut kayıtları silip tekrar borçlandırmak istiyor musunuz?')) {
          setActionLoading(false); return
        }
        await supabase.from('payments').delete().eq('payment_date', dateStr)
      }
      const cost = parseInt(dailyCost) || 180
      const records = personnel.map(p => ({ person_id: p.id, amount: cost, status: 'unpaid', payment_date: dateStr }))
      const { error } = await supabase.from('payments').insert(records)
      if (error) throw error
      await fetchPayments()
      show(`${personnel.length} kişi borçlandırıldı (${cost} ₺)`, 'success')
    } catch (e) { show(`Hata: ${e.message}`, 'error') }
    setActionLoading(false)
  }

  const clearAll = async () => {
    if (actionLoading) return
    const dateStr = fmtDate(selectedDate)
    const { data: existing } = await supabase.from('payments').select('id').eq('payment_date', dateStr).limit(1)
    
    if (!existing || existing.length === 0) {
      show('Bu gün için temizlenecek kayıt yok.', 'info')
      return
    }

    if (!window.confirm(`${fmtDateTR(selectedDate)} tarihindeki tüm kayıtları silmek istediğinize emin misiniz?`)) return
    
    setActionLoading(true)
    try {
      const { error } = await supabase.from('payments').delete().eq('payment_date', dateStr)
      if (error) throw error
      await fetchPayments()
      show('Tüm kayıtlar temizlendi.', 'success')
    } catch (e) {
      show(`Hata: ${e.message}`, 'error')
    }
    setActionLoading(false)
  }

  const togglePayment = async (personId, payment) => {
    const newStatus = payment.status === 'paid' ? 'unpaid' : 'paid'
    setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: newStatus } : p))
    const { error } = await supabase.from('payments').update({ status: newStatus }).eq('id', payment.id)
    if (error) {
      setPayments(prev => prev.map(p => p.id === payment.id ? { ...p, status: payment.status } : p))
      show('Güncelleme başarısız!', 'error')
    } else {
      const person = personnel.find(p => p.id === personId)
      show(newStatus === 'paid' ? `${person?.name} — ödendi ✓` : `${person?.name} — borç eklendi`, newStatus === 'paid' ? 'success' : 'warning')
    }
  }

  const copyDebtors = () => {
    const debtors = personnel.filter(p => {
      const pay = payments.find(pm => pm.person_id === p.id)
      return pay && pay.status === 'unpaid'
    }).map(p => ({ ...p, amount: payments.find(pm => pm.person_id === p.id)?.amount || 0 }))

    if (debtors.length === 0) { show('Borçlu personel yok!', 'info'); return }
    const totalDebt = debtors.reduce((s, d) => s + Number(d.amount), 0)
    const text = `🚒 *Sivas İtfaiyesi - Yemek Ücreti*\n📅 ${fmtDateTR(selectedDate)}\n\n📋 Ödeme beklenenler:\n${debtors.map((d, i) => `${i+1}. ${d.name} — *${Number(d.amount).toLocaleString('tr-TR')} ₺*`).join('\n')}\n\n💰 Toplam: *${totalDebt.toLocaleString('tr-TR')} ₺*`
    navigator.clipboard.writeText(text).then(() => show(`${debtors.length} borçlu kopyalandı`, 'success')).catch(() => show('Kopyalama başarısız', 'error'))
  }

  const handleCostChange = (v) => { setDailyCost(v); setCost(v) }

  const getPaymentForPerson = (personId) => payments.find(p => p.person_id === personId)
  const unpaidCount = payments.filter(p => p.status === 'unpaid').length

  // ── Render ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-16 h-16 border-4 border-fire/30 border-t-fire rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 font-medium">Yükleniyor...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      {/* Header */}
      <header className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-gradient-to-b from-fire/5 to-transparent" />
        <div className="relative max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Logo src="/logo-itfaiye.jpg" fallback="Sİ" alt="Sivas İtfaiyesi" />
            <div className="text-center flex-1 min-w-0">
              <h1 className="text-lg font-extrabold text-white tracking-tight leading-tight">Sivas İtfaiyesi</h1>
              <p className="text-xs text-slate-300 font-medium mt-0.5 leading-snug">Yeni Personel Yemek Ücreti Takip Listesi</p>
            </div>
            <Logo src="/logo-belediye.jpg" fallback="SB" alt="Sivas Belediyesi" />
          </div>
        </div>
        {/* Settings gear & Theme Toggle & Personnel Modal Toggle */}
        <div className="absolute bottom-2 right-3 flex items-center gap-2">
          <button onClick={() => setShowPersonnel(true)} className="w-7 h-7 rounded-full bg-slate-800/40 hover:bg-slate-700/60 flex items-center justify-center text-slate-500 hover:text-white transition text-xs" title="Personel Yönetimi">👥</button>
          <button onClick={() => setIsLightMode(!isLightMode)} className="w-7 h-7 rounded-full bg-slate-800/40 hover:bg-slate-700/60 flex items-center justify-center text-slate-500 hover:text-white transition text-xs" title="Tema Değiştir">
            {isLightMode ? '🌙' : '☀️'}
          </button>
          <button onClick={() => setShowSettings(true)} className="w-7 h-7 rounded-full bg-slate-800/40 hover:bg-slate-700/60 flex items-center justify-center text-slate-500 hover:text-white transition text-xs" title="Ayarlar">⚙</button>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-transparent via-fire to-transparent" />
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-5">
        {!supabase ? (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg mb-4">Supabase bağlantısı gerekli</p>
            <button onClick={() => setShowSettings(true)} className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition">🔗 Bağlan</button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            {/* Date Navigator */}
            <DateNavigator date={selectedDate} onChange={setSelectedDate} />

            {/* Daily Cost + Bulk Charge */}
            <div className="bg-card rounded-2xl p-4 border border-border mb-5">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-text-muted whitespace-nowrap">Günlük Ücret:</label>
                  <div className="relative flex-1 max-w-[140px]">
                    <input type="number" value={dailyCost} onChange={e => handleCostChange(e.target.value)}
                      className="w-full px-3 py-2.5 pr-8 rounded-xl bg-card border border-border text-text-main font-bold text-lg focus:border-fire focus:outline-none transition" min="0" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted font-semibold text-sm">₺</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button whileTap={{ scale: 0.93 }} onClick={bulkCharge} disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fire to-fire-dark text-white font-bold text-sm hover:shadow-lg hover:shadow-fire/20 transition whitespace-nowrap disabled:opacity-50 glow-fire">
                    {actionLoading ? '⏳...' : '🍽️ Toplu Borçlandır'}
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.93 }} onClick={clearAll} disabled={actionLoading} title="Günü Temizle"
                    className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 hover:bg-red-900/50 hover:text-red-400 hover:border-red-800 text-slate-400 flex items-center justify-center transition disabled:opacity-50">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <StatsBar personnel={personnel} payments={payments} />

            {/* Personnel List */}
            <motion.div variants={listV} initial="hidden" animate="visible" className="space-y-2">
              {personnel.map((p, i) => (
                <PersonnelCard key={p.id} person={p} payment={getPaymentForPerson(p.id)} onToggle={togglePayment} idx={i} />
              ))}
            </motion.div>

            {/* Actions */}
            <div className="mt-7 space-y-3 pb-4">
              <motion.button whileTap={{ scale: 0.97 }} onClick={copyDebtors} disabled={unpaidCount === 0}
                className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                  unpaidCount > 0 ? 'bg-card border border-border text-text-main hover:bg-surface' : 'bg-surface opacity-50 text-text-muted cursor-not-allowed border border-border'
                }`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                WhatsApp Raporu Kopyala {unpaidCount > 0 && `(${unpaidCount} kişi)`}
              </motion.button>

              <motion.button whileTap={{ scale: 0.97 }} onClick={handleDisconnect}
                className="w-full py-3 rounded-2xl text-sm text-slate-500 hover:text-slate-300 transition border border-slate-800 hover:border-slate-700">
                🔌 Bağlantıyı Kes
              </motion.button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-5 border-t border-slate-800/60">
        <p className="text-xs text-slate-500 font-medium">Geliştirici: <span className="text-slate-400 font-semibold">Onurcan Kaya</span></p>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {showSettings && <SupaConnectModal onConnect={handleConnect} onClose={() => setShowSettings(false)} hasExisting={!!supabase} />}
        {showPersonnel && <PersonnelModal supabase={supabase} personnel={personnel} onClose={() => setShowPersonnel(false)} refresh={fetchPersonnel} showToast={show} />}
      </AnimatePresence>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
