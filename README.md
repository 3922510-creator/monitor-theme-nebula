# Nebula

> 轻量 · 像素方块 · 浅色极简的 monitor 主题

Nebula 是 [monitor](https://github.com/monitor-probe/monitor) 的第三方主题，基于 [monitor-theme-default](https://github.com/monitor-probe/monitor-theme-default) 改造，采用 **浅色方块像素风** 设计语言。

React 19 + Vite + Tailwind CSS 4 + shadcn/ui + Recharts。

## 特性

🎨 **浅色方块设计**
- 柔和灰底 + 纯白卡片，干净不刺眼
- 20 格像素方块进度条（CPU / 内存 / 磁盘 / 负载）
- 方块波形迷你图，实时追踪网速与延迟
- 蓝 / 紫 / 橙 / 青四色体系，深色模式自动适配

📊 **数据可视化**
- 节点卡片：CPU / 内存 / 磁盘 / 负载方块条 + 上下行速率波形
- 主面板：节点在线状态、最忙节点、今日流量、实时网速
- 详情页三 Tab：资源（CPU / 内存 / 网络 / 硬盘）/ 网络延迟 / 可用性
- 延迟多探测折线图 + 削峰滤波 + 时间范围缩放
- 可用性方块条：绿 ≥ 99% / 黄 ≥ 95% / 红 < 95%

✨ **细节**
- 备注标签：渐变胶囊，紧跟节点名
- 到期提醒：卡片右上角显示"XXX天后到期"，临期变色
- WebSocket 每 2 秒实时推送，断线自动轮询重连
- 等宽数字（tabular-nums），数字跳动不晃

## 快速开始

```bash
npm ci
npm run dev
```

构建产物在 `dist/`，打包为 `theme.tar.gz` 后上传到 monitor 后台即可使用。

## 主题契约

同 [monitor-theme-default](https://github.com/monitor-probe/monitor-theme-default)：

| 接口 | 说明 |
|------|------|
| `GET /api/me` | 站点名、登录状态、公开页开关 |
| `GET /api/nodes` | 节点列表、实时指标和累计流量 |
| `GET /api/nodes/{id}/metrics` | 历史指标和延迟记录 |
| `GET /api/ws` | 每 2 秒推送节点快照 |

详情页路由：`/node/{id}`

## 许可

MIT
