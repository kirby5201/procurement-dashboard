// ====== Design tokens ======
const C = {
  primary: '#0071E3',
  blue: '#0A84FF',
  green: '#34C759',
  amber: '#FF9F0A',
  red: '#FF3B30',
  gray: '#6E6E73',
  grid: '#EBEBF0'
};

// ====== Data (示例数据，替换为你的真实接口) ======
const suppliers = [
  { name: '供应商 A', value: 96 },
  { name: '供应商 B', value: 92 },
  { name: '供应商 C', value: 88 },
  { name: '供应商 D', value: 81 }
];
const target = 90;

const status = [
  { label: '已完成', value: 58, color: C.green },
  { label: '运输中', value: 22, color: C.blue },
  { label: '处理中', value: 12, color: C.amber },
  { label: '延期',   value: 8,  color: C.red }
];

const months = ['3月','4月','5月','6月','7月','8月','9月','10月'];
const actual =  [18, 24, 32, 28, 34, 42, 36, 38];
const plan =    [20, 24, 30, 30, 32, 36, 36, 36];

const orders = [
  { no: 'PO-2410-008', meta: '供应商 A · 预计10月21日', pill: ['blue', '运输中'] },
  { no: 'PO-2410-011', meta: '供应商 C · 预计10月23日', pill: ['amber', '处理中'] },
  { no: 'PO-2410-014', meta: '供应商 B · 预计10月25日', pill: ['blue', '运输中'] },
  { no: 'PO-2410-017', meta: '供应商 D · 预计10月26日', pill: ['red', '延期'] }
];

// ====== Render: horizontal bars with target line ======
const barList = document.getElementById('barList');
suppliers.forEach(s => {
  const row = document.createElement('div');
  row.className = 'bar-row';
  row.innerHTML = `
    <span class="bar-name">${s.name}</span>
    <div class="bar-track">
      <div class="bar-fill ${s.value >= target ? 'on' : 'off'}" style="width:${s.value}%"></div>
    </div>
    <span class="bar-value">${s.value}%</span>`;
  barList.appendChild(row);
});

// target dashed line overlay (approximate at 90% position)
const trackFirst = barList.querySelector('.bar-track');
function drawTargetLine() {
  const old = barList.querySelector('.target-line');
  if (old) old.remove();
  const x = (target / 100) * trackFirst.getBoundingClientRect().width;
  const line = document.createElement('div');
  line.className = 'target-line';
  line.style.cssText = `position:absolute;left:${x}px;top:-8px;bottom:-8px;border-left:2px dashed #C7C7CE;z-index:2;pointer-events:none;`;
  trackFirst.parentElement.style.position = 'relative';
  trackFirst.parentElement.appendChild(line);
}
drawTargetLine();
window.addEventListener('resize', drawTargetLine);

// ====== Render: donut ======
new Chart(document.getElementById('statusDonut'), {
  type: 'doughnut',
  data: {
    labels: status.map(s => s.label),
    datasets: [{
      data: status.map(s => s.value),
      backgroundColor: status.map(s => s.color),
      borderWidth: 0,
      spacing: 2,
      circumference: 360
    }]
  },
  options: {
    cutout: '72%',
    plugins: { legend: { display: false }, tooltip: { enabled: true } }
  }
});

const legend = document.getElementById('donutLegend');
status.forEach(s => {
  const item = document.createElement('span');
  item.className = 'dl-item';
  item.innerHTML = `<i class="dl-dot" style="background:${s.color}"></i>${s.label} ${s.value}%`;
  legend.appendChild(item);
});

// ====== Render: trend line ======
new Chart(document.getElementById('trendLine'), {
  type: 'line',
  data: {
    labels: months,
    datasets: [
      {
        label: '实际',
        data: actual,
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
      },
      {
        label: '计划',
        data: plan,
        borderColor: '#B8B8BE',
        borderDash: [6, 6],
        pointRadius: 0,
        tension: .35,
        fill: false
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: C.gray, font: { size: 11 } } },
      y: { grid: { color: C.grid }, ticks: { color: C.gray, font: { size: 11 } }, border: { display: false } }
    }
  }
});

// ====== Render: order table ======
const tbody = document.getElementById('orderTable');
orders.forEach(o => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="order-no">${o.no}</td>
    <td class="order-meta">${o.meta}</td>
    <td style="text-align:right"><span class="pill ${o.pill[0]}">${o.pill[1]}</span></td>`;
  tbody.appendChild(tr);
});
