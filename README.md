# Procurement Dashboard · 采购订单追踪仪表盘

基于苹果级极简设计语言的采购订单数据仪表盘，浅色模式，含 KPI 卡片、供应商交期对比、订单状态分布、采购金额趋势与在途订单清单。

## 本地预览

直接双击 `index.html`，或在项目目录运行：

```bash
npx serve .
```

## 部署到 Vercel

1. 将本仓库推送到 GitHub；
2. 打开 https://vercel.com/new ，选择该 GitHub 仓库；
3. Framework 选 `Other`，Build 命令留空，Output 目录为根目录，点击 **Deploy**。

## 配色 Token

| 用途 | 色值 |
|---|---|
| 主色 Primary | `#0071E3` |
| 页面背景 / 卡片 | `#F5F5F7` / `#FFFFFF` |
| 主文字 / 次文字 | `#1D1D1F` / `#6E6E73` |
| 已完成 / 运输中 / 处理中 / 延期 | `#34C759` / `#0A84FF` / `#FF9F0A` / `#FF3B30` |

图表分类色：`#0071E3` `#5AC8FA` `#5E5CE6` `#34C759` `#FF9500` `#AF52DE`
