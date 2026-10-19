# 采购订单数据仪表盘 · 项目实战记录

> 从 ERP Excel 表格到公网可访问的数据看板，全流程亲手跑通一遍。
> 线上地址：https://procurement-dashboard-dusky.vercel.app/
> 仓库地址：https://github.com/kirby5201/procurement-dashboard

---

## 一、项目概述

实习期间从公司 ERP 系统导出两份 Excel（采购订单表 189 行、应付台账 89 行），手工翻表格看数据效率低，于是自己做了一个网页版仪表盘：把两个 Excel 的数据统一折算成人民币，自动汇总 KPI、画趋势图、做供应商对比，并支持按供应商、时间范围、关键词实时筛选。

**目标用户**：采购/跟单同事、主管周会汇报。
**最终效果**：打开网页就能看到当月采购总额、审批状态分布、Top 供应商、在途货物、国内外采购占比，不用再翻 Excel。

---

## 二、技术栈

| 层 | 用了什么 | 为什么选它 |
|---|---|---|
| 前端 | 原生 HTML / CSS / JavaScript | 不引框架，一个静态页面直接能跑，学习成本低 |
| 图表 | Chart.js (CDN 引入) | 免费、文档全、环形图/折线/柱状图都支持 |
| 数据处理 | Python + openpyxl | 读 Excel、清洗、算指标，输出成 `data.js` |
| 代码托管 | GitHub | 免费、版本管理 |
| 部署 | Vercel | 连 GitHub 仓库后自动部署，推送代码即上线 |
| 设计风格 | Apple / iOS 风格（#F5F5F7 背景、#0071E3 主色） | 简洁、专业，适合工作场景 |

---

## 三、完整操作流程（可复现）

### 第 1 步：建 GitHub 仓库
1. GitHub 上 New Repository，命名 `procurement-dashboard`，Public。
2. 本地建文件夹，`git init`，提交四个初始文件：`index.html`、`styles.css`、`app.js`、`data.js`。
3. `git remote add origin 仓库地址` → `git push -u origin main`。

### 第 2 步：用 Python 把 Excel 转成前端能用的数据
- 脚本：`compute_data.py`，用 `openpyxl.load_workbook(路径, read_only=False)` 打开（**注意 read_only=True 会读不到这个表的行**，踩过坑）。
- 按列索引取值（采购订单表关键列：订单日期、订单号、公司名称、申请状态、料号、描述、数量、单价、币种、行总价）。
- 汇率统一折算：USD × 7.2，EUR × 7.8，CNY = 1。
- 输出 `window.DATA = { payable: {...}, orders: [...], pending: [...] }` 写入 `data.js`，前端直接 `import` 风格用 `<script src="data.js">` 引入。

### 第 3 步：前端搭页面
- 布局：左侧固定侧边栏导航（总览/采购订单/物料库/数据分析/设置），右侧主内容区。
- 每个视图是一个 `<section class="view">`，JS 控制 `.hidden` 切换显示。
- KPI 卡：已通过订单数、采购总额、待出货笔数、应付未付。
- 图表区：供应商 Top 8 横向条形图、审批状态环形图、月度采购金额趋势折线图。

### 第 4 步：接 Vercel 自动部署
1. Vercel 用 GitHub 登录，点 "New Project"，选 `procurement-dashboard` 仓库。
2. Framework 选 "Other"，Build 命令留空（纯静态），直接 Deploy。
3. 以后每次 `git push`，Vercel 自动重新部署，1 分钟后线上更新。

### 第 5 步：迭代加功能
- 多视图切换、供应商下拉筛选、时间范围（全部/近 6 月/近 3 月）、搜索框实时过滤。
- KPI 数字滚动动画、条形图逐条生长、环形图扇区点击弹出。
- 新建订单弹窗（仅前端预览，刷新还原）。

---

## 四、数据口径（和业务方对齐过）

- **KPI 只统计"已通过"的订单**：126 行，采购总额 ¥1,741 万。
- **环形图显示全部 189 条申请单**：已通过 126 / 已撤回 42 / 已拒绝 20 / 已删除 1。
- **外币折人民币**：USD × 7.2，EUR × 7.8（实习期间约定汇率）。
- **应付数据**：应付 ¥425.7 万 / 已付 ¥255.0 万 / 未付 ¥170.6 万。
- **在途未出货**：6 笔，2,520 件。
- **Top 3 供应商**：SECO SPA ¥587.9 万、浙江启扬 ¥441.4 万、杭州凡诺 ¥233.1 万。
- **国内外占比**：国内 104 行 ¥1,146.9 万；国外 22 行 ¥594.2 万。

> 教训：数据不能自己编，每一个数字都要能追溯到 Excel 原表某一行。

---

## 五、踩过的坑（最有价值的部分）

1. **openpyxl `read_only=True` 读不到行**：这个采购订单表必须用 `read_only=False` 打开，否则返回 0 行，一开始以为是文件坏了。
2. **Chart.js 在 `display:none` 的容器里建图会 0 尺寸**：分析页一开始藏着，切过去时图表空白。解决办法：切到该视图时再惰性创建图表，并在 `setTimeout` 里 `chart.resize()`。
3. **CSS `animation: ... both` 导致隐藏元素变可见后卡在 opacity 0**：`.card` 和 `.view` 的入场动画带 fill-mode，父容器 `display:none` 再显示时动画不重启，卡片全透明。去掉这两个容器的入场动画，只保留 hover 过渡。
4. **PowerShell 把 git 的 stderr 进度输出当成报错**：其实 push 成功了，要 `git log` 复核，别看到红字就重推。
5. **Vercel 免费域名国内访问不稳定**：别人打不开网站，不是代码问题，是 `*.vercel.app` 在国内网络下经常超时。后续要长期用得绑自定义域名或换 Cloudflare Pages。

---

## 六、简历/面试话术（可以直接用）

**项目名称**：采购订单数据可视化看板（个人项目 / 实习实战）

**时间**：2026 年暑假实习期间

**技术栈**：HTML / CSS / JavaScript / Chart.js / Python(openpyxl) / GitHub / Vercel

**项目描述**：
> 实习期间从 ERP 系统导出采购订单与应付台账两份 Excel（共 278 行），基于业务口径统一汇率折算后，独立设计并开发了一个数据仪表盘。前端用原生 JS + Chart.js 实现多视图切换、供应商/时间范围/关键词三维筛选、KPI 数字动画与交互式图表；后端无服务，用 Python 脚本将 Excel 清洗为结构化 JSON 静态托管。项目通过 GitHub 版本管理、Vercel 自动部署上线，供采购组同事直接访问。

**我做了什么**：
- 梳理 ERP 表字段，与主管对齐 KPI 口径（只统计已通过订单、外币折人民币）。
- 用 Python + openpyxl 清洗 189 行订单数据，统一汇率，输出结构化数据文件。
- 设计并实现总览、订单列表、物料库、数据分析四个视图，含 KPI 卡、趋势图、环形图、Top 供应商条形图。
- 实现联动筛选：选供应商/时间范围后 KPI、图表、明细全部实时重算。
- 加入交互动效：KPI 数字滚动、条形生长、环形图扇区点击弹出、卡片悬浮反馈。
- 处理 Chart.js 隐藏容器 0 尺寸、CSS 动画 fill-mode 导致元素透明等前端问题。
- 用 Vercel 完成 CI/CD：每次 push 自动部署，公网可访问。

**可聊的延伸问题**：
- 为什么不用框架？——数据量小、纯静态展示，原生 JS 更快上手也够维护。
- 如果数据量大了怎么办？——加一个简单后端 API，前端从接口拉数据而不是读静态 data.js。
- 数据更新频率？——目前是每周重跑一次 Python 脚本重新生成 data.js；后续可以做成飞书多维表格直接当数据源。

---

## 七、目录结构

```
procurement-dashboard/
├── index.html          # 页面骨架（侧边栏 + 四个 view + 弹窗 + toast）
├── styles.css          # Apple 风格设计 token + 响应式布局
├── app.js              # 状态驱动的渲染逻辑（KPI/图表/筛选/交互）
├── data.js             # Python 脚本生成的数据文件
├── compute_data.py     # Excel → data.js 的转换脚本
└── README.md
```
