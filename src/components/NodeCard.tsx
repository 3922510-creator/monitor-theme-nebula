import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown, ArrowUp, ArrowDownUp, Activity, Cpu, HardDrive, MemoryStick, RefreshCw,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Meter } from "@/components/Meter"
import { api, nodeSpeedHistory, type Node } from "@/lib/api"
import {
  bytes, daysUntil, osName, percent, rate, uptime,
} from "@/lib/format"
import { cn } from "@/lib/utils"

function monthUsage(node: Node): number {
  const { month_rx: rx, month_tx: tx } = node
  switch (node.traffic_mode) {
    case "up":
      return tx
    case "down":
      return rx
    case "max":
      return Math.max(rx, tx)
    default:
      return rx + tx
  }
}

function deployed(node: Node) {
  return node.cpu_cores > 0 || node.mem_total > 0
}

/** Pixel sparkline — row of mini blocks whose height tracks values. */
function BlockSpark({ values, color, max }: { values: number[]; color: string; max?: number }) {
  if (!values.length) return <div className="flex h-3.5 items-end gap-[2px]" />
  const top = max ?? Math.max(...values, 1)
  return (
    <div className="flex h-3.5 items-end gap-[2px]">
      {values.map((v, i) => (
        <div
          key={i}
          className={cn("w-1 rounded-[1px] transition-all duration-300", color)}
          style={{ height: `${Math.max(15, (Math.min(v, top) / top) * 100)}%` }}
        />
      ))}
    </div>
  )
}

/* ---- Ping data types ---- */
type PingPoint = {
  task_id: number
  ts: number
  latency: number | null
  loss?: number
}
type PingData = { ping: PingPoint[]; probes: Record<string, string>; loss?: Record<string, number> }

/** Fetch 24h ping history for per-probe heatmap. */
function usePing24h(nodeId: number, enabled: boolean) {
  const [data, setData] = useState<PingData | null>(null)
  useEffect(() => {
    if (!enabled) return
    let active = true
    api<PingData>(`/nodes/${nodeId}/metrics?hours=24&points=288&series=ping`)
      .then((d) => { if (active) setData(d) })
      .catch(() => { if (active) setData({ ping: [], probes: {} }) })
    return () => { active = false }
  }, [nodeId, enabled])
  return data
}

/** Latency → block color: <80 green, <150 yellow, <250 orange, else red. */
function latColor(lat: number | null): string {
  if (lat === null) return "bg-slate-200 dark:bg-slate-700"
  if (lat < 80) return "bg-emerald-400"
  if (lat < 150) return "bg-yellow-400"
  if (lat < 250) return "bg-orange-400"
  return "bg-red-400"
}

/** Loss → block color: <1% green, <5% yellow, <10% orange, else red. */
function lossColor(loss: number | null): string {
  if (loss === null) return "bg-slate-200 dark:bg-slate-700"
  if (loss < 1) return "bg-emerald-400"
  if (loss < 5) return "bg-yellow-400"
  if (loss < 10) return "bg-orange-400"
  return "bg-red-400"
}

/** Average latency text color. */
function latText(lat: number): string {
  if (lat < 80) return "text-emerald-600"
  if (lat < 150) return "text-yellow-600"
  if (lat < 250) return "text-orange-600"
  return "text-red-600"
}

/** Average loss text color. */
function lossText(loss: number): string {
  if (loss < 1) return "text-emerald-600"
  if (loss < 5) return "text-yellow-600"
  if (loss < 10) return "text-orange-600"
  return "text-red-600"
}

/** Build 24 hourly buckets from ping points for a single probe. */
function buildHourly(probePoints: PingPoint[]) {
  const byHour = new Map<number, { lat: number; latN: number; loss: number; lossN: number }>()
  for (const p of probePoints) {
    const hour = Math.floor(p.ts / 3600) * 3600
    const row = byHour.get(hour) ?? { lat: 0, latN: 0, loss: 0, lossN: 0 }
    if (p.latency !== null) { row.lat += p.latency; row.latN++ }
    row.loss += p.loss ?? 0
    row.lossN++
    byHour.set(hour, row)
  }
  const nowHour = Math.floor(Date.now() / 1000 / 3600) * 3600
  const hours: { ts: number; lat: number | null; loss: number | null }[] = []
  for (let i = 23; i >= 0; i--) {
    const ts = nowHour - i * 3600
    const row = byHour.get(ts)
    hours.push({
      ts,
      lat: row && row.latN > 0 ? row.lat / row.latN : null,
      loss: row && row.lossN > 0 ? row.loss / row.lossN : null,
    })
  }
  const lats = hours.filter((h) => h.lat !== null).map((h) => h.lat!)
  const losses = hours.filter((h) => h.loss !== null).map((h) => h.loss!)
  return {
    hours,
    avgLat: lats.length ? lats.reduce((a, b) => a + b, 0) / lats.length : 0,
    avgLoss: losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
  }
}

/** Per-probe 24h heatmap row — no card border, plain rows like traffic. */
function ProbeHeatmap({ name, points }: { name: string; points: PingPoint[] }) {
  const h = useMemo(() => buildHourly(points), [points])
  if (!points.length) return null

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="tnum shrink-0 text-xs text-muted-foreground">
          延迟 <span className={cn("font-semibold", latText(h.avgLat))}>{Math.round(h.avgLat)}ms</span>
          {" · "}
          丢包 <span className={cn("font-semibold", lossText(h.avgLoss))}>{h.avgLoss.toFixed(1)}%</span>
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="w-8 shrink-0 text-xs text-sky-600 dark:text-sky-400">延迟</span>
        <div className="flex flex-1 gap-[2px]">
          {h.hours.map((x, i) => (
            <div
              key={i}
              className={cn("h-3 w-full flex-1 rounded-[1px]", latColor(x.lat))}
            />
          ))}
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="w-8 shrink-0 text-xs text-violet-600 dark:text-violet-400">丢包</span>
        <div className="flex flex-1 gap-[2px]">
          {h.hours.map((x, i) => (
            <div
              key={i}
              className={cn("h-3 w-full flex-1 rounded-[1px]", lossColor(x.loss))}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Line status section: header (only when probes exist) + per-probe heatmap rows. */
function NetworkSection({ node }: { node: Node }) {
  const data = usePing24h(node.id, !!node.metrics)
  const groups = useMemo(() => {
    if (!data?.ping?.length) return [] as { id: number; name: string; points: PingPoint[] }[]
    const byId = new Map<number, PingPoint[]>()
    for (const p of data.ping) {
      const arr = byId.get(p.task_id) ?? []
      arr.push(p)
      byId.set(p.task_id, arr)
    }
    return [...byId.entries()].map(([id, points]) => ({
      id,
      name: data.probes?.[id] ?? `探测 ${id}`,
      points,
    }))
  }, [data])

  if (!groups.length) return null
  const m = node.metrics

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Activity className="size-3.5" />
          线路状态
        </span>
        {m && (
          <span className="tnum text-xs text-muted-foreground">
            在线 {uptime(m.uptime)}
          </span>
        )}
      </div>
      {groups.map((g) => (
        <ProbeHeatmap key={g.id} name={g.name} points={g.points} />
      ))}
    </div>
  )
}

export function NodeCard({ node, onOpen }: { node: Node; onOpen: () => void }) {
  const m = node.metrics
  const hist = nodeSpeedHistory.get(node.id) ?? []
  const rxHist = hist.map((h) => h.rx)
  const txHist = hist.map((h) => h.tx)
  const sparkMax = Math.max(...rxHist, ...txHist, 1)

  const trafficPct = node.traffic_limit > 0 ? percent(monthUsage(node), node.traffic_limit) : null

  return (
    <Card className="min-w-0 gap-0 p-5">
      {/* Header: status dot + node name (clickable) + remark tag + expiry days */}
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              node.online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600",
            )}
          />
          <h3
            onClick={onOpen}
            className="cursor-pointer truncate font-semibold transition-colors hover:text-primary"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter") && onOpen()}
          >
            {node.name}
          </h3>
          {node.remark && (
            <span className="shrink-0 rounded-full bg-linear-to-r from-blue-50 to-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 dark:from-blue-950/50 dark:to-violet-950/50 dark:text-violet-400">
              {node.remark}
            </span>
          )}
        </div>
        {(() => {
          const days = daysUntil(node.expires_at)
          if (days === null) return null
          return (
            <span className={cn(
              "tnum shrink-0 text-xs font-medium",
              days < 0 ? "text-red-500" : days <= 30 ? "text-amber-500" : "text-muted-foreground",
            )}>
              {days < 0 ? `已过期${-days}天` : `${days}天后到期`}
            </span>
          )
        })()}
      </div>

      {/* OS line */}
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {node.os ? osName(node.os) : "等待首次上报"}
        {node.arch ? ` · ${node.arch}` : ""}
        {node.virt && node.virt !== "none" ? ` · ${node.virt}` : ""}
      </p>

      {deployed(node) ? (
        <>
          {/* CPU / Memory / Disk / Load */}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Meter
              label={`CPU · ${node.cpu_cores} 核`}
              icon={<Cpu className="size-3" />}
              pct={m ? m.cpu : null}
              color="bg-blue-400"
            />
            <Meter
              label="内存"
              icon={<MemoryStick className="size-3" />}
              pct={m ? percent(m.mem_used, m.mem_total) : null}
              color="bg-violet-400"
            />
            <Meter
              label="磁盘"
              icon={<HardDrive className="size-3" />}
              pct={m ? percent(m.disk_used, m.disk_total) : null}
              color="bg-orange-400"
            />
            <Meter
              label="负载"
              icon={<RefreshCw className="size-3" />}
              pct={m && node.cpu_cores > 0 ? Math.min(100, (m.load[0] / node.cpu_cores) * 100) : null}
              foot={m ? m.load[0].toFixed(2) : "—"}
              color="bg-sky-400"
            />
          </div>

          {/* Network throughput section header + sparkline */}
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ArrowDownUp className="size-3.5" />
            网络
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-4">
            <div>
              <div className="flex items-baseline gap-1.5">
                <ArrowUp className="size-3 shrink-0 text-emerald-500" />
                <span className="tnum text-sm font-bold text-emerald-600">
                  {m ? rate(m.net_tx) : "—"}
                </span>
                <span className="tnum text-xs text-muted-foreground">
                  {bytes(node.day_tx)}
                </span>
              </div>
              <div className="mt-1">
                <BlockSpark values={txHist} color="bg-emerald-400/60" max={sparkMax} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <ArrowDown className="size-3 shrink-0 text-blue-500" />
                <span className="tnum text-sm font-bold text-blue-600">
                  {m ? rate(m.net_rx) : "—"}
                </span>
                <span className="tnum text-xs text-muted-foreground">
                  {bytes(node.day_rx)}
                </span>
              </div>
              <div className="mt-1">
                <BlockSpark values={rxHist} color="bg-blue-400/60" max={sparkMax} />
              </div>
            </div>
          </div>

          {/* Traffic usage — used/total next to label */}
          {node.traffic_limit > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowDownUp className="size-3" />
                  流量
                  <span className="tnum ml-1 text-xs text-muted-foreground/70">
                    {bytes(monthUsage(node))} / {bytes(node.traffic_limit)}
                  </span>
                </span>
                <span className="tnum text-xs font-semibold text-foreground">
                  {trafficPct !== null ? `${trafficPct < 10 ? trafficPct.toFixed(1) : trafficPct.toFixed(0)}%` : "—"}
                </span>
              </div>
              <div className="mt-1.5 flex gap-[3px]">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-2 flex-1 rounded-[2px] transition-colors duration-500",
                      i < Math.round((trafficPct ?? 0) / 5) ? "bg-pink-400" : "bg-slate-200 dark:bg-slate-700",
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Line status section (header + per-probe 24h heatmaps) — hidden when no probes */}
          <NetworkSection node={node} />
        </>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          还没有接入。在后台生成安装命令并执行一次。
        </p>
      )}
    </Card>
  )
}

/** Country badge (used by detail page). */
export function Country({ node }: { node: Node }) {
  if (!node.country) return null
  return (
    <Badge variant="outline" className="shrink-0 font-normal text-muted-foreground">
      {node.country}
    </Badge>
  )
}

/** Online/offline status badge (used by detail page). */
export function Status({ node }: { node: Node }) {
  const down = node.last_seen ? Date.now() / 1000 - node.last_seen : 0
  const label = node.online
    ? `在线 ${node.metrics ? uptime(node.metrics.uptime) : ""}`
    : node.cpu_cores > 0 || node.mem_total > 0
      ? `离线 ${down >= 60 ? uptime(down) : ""}`
      : "未接入"
  return (
    <Badge
      variant="outline"
      className={cn("tnum shrink-0 gap-1.5 font-normal", !node.online && "text-muted-foreground")}
    >
      <span className={cn("size-1.5 rounded-full", node.online ? "bg-emerald-500" : "bg-muted-foreground/40")} />
      {label.trim()}
    </Badge>
  )
}
