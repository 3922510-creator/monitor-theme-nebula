import { Activity, ArrowDown, ArrowUp, ArrowDownUp, Server } from "lucide-react"

import { speedHistory, type Node } from "@/lib/api"
import { rate } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Compact site-wide summary bar — no card frame, blends into the list. */
export function Summary({ nodes }: { nodes: Node[] }) {
  const online = nodes.filter((n) => n.online)
  const offline = nodes.length - online.length

  const busiest = online.reduce<Node | null>(
    (top, n) => (n.metrics && (!top || n.metrics.cpu > top.metrics!.cpu) ? n : top),
    null,
  )
  const cpu = busiest?.metrics?.cpu ?? 0
  const now = speedHistory.at(-1) ?? { rx: 0, tx: 0 }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-xs text-muted-foreground">
      {/* Online status */}
      <span className="inline-flex items-center gap-1.5">
        <Server className="size-3.5" />
        <span className={cn("size-1.5 rounded-full", online.length === nodes.length ? "bg-emerald-500" : "bg-amber-500")} />
        <span className="tnum font-medium text-foreground">{online.length}/{nodes.length}</span> 在线
        {offline > 0 && <span className="text-amber-500">· {offline} 离线</span>}
      </span>

      {/* Busiest node */}
      {busiest && (
        <span className="inline-flex items-center gap-1.5">
          <Activity className="size-3.5" />
          最忙
          <span className={cn("tnum font-medium", cpu >= 85 ? "text-red-500" : "text-foreground")}>
            {cpu.toFixed(1)}%
          </span>
          <span className="max-w-[120px] truncate">{busiest.name}</span>
        </span>
      )}

      {/* Live throughput */}
      <span className="inline-flex items-center gap-1.5">
        <ArrowDownUp className="size-3.5" />
        <ArrowDown className="size-3 text-blue-500" />
        <span className="tnum font-medium text-foreground">{rate(now.rx)}</span>
        <ArrowUp className="size-3 text-emerald-500" />
        <span className="tnum font-medium text-foreground">{rate(now.tx)}</span>
      </span>
    </div>
  )
}
