import { AlarmClock, Activity, ArrowDown, ArrowUp, ArrowDownUp, Server } from "lucide-react"

import { Card } from "@/components/ui/card"
import { speedHistory, type Node } from "@/lib/api"
import { daysUntil, rate } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Find the node expiring soonest (and not already expired). */
function soonestExpiry(nodes: Node[]): { node: Node; days: number } | null {
  let best: { node: Node; days: number } | null = null
  for (const n of nodes) {
    const days = daysUntil(n.expires_at)
    if (days === null || days < 0) continue
    if (!best || days < best.days) best = { node: n, days }
  }
  return best
}

/** Compact site-wide summary — wrapped in a card, clean rows. */
export function Summary({ nodes }: { nodes: Node[] }) {
  const online = nodes.filter((n) => n.online)
  const offline = nodes.length - online.length

  const busiest = online.reduce<Node | null>(
    (top, n) => (n.metrics && (!top || n.metrics.cpu > top.metrics!.cpu) ? n : top),
    null,
  )
  const cpu = busiest?.metrics?.cpu ?? 0
  const now = speedHistory.at(-1) ?? { rx: 0, tx: 0 }
  const soon = soonestExpiry(nodes)

  return (
    <Card className="gap-0 p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {/* Online status */}
        <span className="inline-flex items-center gap-1.5">
          <Server className="size-3.5" />
          <span className={cn(
            "size-1.5 rounded-full",
            online.length === nodes.length ? "bg-emerald-500" : "bg-amber-500",
          )} />
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

      {/* Expiry warning — show soonest upcoming expiry */}
      {soon && soon.days <= 60 && (
        <div className="mt-2 flex items-center gap-1.5 border-t border-border/60 pt-2 text-xs">
          <AlarmClock className={cn(
            "size-3.5",
            soon.days <= 7 ? "text-red-500" : soon.days <= 30 ? "text-amber-500" : "text-muted-foreground",
          )} />
          <span className="truncate">
            <span className={cn(
              "font-medium",
              soon.days <= 7 ? "text-red-500" : soon.days <= 30 ? "text-amber-500" : "text-foreground",
            )}>
              {soon.days} 天后到期
            </span>
            <span className="text-muted-foreground"> · {soon.node.name}</span>
          </span>
        </div>
      )}
    </Card>
  )
}
