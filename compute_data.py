# -*- coding: utf-8 -*-
"""从 ERP 采购订单 + 应付表真实计算仪表盘数据，输出 data.js。"""
import openpyxl, sys, json, datetime
from collections import defaultdict, OrderedDict
sys.stdout.reconfigure(encoding='utf-8')

F1 = r"C:\Users\kirby\Desktop\简历\赛柯实习\ERP_hub_采购订单 ！ (1).xlsx"
F2 = r"C:\Users\kirby\Desktop\简历\赛柯实习\ERP_hub_应付.xlsx"
OUT = r"C:\Users\kirby\Doubao\chats\2026-10-19\new-chat\procurement-dashboard\data.js"

USD = 7.2
EUR = 7.8

def num(v):
    if v is None: return 0.0
    if isinstance(v, (int, float)): return float(v)
    s = str(v).replace(",", "").replace("¥", "").replace("$", "").strip()
    try: return float(s)
    except: return 0.0

def to_cny(amount, currency):
    c = str(currency).strip().upper()
    if c == "USD": return amount * USD
    if c == "EUR": return amount * EUR
    return amount

# ---------- File1 采购订单 ----------
wb = openpyxl.load_workbook(F1, read_only=False, data_only=True)
ws = wb["采购订单 ！"]
rows = list(ws.iter_rows(values_only=True))
h = rows[0]
ix = {k: i for i, k in enumerate(h)}
data1 = [r for r in rows[1:] if any(v not in (None, "") for v in r)]
wb.close()

def g(r, name): return r[ix[name]]

# 状态分布（全部 189 笔）
status_counter = defaultdict(int)
for r in data1:
    status_counter[str(g(r, "申请状态"))] += 1

# 仅已通过
passed = [r for r in data1 if str(g(r, "申请状态")) == "已通过"]

total_cny = 0.0
month_count = defaultdict(int)
month_amt = defaultdict(float)
supplier = defaultdict(float)
domestic = {"count": 0, "amt": 0.0}
foreign = {"count": 0, "amt": 0.0}

for r in passed:
    amt = to_cny(num(g(r, "总价")), g(r, "币种"))
    total_cny += amt
    od = g(r, "订单日期")
    if isinstance(od, datetime.datetime):
        key = od.strftime("%Y-%m")
        month_count[key] += 1
        month_amt[key] += amt
    sup = str(g(r, "公司名称")).strip()
    supplier[sup] += amt
    rng = str(g(r, "订单范围"))
    if "国外" in rng:
        foreign["count"] += 1; foreign["amt"] += amt
    else:
        domestic["count"] += 1; domestic["amt"] += amt

months = sorted(month_count.keys())
trend = [{"m": m, "count": month_count[m], "amt": round(month_amt[m])} for m in months]

top_sup = sorted(supplier.items(), key=lambda x: -x[1])[:8]
suppliers = [{"name": n, "amt": round(a)} for n, a in top_sup]

# ---------- File2 应付 ----------
wb = openpyxl.load_workbook(F2, read_only=True, data_only=True)
ws = wb["应付"]
rows = list(ws.iter_rows(values_only=True))
h2 = rows[0]
ix2 = {k: i for i, k in enumerate(h2)}
data2 = [r for r in rows[1:] if any(v not in (None, "") for v in r)]
wb.close()
def g2(r, name): return r[ix2[name]]

payable = sum(num(g2(r, "AP/应付 CNY")) for r in data2)
paid = sum(num(g2(r, "实付 CNY")) for r in data2)
unpaid = payable - paid

pending = [r for r in data2 if num(g2(r, "未出货数量")) > 0]
pending_qty = sum(num(g2(r, "未出货数量")) for r in pending)

detail = []
for r in pending:
    eta = g2(r, "预计出货时间（合同）")
    eta_s = eta.strftime("%Y-%m-%d") if isinstance(eta, datetime.datetime) else ""
    shipped = num(g2(r, "已出货数量"))
    status = "部分到货" if shipped > 0 else "待发货"
    detail.append({
        "po": str(g2(r, "订单编号")),
        "supplier": str(g2(r, "公司名称/公司名称")) if "公司名称/公司名称" in ix2 else str(g2(r, "CompanyName/公司名称")),
        "pn": str(g2(r, "料号")),
        "qty": num(g2(r, "数量")),
        "eta": eta_s,
        "unship": int(num(g2(r, "未出货数量"))),
        "status": status,
    })

result = OrderedDict([
    ("kpi", {
        "orderCount": len(passed),
        "totalCny": round(total_cny),
        "pendingCount": len(pending),
        "pendingQty": int(pending_qty),
        "payable": round(payable),
        "paid": round(paid),
        "unpaid": round(unpaid),
    }),
    ("statusDist", [{"name": k, "value": v} for k, v in sorted(status_counter.items(), key=lambda x: -x[1])]),
    ("trend", trend),
    ("suppliers", suppliers),
    ("range", {
        "domestic": {"count": domestic["count"], "amt": round(domestic["amt"])},
        "foreign": {"count": foreign["count"], "amt": round(foreign["amt"])},
    }),
    ("detail", detail),
])

js = "// 自动从 ERP 表计算生成，勿手改。汇率：USD=%.1f EUR=%.1f\nconst DATA = %s;\n" % (USD, EUR, json.dumps(result, ensure_ascii=False, indent=2))
with open(OUT, "w", encoding="utf-8") as f:
    f.write(js)

print(json.dumps(result, ensure_ascii=False, indent=2))
