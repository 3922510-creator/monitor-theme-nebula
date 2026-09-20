import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Props = {
  label: ReactNode
  pct: number | null
  foot?: ReactNode
  empty?: ReactNode
  /** Tailwind bg color class for filled blocks, e.g. "bg-blue-400". */
  color?: string
  /** Optional leading icon. */
  icon?: ReactNode
  /** Hide the block bar (e.g. for load average which isn't a percentage). */
  noBar?: boolean
}

const BLOCKS = 20

/**
 * Pixel-block meter: 20 small squares fill up by percentage.
 * Clean light-theme look, no gradients or glows.
 */
export function Meter({ label, pct, foot, empty = "—", color = "bg-blue-400", icon, noBar = false }: Props) {
  const filled = pct === null ? 0 : Math.min(100, Math.max(0, pct))
  const lit = Math.round((filled / 100) * BLOCKS)
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="tnum text-xs font-semibold text-foreground">
          {pct === null ? (foot ?? empty) : `${filled < 10 ? filled.toFixed(1) : filled.toFixed(0)}%`}
        </span>
      </div>
      {!noBar && (
        <div className="mt-1.5 flex gap-[3px]">
          {Array.from({ length: BLOCKS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 flex-1 rounded-[2px] transition-colors duration-500",
                i < lit ? color : "bg-slate-200 dark:bg-slate-700",
              )}
            />
          ))}
        </div>
      )}
      {foot && pct !== null && (
        <div className="tnum mt-1 text-right text-[10px] text-muted-foreground">{foot}</div>
      )}
    </div>
  )
}
