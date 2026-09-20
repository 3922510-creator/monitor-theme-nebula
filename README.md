# Nebula

Nebula 是 [monitor](https://github.com/monitor-probe/monitor) 的霓虹风格第三方主题，
基于内置默认主题 [monitor-theme-default](https://github.com/monitor-probe/monitor-theme-default) 改造。

React + Vite + shadcn/ui，青 / 紫 / 粉霓虹配色，深色为主。

## 特性

- 霓虹配色：青（#22d3ee）、紫（#a78bfa）、粉（#f472b6）三色渐变体系
- 深色蓝黑底 + 背景霓虹光晕
- 卡片悬停发光、霓虹渐变进度条、图表霓虹配色
- 与默认主题完全一致的数据接口与交互：列表 / 详情 / 实时 WebSocket / 历史图表

## 开发

同默认主题：

```bash
npm ci
npm run dev
```

提交前运行 `npm run build && npm run lint && npm test`。

## 主题契约

同 [monitor-theme-default](https://github.com/monitor-probe/monitor-theme-default)：

- `GET /api/me` — 站点名、登录状态、公开页开关
- `GET /api/nodes` — 节点列表、实时指标和累计流量
- `GET /api/nodes/{id}/metrics` — 历史指标和延迟记录
- `GET /api/ws` — 每 2 秒推送一次节点快照的 WebSocket

详情页路径为 `/node/{id}`。

## 许可

MIT
