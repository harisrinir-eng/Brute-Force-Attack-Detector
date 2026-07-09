import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Shield, Eye, EyeOff, User, Lock, AlertTriangle,
  CheckCircle, XCircle, ChevronRight, Cpu, LayoutDashboard
} from 'lucide-react'
import { api } from '../utils/api'
import RiskGauge from '../components/RiskGauge'
import StatusBadge from '../components/StatusBadge'

// ── Demo credential hint card ──────────────────────────────
const DEMO_CREDS = [
  { user: 'admin',   pass: 'admin123' },
  { user: 'alice',   pass: 'alice@pass' },
  { user: 'student', pass: 'pass1234' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername]       = useState('')
  const [password, setPassword]       = useState('')
  const [showPass, setShowPass]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [result, setResult]           = useState(null)   // last API response
  const [captchaMode, setCaptchaMode] = useState(false)
  const [captchaAns, setCaptchaAns]   = useState('')
  const [captchaQ, setCaptchaQ]       = useState('What is 3 + 4?')
  const [lockTimer, setLockTimer]     = useState(0)
  const timerRef = useRef(null)

  // Countdown for lockout display
  useEffect(() => {
    if (lockTimer > 0) {
      timerRef.current = setTimeout(() => setLockTimer(t => t - 1), 1000)
    } else {
      clearTimeout(timerRef.current)
    }
    return () => clearTimeout(timerRef.current)
  }, [lockTimer])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username || !password) return

    setLoading(true)
    try {
      const data = await api.login(
        username, password,
        captchaMode ? captchaAns : null
      )
      setResult(data)

      if (data.allowed) {
        // Successful login – briefly show success then redirect
        setTimeout(() => navigate('/dashboard'), 1800)
      } else if (data.captcha_required) {
        setCaptchaMode(true)
        // Fetch the captcha question
        const cq = await api.getCaptcha()
        setCaptchaQ(cq.question)
      } else if (data.action === 'blocked' || data.action === 'lockout') {
        setLockTimer(data.lockout_seconds || 60)
        setCaptchaMode(false)
      }
    } catch (err) {
      setResult({
        allowed: false,
        status: 'normal',
        risk_score: 0,
        reasons: [],
        message: 'Cannot connect to server. Is the backend running?',
        action: 'none',
      })
    } finally {
      setLoading(false)
    }
  }

  function fillCred(user, pass) {
    setUsername(user)
    setPassword(pass)
    setResult(null)
    setCaptchaMode(false)
    setCaptchaAns('')
    setLockTimer(0)
  }

  const isLocked   = result?.action === 'locked' || result?.action === 'blocked' || lockTimer > 0
  const isAttack   = result?.status === 'attack'
  const isSuspicious = result?.status === 'suspicious'
  const isSuccess  = result?.allowed

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-8">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Left: branding / info panel ───────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:flex flex-col gap-6"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-cyber">
              <Shield size={24} className="text-black" />
            </div>
            <div>
              <div className="font-display text-xl text-white tracking-widest">CYBERGUARD</div>
              <div className="font-mono text-xs text-cyber-muted">AI THREAT DETECTION v1.0</div>
            </div>
          </div>

          {/* Feature bullets */}
          <div className="cyber-panel p-5 space-y-3">
            {[
              { icon: Cpu,          label: 'AI-Powered Detection',       desc: 'Isolation Forest + rule-based engine' },
              { icon: Shield,       label: 'Real-time Prevention',       desc: 'Instant lockout & CAPTCHA triggers' },
              { icon: AlertTriangle,label: 'Behavioural Analysis',       desc: 'Velocity, ratio & pattern analysis' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                  <Icon size={14} className="text-cyber-accent" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{label}</div>
                  <div className="text-xs text-cyber-muted font-mono">{desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Demo credentials */}
          <div className="cyber-panel p-4">
            <div className="font-mono text-xs text-cyber-muted mb-3 uppercase tracking-widest">Demo Credentials</div>
            <div className="space-y-2">
              {DEMO_CREDS.map(c => (
                <button
                  key={c.user}
                  onClick={() => fillCred(c.user, c.pass)}
                  className="w-full flex items-center justify-between p-2 rounded border border-cyber-border hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-cyber-muted" />
                    <span className="font-mono text-xs text-cyber-text">{c.user}</span>
                    <span className="text-cyber-muted font-mono text-xs">/ {c.pass}</span>
                  </div>
                  <ChevronRight size={12} className="text-cyber-muted group-hover:text-cyber-accent transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Dashboard link */}
          <button
            onClick={() => navigate('/dashboard')}
            className="cyber-btn cyber-btn-ghost flex items-center justify-center gap-2 w-full"
          >
            <LayoutDashboard size={14} />
            Open Security Dashboard
          </button>
        </motion.div>

        {/* ── Right: login form ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Header */}
          <div className="mb-6 text-center lg:text-left">
            <div className="flex items-center gap-3 lg:hidden mb-4 justify-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Shield size={20} className="text-black" />
              </div>
              <div className="font-display text-lg text-white tracking-widest">CYBERGUARD</div>
            </div>
            <h1 className="font-display text-2xl text-white tracking-wider mb-1">
              SECURE LOGIN
            </h1>
            <p className="text-cyber-muted text-sm font-mono">
              Protected by AI-based threat detection
            </p>
          </div>

          {/* Alert banner */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.status + result.risk_score}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <AlertBanner result={result} lockTimer={lockTimer} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main card */}
          <div className={`cyber-panel p-6 transition-all duration-500 ${
            isAttack || isLocked ? 'neon-border-red' :
            isSuspicious ? 'neon-border-yellow' :
            isSuccess ? 'neon-border-green' :
            'neon-border-accent'
          }`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div>
                <label className="font-mono text-xs text-cyber-muted uppercase tracking-wider block mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="cyber-input pl-9"
                    disabled={isLocked && lockTimer > 0}
                    autoComplete="off"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="font-mono text-xs text-cyber-muted uppercase tracking-wider block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-muted" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="cyber-input pl-9 pr-10"
                    disabled={isLocked && lockTimer > 0}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-muted hover:text-cyber-accent transition-colors"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* CAPTCHA */}
              <AnimatePresence>
                {captchaMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 rounded border border-yellow-500/30 bg-yellow-500/5">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={14} className="text-cyber-yellow" />
                        <span className="font-mono text-xs text-cyber-yellow uppercase tracking-wider">
                          CAPTCHA Required
                        </span>
                      </div>
                      <div className="font-mono text-sm text-white mb-2">{captchaQ}</div>
                      <input
                        type="text"
                        value={captchaAns}
                        onChange={e => setCaptchaAns(e.target.value)}
                        placeholder="Your answer..."
                        className="cyber-input"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Lockout countdown */}
              <AnimatePresence>
                {lockTimer > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-3 rounded border border-red-500/30 bg-red-500/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Lock size={14} className="text-cyber-red" />
                      <span className="font-mono text-xs text-cyber-red uppercase tracking-wider">Account Locked</span>
                    </div>
                    <span className="font-display text-lg text-cyber-red">
                      {String(Math.floor(lockTimer / 60)).padStart(2, '0')}:{String(lockTimer % 60).padStart(2, '0')}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || (lockTimer > 0)}
                className={`cyber-btn w-full ${
                  lockTimer > 0 ? 'opacity-40 cursor-not-allowed' :
                  isAttack ? 'cyber-btn-danger' : 'cyber-btn-primary'
                } flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                    />
                    Authenticating...
                  </>
                ) : lockTimer > 0 ? (
                  'ACCOUNT LOCKED'
                ) : (
                  <>
                    <Shield size={14} />
                    Authenticate
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Mobile links */}
          <div className="flex gap-3 mt-4 lg:hidden">
            <button onClick={() => navigate('/dashboard')} className="cyber-btn cyber-btn-ghost flex-1 flex items-center justify-center gap-2 text-xs">
              <LayoutDashboard size={12} /> Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// ── Alert banner component ─────────────────────────────────
function AlertBanner({ result, lockTimer }) {
  const isSuccess   = result.allowed
  const isBlocked   = result.action === 'blocked' || result.action === 'lockout'
  const isSuspicious = result.status === 'suspicious'
  const isAttack    = result.status === 'attack'

  const colorCls = isSuccess ? 'border-green-500/30 bg-green-500/5' :
                   isAttack || isBlocked ? 'border-red-500/30 bg-red-500/5' :
                   isSuspicious ? 'border-yellow-500/30 bg-yellow-500/5' :
                   'border-cyber-border bg-cyber-panel'

  return (
    <div className={`rounded border p-3 ${colorCls}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {isSuccess ? (
            <CheckCircle size={16} className="text-cyber-green" />
          ) : isAttack || isBlocked ? (
            <XCircle size={16} className="text-cyber-red" />
          ) : (
            <AlertTriangle size={16} className="text-cyber-yellow" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={result.status} />
            {result.risk_score > 0 && (
              <span className="font-mono text-xs text-cyber-muted">
                Risk: <span className={
                  result.risk_score >= 75 ? 'text-cyber-red' :
                  result.risk_score >= 45 ? 'text-cyber-yellow' : 'text-cyber-green'
                }>{result.risk_score.toFixed(0)}/100</span>
              </span>
            )}
          </div>

          <p className="text-sm text-cyber-text">{result.message}</p>

          {/* Reasons */}
          {result.reasons?.length > 0 && (
            <div className="mt-2 space-y-1">
              {result.reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span className="text-cyber-muted font-mono text-xs mt-0.5">▸</span>
                  <span className="font-mono text-xs text-cyber-muted">{r}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action taken */}
          {result.action && result.action !== 'none' && (
            <div className="mt-2 font-mono text-xs">
              <span className="text-cyber-muted">Action: </span>
              <span className={
                result.action === 'blocked' || result.action === 'lockout' ? 'text-cyber-red' :
                result.action === 'captcha' ? 'text-cyber-yellow' : 'text-cyber-green'
              }>
                {result.action.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {result.risk_score > 0 && (
          <div className="flex-shrink-0">
            <RiskGauge score={result.risk_score} size={60} />
          </div>
        )}
      </div>
    </div>
  )
}
