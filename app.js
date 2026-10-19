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

// ====== KPI ======
document.getElementById('kpiOrders').textContent = DATA.kpi.orderCount;
document.getElementById('kpiAmount').textContent = wan(DATA.kpi.totalCny);
document.getElementById('kpiPending').textContent = DATA.kpi.pendingCount;
document.getElementById('kpiPendingSub').textContent = `笔 · ${DATA.kpi.pendingQty.toLocaleString()} 件未发`;
document.getElementById('kpiUnpaid').textContent = wan(DATA.kpi.unpaid);
document.getElementById('kpiPaySub').textContent =
  `应付 ${wan(DATA.kpi.payable)} / 已付 ${wan(DATA.kpi.paid)}`;
document.getElementById('donutTotal').textContent =
  DATA.statusDist.reduce((a, b) => a + b.value, 0);

// ====== Supplier bars ======
const barList = document.getElementById('barList');
const maxAmt = Math.max(...DATA.suppliers.map(s => s.amt));
DATA.suppliers.forEach(s => {
  const row = document.createElement('div');
  row.className = 'bar-row';
  row.innerHTML = `
    <span class="bar-name" title="${s.name}">${s.name}</span>
    <div class="bar-track">
      <div class="bar-fill on" style="width:${(s.amt / maxAmt * 100).toFixed(1)}%"></div>
    </div>
    <span class="bar-value">${(s.amt / 10000).toFixed(1)}万</span>`;
  barList.appendChild(row);
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
