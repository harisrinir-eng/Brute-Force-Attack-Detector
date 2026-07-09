import { motion } from 'framer-motion'

function getColor(score) {
  if (score >= 75) return '#ff2d55'
  if (score >= 45) return '#ffd60a'
  return '#00ff9d'
}

export default function RiskGauge({ score = 0, size = 80 }) {
  const r = (size / 2) - 8
  const circumference = 2 * Math.PI * r
  const dashOffset = circumference * (1 - score / 100)
  const color = getColor(score)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={6}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <span
        className="font-mono text-xs font-bold -mt-1"
        style={{ color }}
      >
        {score.toFixed(0)}
      </span>
    </div>
  )
}
