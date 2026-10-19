// ====== Design tokens ======
const C = {
  primary: '#0071E3', blue: '#0A84FF', green: '#34C759',
  amber: '#FF9F0A', red: '#FF3B30', gray: '#8E8E93',
  text2: '#6E6E73', grid: '#EBEBF0'
};
const STATUS_COLOR = { '已通过': C.green, '已撤回': C.amber, '已拒绝': C.red, '已删除': C.gray };
const wan = v => '¥' + (v / 10000).toFixed(1) + '万';
const fmt = n => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 0 });

// ====== State ======
const state = { supplier: '全部', range: '全部', q: '' };
let charts = {};
let donutFocus = null;

const approvedAll = DATA.orders.filter(o => o.status === '已通过');
const maxYm = approvedAll.map(o => o.ym).filter(Boolean).sort().slice(-1)[0];

function ymBefore(ym, months) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 - months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function inRange(o) {
  if (state.range === '全部' || !o.ym) return true;
  const span = state.range === '近3月' ? 2 : 5; // inclusive
  return o.ym >= ymBefore(maxYm, span);
}
function baseOrders() {
  return approvedAll.filter(o =>
    (state.supplier === '全部' || o.supplier === state.supplier) && inRange(o));
}
function allFiltered() {
  return DATA.orders.filter(o =>
    (state.supplier === '全部' || o.supplier === state.supplier) && inRange(o));
}

// ====== Count-up ======
function countUp(el, target, decimals = 0, prefix = '', suffix = '', dur = 900) {
  const t0 = performance.now();
  (function tick(t) {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = prefix + (target * e).toLocaleString('zh-CN', {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

// ====== Render: KPI ======
function renderKPI() {
  const list = baseOrders();
  const orders = new Set(list.map(o => o.po)).size;
  const amt = list.reduce((a, b) => a + b.lineCny, 0);
  const pend = DATA.pending.filter(p => state.supplier === '全部' || p.supplier === state.supplier);
  const pendQty = pend.reduce((a, b) => a + b.unship, 0);
  countUp(document.getElementById('kpiOrders'), orders, 0);
  document.getElementById('kpiOrdersSub').textContent = `行项目 ${list.length} 条`;
  countUp(document.getElementById('kpiAmount'), amt / 10000, 1, '¥', '万');
  countUp(document.getElementById('kpiPending'), pend.length, 0);
  document.getElementById('kpiPendingSub').textContent = `笔 · ${fmt(pendQty)} 件未发`;
  document.getElementById('kpiUnpaid').textContent = wan(DATA.payable.unpaid);
  document.getElementById('kpiPaySub').textContent =
    `应付 ${wan(DATA.payable.payable)} / 已付 ${wan(DATA.payable.paid)}`;
}

// ====== Render: bars ======
function renderBars(containerId, list, n) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  const max = Math.max(...list.map(s => s.amt), 1);
  list.slice(0, n).forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    row.title = '点击筛选该供应商';
    row.innerHTML = `
      <span class="bar-name" title="${s.name}">${s.name}</span>
      <div class="bar-track"><div class="bar-fill on" style="width:0%"></div></div>
      <span class="bar-value">${(s.amt / 10000).toFixed(1)}万</span>`;
    row.addEventListener('click', () => {
      state.supplier = (state.supplier === s.name) ? '全部' : s.name;
      document.getElementById('supplierFilter').value = state.supplier;
      renderAll();
    });
    el.appendChild(row);
    requestAnimationFrame(() => setTimeout(() => {
      row.querySelector('.bar-fill').style.width = (s.amt / max * 100).toFixed(1) + '%';
    }, i * 70));
  });
}
function supplierAgg(list) {
  const m = {};
  list.forEach(o => { m[o.supplier] = (m[o.supplier] || 0) + o.lineCny; });
  return Object.entries(m).map(([name, amt]) => ({ name, amt })).sort((a, b) => b.amt - a.amt);
}

// ====== Charts ======
function destroyChart(key) { if (charts[key]) { charts[key].destroy(); charts[key] = null; } }
const chartOpts = yLabel => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: C.text2, font: { size: 11 } } },
    y: { grid: { color: C.grid }, ticks: { color: C.text2, font: { size: 11 } }, border: { display: false } }
  }
});

function renderCharts() {
  const list = baseOrders();

  // status donut (supplier-filtered, all statuses)
  destroyChart('donut');
  const sd = {};
  allFiltered().forEach(o => { sd[o.status] = (sd[o.status] || 0) + 1; });
  const sdKeys = Object.keys(sd);
  const totalCount = allFiltered().length;
  if (donutFocus && !sd[donutFocus]) donutFocus = null;
  const updateDonutCenter = (label) => {
    const lab = document.getElementById('donutCenterLabel');
    const num = document.getElementById('donutTotal');
    if (label) {
      lab.textContent = label;
      num.textContent = sd[label];
      num.style.color = STATUS_COLOR[label] || C.gray;
    } else {
      lab.textContent = '申请单总数';
      num.textContent = totalCount;
      num.style.color = '';
    }
  };
  charts.donut = new Chart(document.getElementById('statusDonut'), {
    type: 'doughnut',
    data: { labels: sdKeys, datasets: [{
      data: sdKeys.map(k => sd[k]),
      backgroundColor: sdKeys.map(k => STATUS_COLOR[k] || C.gray),
      borderWidth: 0, spacing: 2, hoverOffset: 16
    }]},
    options: {
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      animation: { animateRotate: true, duration: 900 },
      onHover: (evt, els) => {
        evt.native.target.style.cursor = els.length ? 'pointer' : 'default';
        if (els.length) updateDonutCenter(sdKeys[els[0].index]);
        else updateDonutCenter(donutFocus);
      },
      onClick: (evt, els) => {
        if (!els.length) { donutFocus = null; updateDonutCenter(null); }
        else {
          const label = sdKeys[els[0].index];
          donutFocus = (donutFocus === label) ? null : label;
          updateDonutCenter(donutFocus);
        }
        charts.donut.update();
      }
    },
    plugins: [{
      id: 'focusExplode',
      beforeDatasetsDraw(chart) {
        if (!donutFocus) return;
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((arc, i) => {
          arc.options.offset = (sdKeys[i] === donutFocus) ? 20 : 2;
        });
      }
    }]
  });
  updateDonutCenter(donutFocus);
  const legend = document.getElementById('donutLegend');
  legend.innerHTML = '';
  sdKeys.forEach(k => {
    const it = document.createElement('span');
    it.className = 'dl-item' + (donutFocus === k ? ' active' : '');
    it.style.cursor = 'pointer';
    it.innerHTML = `<i class="dl-dot" style="background:${STATUS_COLOR[k] || C.gray}"></i>${k} ${sd[k]}`;
    it.onclick = () => { donutFocus = (donutFocus === k) ? null : k; updateDonutCenter(donutFocus); charts.donut.update(); };
    legend.appendChild(it);
  });

  // trend line
  destroyChart('trend');
  const tm = {};
  list.forEach(o => { tm[o.ym] = (tm[o.ym] || 0) + o.lineCny; });
  const tms = Object.keys(tm).sort();
  charts.trend = new Chart(document.getElementById('trendLine'), {
    type: 'line',
    data: { labels: tms.map(m => m.slice(5) + '月'), datasets: [{
      data: tms.map(m => +(tm[m] / 10000).toFixed(1)),
      borderColor: C.primary, backgroundColor: ctx => {
        const { chart } = ctx, { ctx: c, chartArea } = chart;
        if (!chartArea) return C.primary;
        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        g.addColorStop(0, 'rgba(0,113,227,.25)'); g.addColorStop(1, 'rgba(0,113,227,0)');
        return g;
      },
      fill: true, tension: .35, pointRadius: 3.5, pointBackgroundColor: '#fff',
      pointBorderColor: C.primary, pointBorderWidth: 2
    }]},
    options: chartOpts()
  });

  const dom = list.filter(o => o.domestic).reduce((a, b) => a + b.lineCny, 0);
  const frg = list.filter(o => !o.domestic).reduce((a, b) => a + b.lineCny, 0);
  document.getElementById('rangeNote').textContent =
    `国内订单 ${list.filter(o => o.domestic).length} 行 · ${wan(dom)}　｜　国外订单 ${list.filter(o => !o.domestic).length} 行 · ${wan(frg)}`;

  // ===== analytics view (lazy: only when visible) =====
  renderAnalyticsCharts(list);
}

function renderAnalyticsCharts(list) {
  if (document.getElementById('view-analytics').classList.contains('hidden')) return;
  if (!list) list = baseOrders();

  destroyChart('combo');
  const cm = {};
  list.forEach(o => { cm[o.ym] = cm[o.ym] || { n: 0, amt: 0 }; cm[o.ym].n++; cm[o.ym].amt += o.lineCny; });
  const cms = Object.keys(cm).sort();
  charts.combo = new Chart(document.getElementById('comboChart'), {
    data: {
      labels: cms.map(m => m.slice(5) + '月'),
      datasets: [
        { type: 'bar', label: '笔数', data: cms.map(m => cm[m].n), backgroundColor: 'rgba(10,132,255,.35)', borderRadius: 4, yAxisID: 'y' },
        { type: 'line', label: '金额(万)', data: cms.map(m => +(cm[m].amt / 10000).toFixed(1)), borderColor: C.primary, pointRadius: 3, tension: .35, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 11 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: C.text2, font: { size: 11 } } },
        y: { position: 'left', grid: { color: C.grid }, ticks: { color: C.text2, font: { size: 11 } }, border: { display: false }, title: { display: true, text: '笔数', color: C.text2 } },
        y1: { position: 'right', grid: { display: false }, ticks: { color: C.primary, font: { size: 11 } }, border: { display: false }, title: { display: true, text: '万元', color: C.primary } }
      }
    }
  });

  const dom = list.filter(o => o.domestic).reduce((a, b) => a + b.lineCny, 0);
  const frg = list.filter(o => !o.domestic).reduce((a, b) => a + b.lineCny, 0);
  document.getElementById('rgDomAmt').textContent = wan(dom);
  document.getElementById('rgForAmt').textContent = wan(frg);
  const total = dom + frg || 1;
  requestAnimationFrame(() => {
    document.getElementById('rgDomBar').style.width = (dom / total * 100) + '%';
    document.getElementById('rgForBar').style.width = (frg / total * 100) + '%';
  });

  destroyChart('hist');
  const buckets = [0, 50000, 200000, 500000, 1000000, Infinity];
  const labels = ['<5万', '5-20万', '20-50万', '50-100万', '>100万'];
  const cnt = new Array(5).fill(0);
  list.forEach(o => {
    for (let i = 0; i < 5; i++) if (o.lineCny >= buckets[i] && o.lineCny < buckets[i + 1]) cnt[i]++;
  });
  charts.hist = new Chart(document.getElementById('histChart'), {
    type: 'bar',
    data: { labels, datasets: [{ data: cnt, backgroundColor: C.blue, borderRadius: 4 }]},
    options: chartOpts()
  });
}

// ===== Render: pending table ======
function renderPending() {
  const tbody = document.getElementById('orderTable');
  tbody.innerHTML = '';
  const pend = DATA.pending.filter(p => state.supplier === '全部' || p.supplier === state.supplier);
  pend.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="order-no">${p.po}</td>
      <td class="order-meta">${p.supplier}</td>
      <td class="order-meta">${p.pn}</td>
      <td class="order-meta">${wan(p.amt)}</td>
      <td class="order-meta">${fmt(p.unship)}</td>
      <td><span class="pill ${p.status === '部分到货' ? 'blue' : 'amber'}">${p.status}</span></td>`;
    tbody.appendChild(tr);
  });
}

// ===== Render: full orders =====
function renderOrders() {
  const tbody = document.getElementById('fullOrderTable');
  tbody.innerHTML = '';
  const q = state.q.toLowerCase();
  const list = allFiltered().filter(o =>
    !q || `${o.po}${o.supplier}${o.pn}${o.desc}`.toLowerCase().includes(q));
  document.getElementById('orderCountText').textContent = list.length;
  list.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="order-no">${o.po}</td>
      <td>${o.ym}</td>
      <td class="order-meta">${o.supplier}</td>
      <td class="order-meta">${o.pn}</td>
      <td class="order-meta">${o.desc}</td>
      <td>${fmt(o.qty)}</td>
      <td>${o.unitCny.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}</td>
      <td>${fmt(o.lineCny)}</td>
      <td><span class="pill ${o.status === '已通过' ? 'green' : 'gray'}">${o.status}</span></td>`;
    tbody.appendChild(tr);
  });
}

// ===== Render: materials =====
function renderMaterials() {
  const tbody = document.getElementById('materialTable');
  tbody.innerHTML = '';
  const q = state.q.toLowerCase();
  const m = {};
  baseOrders().forEach(o => {
    if (!m[o.pn]) m[o.pn] = { pn: o.pn, desc: o.desc, sups: new Set(), n: 0, qty: 0, amt: 0 };
    m[o.pn].sups.add(o.supplier); m[o.pn].n++; m[o.pn].qty += o.qty; m[o.pn].amt += o.lineCny;
  });
  let list = Object.values(m).sort((a, b) => b.amt - a.amt);
  document.getElementById('matCountText').textContent = list.length;
  list = list.filter(x => !q || `${x.pn}${x.desc}${[...x.sups].join('')}`.toLowerCase().includes(q));
  list.forEach(x => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="order-no">${x.pn}</td>
      <td class="order-meta">${x.desc}</td>
      <td class="order-meta">${[...x.sups].join('、')}</td>
      <td>${x.n}</td>
      <td>${fmt(x.qty)}</td>
      <td>${fmt(x.amt)}</td>`;
    tbody.appendChild(tr);
  });
}

// ===== Render: supplier dropdown =====
function renderSupplierSelect() {
  const sel = document.getElementById('supplierFilter');
  const cur = state.supplier;
  const sups = [...new Set(approvedAll.map(o => o.supplier))].sort();
  sel.innerHTML = '<option>全部</option>' + sups.map(s => `<option>${s}</option>`).join('');
  sel.value = cur;
}

// ===== Master rerender =====
function renderAll() {
  renderKPI();
  renderCharts();
  renderBars('barList', supplierAgg(baseOrders()), 8);
  renderBars('barList10', supplierAgg(baseOrders()), 10);
  renderPending();
  renderOrders();
  renderMaterials();
}

// ===== View switching =====
const TITLES = {
  overview: '采购订单总览', orders: '采购订单列表',
  materials: '物料库', analytics: '数据分析', settings: '设置'
};
function showView(v) {
  document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
  document.getElementById('view-' + v)?.classList.remove('hidden');
  document.getElementById('viewTitle').textContent = TITLES[v] || TITLES.overview;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === v));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (v === 'analytics') renderAnalyticsCharts();
  setTimeout(() => Object.values(charts).forEach(c => c && c.resize && c.resize()), 80);
}

document.getElementById('nav').addEventListener('click', e => {
  const a = e.target.closest('.nav-item'); if (!a) return;
  e.preventDefault();
  if (a.dataset.view === 'settings') { toast('设置模块建设中'); return; }
  if (a.dataset.scroll === 'supplier') {
    showView('overview');
    setTimeout(() => document.getElementById('supplierCard').scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    return;
  }
  if (a.dataset.view) showView(a.dataset.view);
});

// ===== Filters =====
document.getElementById('supplierFilter').addEventListener('change', e => {
  state.supplier = e.target.value; renderAll();
});
document.getElementById('rangeSeg').addEventListener('click', e => {
  if (e.target.tagName !== 'BUTTON') return;
  document.querySelectorAll('#rangeSeg button').forEach(b => b.classList.remove('active'));
  e.target.classList.add('active');
  state.range = e.target.dataset.range; renderAll();
});
document.getElementById('searchInput').addEventListener('input', e => {
  state.q = e.target.value; renderOrders(); renderMaterials();
});

// ===== Toast =====
let toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

// ===== Modal =====
const mask = document.getElementById('modalMask');
document.getElementById('newOrderBtn').addEventListener('click', () => mask.classList.remove('hidden'));
document.getElementById('modalClose').addEventListener('click', () => mask.classList.add('hidden'));
document.getElementById('modalCancel').addEventListener('click', () => mask.classList.add('hidden'));
document.getElementById('modalSave').addEventListener('click', () => {
  const qty = parseFloat(document.getElementById('fQty').value) || 0;
  const unit = parseFloat(document.getElementById('fUnit').value) || 0;
  DATA.orders.push({
    po: document.getElementById('fPo').value || '未编号',
    ym: new Date().toISOString().slice(0, 7),
    supplier: document.getElementById('fSupplier').value || '未知供应商',
    pn: document.getElementById('fPn').value || '—',
    desc: document.getElementById('fDesc').value || '',
    qty, unitCny: unit, lineCny: qty * unit,
    status: document.getElementById('fStatus').value,
    domestic: true
  });
  mask.classList.add('hidden');
  ['fPo', 'fSupplier', 'fPn', 'fDesc', 'fQty', 'fUnit'].forEach(id => document.getElementById(id).value = '');
  renderSupplierSelect(); renderAll();
  toast('订单已添加（仅本次预览，刷新后还原）');
});

// ===== Init =====
renderSupplierSelect();
renderAll();
const initView = (location.hash || '').slice(1);
if (TITLES[initView]) showView(initView);
