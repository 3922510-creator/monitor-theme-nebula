import { useEffect, useMemo, useState } from "react"
import {
  ArrowDown, ArrowUp, Clock, Cpu, HardDrive, Link2, MemoryStick, RefreshCw,
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

/** Fetch recent ping history for one node. */
function usePing(nodeId: number, enabled: boolean) {
  const [data, setData] = useState<PingData | null>(null)
  useEffect(() => {
    if (!enabled) return
    let active = true
    api<PingData>(`/nodes/${nodeId}/metrics?hours=1&points=60&series=ping`)
      .then((d) => { if (active) setData(d) })
      .catch(() => { if (active) setData({ ping: [], probes: {} }) })
    return () => { active = false }
  }, [nodeId, enabled])
  return data
}

function PingProbes({ node }: { node: Node }) {
  const data = usePing(node.id, !!node.metrics)

  const summary = useMemo(() => {
    if (!data?.ping?.length) return null
    // Average latest latency across all probes
    const latencies = data.ping.filter((p) => p.latency !== null).map((p) => p.latency!)
    const avgLat = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0
    // Average loss across all probes
    const lossVals = Object.values(data.loss ?? {})
    const avgLoss = lossVals.length ? lossVals.reduce((a, b) => a + b, 0) / lossVals.length : 0

    // Build time-series: group by timestamp, average latency and availability
    const byTs = new Map<number, { lat: number; n: number; avail: number; availN: number }>()
    for (const p of data.ping) {
      const row = byTs.get(p.ts) ?? { lat: 0, n: 0, avail: 0, availN: 0 }
      if (p.latency !== null) { row.lat += p.latency; row.n++ }
      row.avail += p.loss ?? 0
      row.availN++
      byTs.set(p.ts, row)
    }
    const sorted = [...byTs.entries()].sort(([a], [b]) => a - b)
    const latSeries = sorted.map(([, r]) => (r.n > 0 ? r.lat / r.n : 0))
    const availSeries = sorted.map(([, r]) => (r.availN > 0 ? 100 - r.avail / r.availN : 100))

    return { avgLat, avgLoss, latSeries, availSeries }
  }, [data])

  if (!summary) return null
  const maxLat = Math.max(...summary.latSeries, 1)

  return (
    <div className="mt-3 space-y-1.5">
      <div className="grid grid-cols-2 gap-x-4">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5 text-muted-foreground" /
          <span className="text-xs text-muted-foreground">延迟</span>
          <span className="tnum ml-auto text-sm font-bold text-emerald-600">
            {Math.round(summary.avgLat)} ms
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link2 className="size-3.5 text-muted-foreground" /
          <span className="text-xs text-muted-foreground">丢包率</span>
          <span className="tnum ml-auto text-sm font-bold text-emerald-600">
            {summary.avgLoss.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        <BlockSpark values={summary.latSeries} color="bg-yellow-400/80" max={maxLat} />
        <BlockSpark values={summary.availSeries.map((a) => a >= 99 ? 100 : a)} color="bg-emerald-400/80" />
      </div>
    </div>
  )
}

export function NodeCard({ node, onOpen }: { node: Node; onOpen: () => void }) {
  const m = node.metrics
  const hist = nodeSpeedHistory.get(node.id) ?? []
  const rxHist = hist.map((h) => h.rx)
  const txHist = hist.map((h) => h.tx)
  const sparkMax = Math.max(...rxHist, ...txHist, 1)

  return (
    <Card
      onClick={onOpen}
      className="min-w-0 cursor-pointer gap-0 p-5 transition-all hover:shadow-md hover:border-primary/30"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())}
    >
      {/* Header: status dot + node name + remark tag + expiry days */}
      <div className="flex items-start justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              node.online ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600",
            )}
          />
          <h3 className="truncate font-semibold">{node.name}</h3>
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
              {days < 0 ? `过期${-days}天` : `${days}天`}
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

          {/* Throughput + sparkline */}
          <div className="mt-3 grid grid-cols-2 gap-x-4">
            <div>
              <div className="flex items-baseline gap-1.5">
                <ArrowUp className="size-3 shrink-0 text-emerald-500" />
                <span className="tnum text-sm font-bold text-emerald-600">
                  {m ? rate(m.net_tx) : "—"}
                </span>
                <span className="tnum text-xs text-muted-foreground">
                  {bytes(node.month_tx)}
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
                  {bytes(node.month_rx)}
                </span>
              </div>
              <div className="mt-1">
                <BlockSpark values={rxHist} color="bg-blue-400/60" max={sparkMax} />
              </div>
            </div>
          </div>

          {/* Traffic usage + uptime */}
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="tnum">
              {node.traffic_limit > 0
                ? `${bytes(monthUsage(node))} / ${bytes(node.traffic_limit)}`
                : `在线: ${m ? uptime(m.uptime) : "—"}`}
            </span>
            {node.traffic_limit > 0 && (
              <span className="tnum">在线: {m ? uptime(m.uptime) : "—"}</span>
            )}
          </div>

          {/* Ping probes */}
          <PingProbes node={node} />
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