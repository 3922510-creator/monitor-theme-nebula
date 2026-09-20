import type { ReactNode } from "react"

type Props = { label: ReactNode; pct: number | null; foot: ReactNode; empty?: ReactNode }

/**
 * One metric: name and percentage on top, bar in the middle, raw numbers
 * underneath. Neon gradient fill carries the message.
 */
export function Meter({ label, pct, foot, empty = "—" }: Props) {
  const filled = pct === null ? 0 : Math.min(100, Math.max(0, pct))
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">{label}</span>
        <span className="tnum text-xs font-medium">
          {pct === null ? empty : `${filled < 10 ? filled.toFixed(1) : filled.toFixed(0)}%`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-linear-to-r from-cyan-400 via-violet-400 to-pink-400 shadow-[0_0_8px_rgba(34,211,238,0.45)] transition-[width] duration-500"
          style={{ width: `${filled}%` }}
        />
      </div>
      <div className="tnum mt-1.5 truncate text-xs text-muted-foreground">{foot}</div>
    </div>
  )
}
