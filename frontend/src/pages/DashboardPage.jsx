import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Shield, AlertTriangle, XCircle, Lock, Activity,
  RotateCcw, Zap, UserCheck, RefreshCw, ChevronLeft,
  Database, TrendingUp, Users, Clock
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { api } from '../utils/api'
import StatusBadge from '../components/StatusBadge'
import RiskGauge from '../components/RiskGauge'

// ── Custom recharts tooltip ────────────────────────────────
function CyberTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="cyber-panel border border-cyber-border p-2 text-xs font-mono">
      <p className="text-cyber-muted mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="text-white">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Summary card ───────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, glow }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`cyber-panel p-4 flex items-center gap-4 ${glow}`}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="font-mono text-xs text-cyber-muted uppercase tracking-wider">{label}</div>
        <motion.div
          key={value}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-2xl text-white"
          style={{ textShadow: `0 0 10px ${color}60` }}
        >
          {value}
        </motion.div>
      </div>
    </motion.div>
  )
}

// ── Demo control panel ─────────────────────────────────────
function DemoPanel({ onRefresh }) {
  const [loading, setLoading] = useState(null)
  const [lastResult, setLastResult] = useState(null)

  async function run(fn, key) {
    setLoading(key)
    setLastResult(null)
    try {
      const data = await fn()
      setLastResult({ key, data })
      await onRefresh()
    } catch (e) {
      setLastResult({ key, error: true, data: { message: 'Error – is backend running?' } })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="cyber-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-cyber-accent" />
        <span className="font-display text-sm text-white tracking-widest">DEMO CONTROLS</span>
        <span className="font-mono text-xs text-cyber-muted ml-auto">For live presentation</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <button
          onClick={() => run(api.simulateNormal, 'normal')}
          disabled={!!loading}
          className="cyber-btn cyber-btn-success flex items-center justify-center gap-2"
        >
          {loading === 'normal' ? <Spin /> : <UserCheck size={14} />}
          Simulate Normal User
        </button>

        <button
          onClick={() => run(api.simulateAttack, 'attack')}
          disabled={!!loading}
          className="cyber-btn cyber-btn-danger flex items-center justify-center gap-2"
        >
          {loading === 'attack' ? <Spin /> : <AlertTriangle size={14} />}
          Simulate Brute Force
        </button>

        <button
          onClick={() => run(api.reset, 'reset')}
          disabled={!!loading}
          className="cyber-btn cyber-btn-ghost flex items-center justify-center gap-2"
        >
          {loading === 'reset' ? <Spin /> : <RotateCcw size={14} />}
          Reset Demo
        </button>
      </div>

      {/* Result of last demo action */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className={`rounded border p-3 font-mono text-xs ${
              lastResult.key === 'attack'
                ? 'border-red-500/30 bg-red-500/5 text-cyber-red'
                : lastResult.key === 'normal'
                ? 'border-green-500/30 bg-green-500/5 text-cyber-green'
                : 'border-cyber-border text-cyber-muted'
            }`}>
              <span className="uppercase tracking-wider font-bold mr-2">
                [{lastResult.key.toUpperCase()}]
              </span>
              {lastResult.data?.message || lastResult.data?.summary || 'Done'}
              {lastResult.key === 'attack' && lastResult.data?.final_status && (
                <span className="ml-2 text-cyber-red">
                  — Final status: {lastResult.data.final_status.toUpperCase()}
                  {' '}| Risk: {lastResult.data.final_risk_score?.toFixed(0)}/100
                  {' '}| Action: {lastResult.data.action_taken?.toUpperCase()}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Spin() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full"
    />
  )
}

// ── Attempts table ─────────────────────────────────────────
function AttemptsTable({ attempts }) {
  return (
    <div className="cyber-panel overflow-hidden">
      <div className="p-4 border-b border-cyber-border flex items-center gap-2">
        <Database size={15} className="text-cyber-accent" />
        <span className="font-display text-sm text-white tracking-widest">RECENT ATTEMPTS</span>
        <span className="ml-auto font-mono text-xs text-cyber-muted">{attempts.length} records</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-cyber-border">
              {['#','Username','IP Address','Time','Result','Status','Risk','Action','Reason'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-cyber-muted uppercase tracking-wider text-[10px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {attempts.slice(0, 50).map((a, i) => (
                <motion.tr
                  key={a.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`border-b border-cyber-border/50 hover:bg-white/2 transition-colors ${
                    a.status === 'attack'     ? 'bg-red-500/3' :
                    a.status === 'suspicious' ? 'bg-yellow-500/3' :
                    a.success                 ? 'bg-green-500/3' : ''
                  }`}
                >
                  <td className="px-3 py-2 text-cyber-muted">{a.id}</td>
                  <td className="px-3 py-2 text-cyber-accent">{a.username}</td>
                  <td className="px-3 py-2 text-cyber-text">{a.ip_address}</td>
                  <td className="px-3 py-2 text-cyber-muted whitespace-nowrap">
                    {a.timestamp ? a.timestamp.slice(11, 19) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {a.success
                      ? <span className="text-cyber-green">✓ SUCCESS</span>
                      : <span className="text-cyber-red">✗ FAILED</span>
                    }
                  </td>
                  <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                  <td className="px-3 py-2">
                    <RiskGauge score={a.risk_score || 0} size={36} />
                  </td>
                  <td className="px-3 py-2">
                    <span className={`uppercase text-[10px] tracking-wider font-bold ${
                      a.action === 'blocked' || a.action === 'lockout' ? 'text-cyber-red' :
                      a.action === 'captcha'  ? 'text-cyber-yellow' :
                      a.action === 'none'     ? 'text-cyber-muted' : 'text-cyber-text'
                    }`}>{a.action || 'none'}</span>
                  </td>
                  <td className="px-3 py-2 text-cyber-muted max-w-xs truncate" title={a.reason}>
                    {a.reason || '—'}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
        {attempts.length === 0 && (
          <div className="text-center py-10 font-mono text-cyber-muted text-xs">
            No login attempts recorded yet. Use the demo controls above.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────
export default function DashboardPage() {
  const navigate     = useNavigate()
  const [stats, setStats]         = useState(null)
  const [attempts, setAttempts]   = useState([])
  const [timeline, setTimeline]   = useState({ labels: [], total: [], failed: [], attack: [] })
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = useCallback(async () => {
    setRefreshing(true)
    try {
      const [s, a, t] = await Promise.all([
        api.getStats(),
        api.getAttempts(),
        api.getTimeline(),
      ])
      setStats(s)
      setAttempts(a.attempts || [])
      setTimeline(t)
    } catch {
      // backend not available – show empty state
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 5000)   // auto-refresh every 5s
    return () => clearInterval(interval)
  }, [fetchAll])

  // Build chart data
  const chartData = timeline.labels.map((label, i) => ({
    time:   label,
    Total:  timeline.total[i]  || 0,
    Failed: timeline.failed[i] || 0,
    Attack: timeline.attack[i] || 0,
  }))

  // Pie-like summary data
  const pieData = stats ? [
    { name: 'Normal',     value: Math.max(0, stats.success),    fill: '#00ff9d' },
    { name: 'Failed',     value: Math.max(0, stats.failed - stats.suspicious), fill: '#4a6080' },
    { name: 'Suspicious', value: Math.max(0, stats.suspicious - stats.blocked), fill: '#ffd60a' },
    { name: 'Blocked',    value: Math.max(0, stats.blocked),    fill: '#ff2d55' },
  ] : []

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="cyber-btn cyber-btn-ghost flex items-center gap-1 py-1.5 px-3 text-xs"
          >
            <ChevronLeft size={13} /> Login
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-cyber-accent" />
              <h1 className="font-display text-lg text-white tracking-widest">SECURITY DASHBOARD</h1>
            </div>
            <p className="font-mono text-xs text-cyber-muted">Real-time brute force monitoring</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-xs text-cyber-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
            Live — refreshes every 5s
          </div>
          <button
            onClick={fetchAll}
            disabled={refreshing}
            className="cyber-btn cyber-btn-ghost flex items-center gap-1.5 py-1.5 px-3 text-xs"
          >
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
              <RefreshCw size={12} />
            </motion.div>
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Summary stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        <StatCard icon={Activity}      label="Total"      value={stats?.total      ?? 0} color="#00d4ff" glow="neon-border-accent" />
        <StatCard icon={UserCheck}     label="Success"    value={stats?.success    ?? 0} color="#00ff9d" glow="neon-border-green" />
        <StatCard icon={XCircle}       label="Failed"     value={stats?.failed     ?? 0} color="#ff2d55" glow="" />
        <StatCard icon={AlertTriangle} label="Suspicious" value={stats?.suspicious ?? 0} color="#ffd60a" glow="neon-border-yellow" />
        <StatCard icon={Lock}          label="Blocked"    value={stats?.blocked    ?? 0} color="#bf5af2" glow="" />
        <StatCard icon={Users}         label="Normal"     value={stats?.normal     ?? 0} color="#00ff9d" glow="" />
      </motion.div>

      {/* Demo controls */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <DemoPanel onRefresh={fetchAll} />
      </motion.div>

      {/* Charts row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Timeline bar chart */}
        <div className="lg:col-span-2 cyber-panel p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-cyber-accent" />
            <span className="font-display text-xs text-white tracking-widest">LOGIN ACTIVITY TIMELINE</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fill: '#4a6080', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: '#4a6080', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <Tooltip content={<CyberTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'JetBrains Mono', color: '#4a6080' }} />
                <Bar dataKey="Total"  fill="#00d4ff" fillOpacity={0.6} radius={[2,2,0,0]} />
                <Bar dataKey="Failed" fill="#ff2d55" fillOpacity={0.7} radius={[2,2,0,0]} />
                <Bar dataKey="Attack" fill="#ffd60a" fillOpacity={0.8} radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center font-mono text-xs text-cyber-muted">
              No timeline data yet — run a simulation first
            </div>
          )}
        </div>

        {/* Attack distribution */}
        <div className="cyber-panel p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} className="text-cyber-accent" />
            <span className="font-display text-xs text-white tracking-widest">THREAT BREAKDOWN</span>
          </div>
          <div className="space-y-3">
            {pieData.map(d => (
              <div key={d.name}>
                <div className="flex justify-between font-mono text-xs mb-1">
                  <span style={{ color: d.fill }}>{d.name}</span>
                  <span className="text-cyber-muted">{d.value}</span>
                </div>
                <div className="h-1.5 bg-cyber-border rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats?.total ? (d.value / stats.total) * 100 : 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: d.fill, boxShadow: `0 0 8px ${d.fill}60` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Detection logic explainer */}
          <div className="mt-5 p-3 rounded border border-cyber-border/50 bg-black/20">
            <div className="font-mono text-[10px] text-cyber-muted uppercase tracking-widest mb-2">Detection Logic</div>
            <div className="space-y-1.5 font-mono text-[10px] text-cyber-muted">
              <div><span className="text-cyber-green">≥3 failures</span> → CAPTCHA</div>
              <div><span className="text-cyber-yellow">≥5 failures</span> → Suspicious</div>
              <div><span className="text-cyber-red">≥8 failures</span> → Attack + Lockout</div>
              <div><span className="text-cyber-red">avg gap &lt;1.5s</span> → Bot detected</div>
              <div><span className="text-cyber-purple">ML score</span> → Isolation Forest</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Attempts table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <AttemptsTable attempts={attempts} />
      </motion.div>

      {/* Footer */}
      <div className="text-center font-mono text-[10px] text-cyber-muted pb-2">
        AI-Based Brute Force Detection System — AI-Driven Cyber Security Mini Project
      </div>
    </div>
  )
}
