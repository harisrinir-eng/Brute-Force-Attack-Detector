import { ShieldCheck, ShieldAlert, ShieldOff, Lock, AlertTriangle } from 'lucide-react'

const STATUS_MAP = {
  normal:     { label: 'Normal',     cls: 'badge-normal',     Icon: ShieldCheck },
  suspicious: { label: 'Suspicious', cls: 'badge-suspicious', Icon: AlertTriangle },
  attack:     { label: 'Attack',     cls: 'badge-attack',     Icon: ShieldOff },
  blocked:    { label: 'Blocked',    cls: 'badge-blocked',    Icon: Lock },
}

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP['normal']
  return (
    <span className={`badge ${cfg.cls}`}>
      <cfg.Icon size={10} />
      {cfg.label}
    </span>
  )
}
