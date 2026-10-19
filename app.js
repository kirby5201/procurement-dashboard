// ====== Design tokens ======
const C = {
  primary: '#0071E3',
  blue: '#0A84FF',
  green: '#34C759',
  amber: '#FF9F0A',
  red: '#FF3B30',
  gray: '#8E8E93',
  text2: '#6E6E73',
  grid: '#EBEBF0'
};

const STATUS_COLOR = {
  '已通过': C.green,
  '已撤回': C.amber,
  '已拒绝': C.red,
  '已删除': C.gray
};

const wan = v => '¥' + (v / 10000).toFixed(1) + '万';

// ====== Count-up KPI ======
function countUp(el, target, decimals = 0, prefix = '', suffix = '', dur = 1100) {
  const t0 = performance.now();
  function tick(t) {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    const v = target * e;
    el.textContent = prefix + v.toLocaleString(undefined, {
      minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

countUp(document.getElementById('kpiOrders'), DATA.kpi.orderCount);
countUp(document.getElementById('kpiAmount'), DATA.kpi.totalCny / 10000, 1, '¥', '万');
countUp(document.getElementById('kpiPending'), DATA.kpi.pendingCount);
document.getElementById('kpiPendingSub').textContent = `笔 · ${DATA.kpi.pendingQty.toLocaleString()} 件未发`;
document.getElementById('kpiUnpaid').textContent = wan(DATA.kpi.unpaid);
document.getElementById('kpiPaySub').textContent =
  `应付 ${wan(DATA.kpi.payable)} / 已付 ${wan(DATA.kpi.paid)}`;
document.getElementById('donutTotal').textContent =
  DATA.statusDist.reduce((a, b) => a + b.value, 0);

// ====== Supplier bars (grow-in) ======
const barList = document.getElementById('barList');
const maxAmt = Math.max(...DATA.suppliers.map(s => s.amt));
DATA.suppliers.forEach((s, i) => {
  const row = document.createElement('div');
  row.className = 'bar-row';
  row.innerHTML = `
    <span class="bar-name" title="${s.name}">${s.name}</span>
    <div class="bar-track">
      <div class="bar-fill on" style="width:0%"></div>
    </div>
    <span class="bar-value">${(s.amt / 10000).toFixed(1)}万</span>`;
  barList.appendChild(row);
  requestAnimationFrame(() => {
    setTimeout(() => {
      row.querySelector('.bar-fill').style.width = (s.amt / maxAmt * 100).toFixed(1) + '%';
    }, i * 90);
  });
});

// ====== Donut: approval status ======
new Chart(document.getElementById('statusDonut'), {
  type: 'doughnut',
  data: {
    labels: DATA.statusDist.map(s => s.name),
    datasets: [{
      data: DATA.statusDist.map(s => s.value),
      backgroundColor: DATA.statusDist.map(s => STATUS_COLOR[s.name] || C.gray),
      borderWidth: 0,
      spacing: 2
    }]
  },
  options: {
    cutout: '72%',
    plugins: { legend: { display: false }, tooltip: { enabled: true } }
  }
});

const legend = document.getElementById('donutLegend');
DATA.statusDist.forEach(s => {
  const item = document.createElement('span');
  item.className = 'dl-item';
  item.innerHTML = `<i class="dl-dot" style="background:${STATUS_COLOR[s.name] || C.gray}"></i>${s.name} ${s.value}`;
  legend.appendChild(item);
});

// ====== Trend line: monthly amount (万元) ======
new Chart(document.getElementById('trendLine'), {
  type: 'line',
  data: {
    labels: DATA.trend.map(t => t.m.slice(5).replace('-', '月')),
    datasets: [
      {
        label: '采购额(万元)',
        data: DATA.trend.map(t => +(t.amt / 10000).toFixed(1)),
        borderColor: C.primary,
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return C.primary;
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, 'rgba(0,113,227,.25)');
          g.addColorStop(1, 'rgba(0,113,227,0)');
          return g;
        },
        fill: true,
        tension: .35,
        pointRadius: 3.5,
        pointBackgroundColor: '#fff',
        pointBorderColor: C.primary,
        pointBorderWidth: 2
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: C.text2, font: { size: 11 } } },
      y: { grid: { color: C.grid }, ticks: { color: C.text2, font: { size: 11 } }, border: { display: false } }
    }
  }
});

document.getElementById('rangeNote').textContent =
  `国内订单 ${DATA.range.domestic.count} 笔 · ${wan(DATA.range.domestic.amt)}　｜　国外订单 ${DATA.range.foreign.count} 笔 · ${wan(DATA.range.foreign.amt)}`;

// ====== Detail table ======
const tbody = document.getElementById('orderTable');
DATA.detail.forEach(o => {
  const pill = o.status === '部分到货' ? 'blue' : 'amber';
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="order-no">${o.po}</td>
    <td class="order-meta">${o.supplier}</td>
    <td class="order-meta">${o.pn}</td>
    <td class="order-meta">${o.qty.toLocaleString()}</td>
    <td class="order-meta">${o.unship.toLocaleString()}</td>
    <td><span class="pill ${pill}">${o.status}</span></td>`;
  tbody.appendChild(tr);
});

// empty state row
const emptyRow = document.createElement('tr');
emptyRow.style.display = 'none';
emptyRow.innerHTML = `<td colspan="6" style="text-align:center;color:var(--text-2);padding:24px 0;">无匹配的在途订单</td>`;
tbody.appendChild(emptyRow);
const detailRows = () => [...tbody.querySelectorAll('tr')].filter(r => r !== emptyRow);

// ====== Search: filters in-transit table by po / supplier / pn ======
const searchInput = document.querySelector('.search input');
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  let shown = 0;
  detailRows().forEach(tr => {
    const match = tr.textContent.toLowerCase().includes(q);
    tr.style.display = match ? '' : 'none';
    if (match) shown++;
  });
  emptyRow.style.display = q && shown === 0 ? '' : 'none';
});

// ====== Nav: highlight + smooth scroll to relevant section ======
const navItems = [...document.querySelectorAll('.nav-item')];
const cards = [...document.querySelectorAll('.card')];
const byTitle = t => cards.find(c => c.querySelector('.card-head h2')?.textContent.includes(t));
const anchorMap = {
  '总览': document.querySelector('.main'),
  '采购订单': byTitle('在途出货明细'),
  '供应商': byTitle('供应商采购额'),
  '数据分析': byTitle('月度采购金额趋势'),
  '物料库': byTitle('在途出货明细'),
};
navItems.forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    navItems.forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    const label = a.querySelector('span').textContent;
    const target = anchorMap[label];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
