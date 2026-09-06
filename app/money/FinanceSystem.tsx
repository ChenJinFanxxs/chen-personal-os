/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSyncedState } from "../private-store";

type Tx = { id: string; type: "income" | "expense"; amount: number; date: string; category: string; account: string; note: string };
type Account = { id: string; name: string; group: "cash" | "deposit" | "emergency" | "goal" | "liability"; balance: number };
type Goal = { id: string; name: string; target: number; current: number; deadline: string; type: "短期" | "中期" | "长期"; priority: string; note: string; icon?: string; description?: string; image?: string };
type Allocation = { id: string; date: string; amount: number; plan: Record<string, number>; source?: string };
type Investment = { id: string; name: string; type: string; buyDate: string; invested: number; currentValue: number; quantity: number; cost: number; price: number; fee: number; reason: string; horizon: string; exitRule: string; riskTolerance: string; note: string };
type Success = { id: string; date: string; content: string };
type ReceiptKind = "expense" | "income" | "goose";
type ReceiptDraft = { type: ReceiptKind; amount: string; merchant: string; date: string; category: string; account: string; note: string; rawText: string };
type ReceiptSyncResult = { message: string };
type Data = { accounts: Account[]; transactions: Tx[]; goals: Goal[]; allocations: Allocation[]; investments: Investment[]; settings: { currency: "CNY" | "USD" | "HKD" | "EUR" | "JPY"; emergencyTarget: number; allocationRules: Record<string, number>; targetAllocation: Record<string, number> }; trend: { month: string; netWorth: number }[]; successes?: Success[] };

const labels = ["生活", "安全", "梦想", "金鹅", "自由"];
const aliases: Record<string, string> = { 必要生活: "生活", 应急储备: "安全", 目标储蓄: "梦想", 长期投资: "金鹅", 自由消费: "自由" };
const sources = ["工资", "兼职", "生活费", "自媒体", "奖金", "其他"];
const expenseCategories = ["餐饮", "交通", "购物", "居住", "日用", "学习", "娱乐", "医疗", "通讯", "旅行", "人情", "其他"];
const paymentAccounts = ["银行卡", "微信", "支付宝", "现金", "信用卡"];
const expenseColors = ["#b7603d", "#5f7d62", "#7d6b91", "#c39a54", "#648292", "#a7695d", "#8a8172", "#4f6f68", "#9b7760", "#6f7692", "#8f655d", "#a6a095"];
const categoryRules: { category: string; keywords: string[] }[] = [
  { category: "餐饮", keywords: ["餐饮", "饭店", "餐厅", "外卖", "美团", "饿了么", "咖啡", "奶茶", "茶饮", "麦当劳", "肯德基", "瑞幸", "星巴克", "便利店", "超市", "食品"] },
  { category: "交通", keywords: ["滴滴", "打车", "出租车", "地铁", "公交", "铁路", "高铁", "火车", "机票", "航空", "加油", "停车", "共享单车", "交通"] },
  { category: "购物", keywords: ["淘宝", "天猫", "京东", "拼多多", "商城", "商场", "服饰", "鞋", "数码", "购物"] },
  { category: "居住", keywords: ["房租", "租金", "物业", "水费", "电费", "燃气", "酒店", "住宿", "公寓"] },
  { category: "日用", keywords: ["日用", "百货", "清洁", "纸巾", "洗护", "家居", "生活用品"] },
  { category: "学习", keywords: ["课程", "教育", "培训", "书店", "图书", "考试", "学习", "会员课"] },
  { category: "娱乐", keywords: ["电影", "影院", "游戏", "音乐", "视频会员", "KTV", "演出", "门票", "娱乐"] },
  { category: "医疗", keywords: ["医院", "诊所", "药房", "医药", "体检", "挂号", "医疗"] },
  { category: "通讯", keywords: ["话费", "流量", "宽带", "中国移动", "中国联通", "中国电信", "通讯"] },
  { category: "旅行", keywords: ["旅行", "旅游", "景区", "民宿", "携程", "去哪儿", "飞猪"] },
  { category: "人情", keywords: ["红包", "礼物", "礼金", "转账", "人情"] },
];

const demoData: Data = {
  accounts: [
    { id: "bank", name: "银行卡", group: "deposit", balance: 0 },
    { id: "emergency", name: "安全储备", group: "emergency", balance: 0 },
    { id: "goal", name: "梦想储蓄", group: "goal", balance: 0 },
    { id: "credit", name: "负债", group: "liability", balance: 0 },
  ],
  transactions: [
    { id: "sample-income", type: "income", amount: 1000, date: "2026-08-11", category: "示例收入", account: "银行卡", note: "示例：收到一笔钱" },
  ],
  goals: [{ id: "sample-dream", name: "示例梦想", target: 8000, current: 0, deadline: "2027-12-31", type: "中期", priority: "高", note: "示例梦想，可改成你的真实梦想。", icon: "", description: "示例：把一个目标变成储蓄计划。" }],
  allocations: [{ id: "sample-plan", date: "2026-08-11", amount: 1000, source: "示例收入", plan: { 生活: 400, 安全: 100, 梦想: 200, 金鹅: 200, 自由: 100 } }],
  investments: [{ id: "sample-goose", name: "金鹅本金示例", type: "长期本金", buyDate: "2026-08-11", invested: 200, currentValue: 200, quantity: 0, cost: 200, price: 200, fee: 0, reason: "示例：长期留下来的本金。", horizon: "长期", exitRule: "尽量不取出。", riskTolerance: "不盯短期波动。", note: "" }],
  settings: { currency: "CNY", emergencyTarget: 10000, allocationRules: { 生活: 40, 安全: 10, 梦想: 20, 金鹅: 20, 自由: 10 }, targetAllocation: { "长期本金": 100 } },
  trend: [{ month: "上月", netWorth: 0 }, { month: "本月", netWorth: 1000 }],
  successes: [{ id: "sample-success", date: "2026-08-11", content: "示例：把一笔收入分好了。" }],
};
function money(n: number) { return `￥${Math.round(n || 0).toLocaleString("zh-CN")}`; }
function uid(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function sum(ns: number[]) { return ns.reduce((a, b) => a + b, 0); }
function monthKey() { return new Date().toISOString().slice(0, 7); }
function today() { return new Date().toISOString().slice(0, 10); }
function shortMonth() { return `${new Date().getMonth() + 1}月`; }
function monthsLeft(deadline: string) { const end = new Date(deadline); const now = new Date(); return Math.max(1, (end.getFullYear() - now.getFullYear()) * 12 + end.getMonth() - now.getMonth()); }
function priority(p: string) { return p === "高" ? 3 : p === "中" ? 2 : 1; }
function suggestCategory(text: string) {
  const normalized = text.toLowerCase().replace(/\s+/g, "");
  return categoryRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())))?.category ?? "其他";
}
function suggestIncomeSource(text: string) {
  return sources.find((source) => source !== "其他" && text.includes(source)) ?? "其他";
}
function extractReceipt(text: string): ReceiptDraft {
  const normalized = text.replace(/[，,]/g, "").replace(/[￥¥]/g, "¥");
  const amountLines = normalized.split(/\r?\n/).filter((line) => /(?:实付|支付|付款|合计|总计|金额|¥|元)/i.test(line));
  const amountMatches = (amountLines.join("\n").match(/(?:¥\s*)?(\d+(?:\.\d{1,2})?)(?:\s*元)?/g) ?? [])
    .map((value) => Number(value.replace(/[^\d.]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 1000000);
  const fallbackMatches = (normalized.match(/(?:¥\s*)?(\d+(?:\.\d{1,2}))\b/g) ?? [])
    .map((value) => Number(value.replace(/[^\d.]/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 1000000);
  const amount = amountMatches[0] ?? fallbackMatches[0];
  const dateMatch = normalized.match(/(20\d{2})[年/.-](\d{1,2})[月/.-](\d{1,2})日?/);
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}` : today();
  const ignored = /(?:支付成功|交易成功|账单详情|付款方式|交易单号|商户单号|创建时间|支付时间|订单号|当前状态|收款方|商品说明|零钱|银行卡|支付宝|微信支付|扫一扫)/;
  const candidates = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length >= 2 && line.length <= 32 && /[\u4e00-\u9fffA-Za-z]/.test(line) && !ignored.test(line));
  const merchant = candidates[0]?.replace(/^[^\u4e00-\u9fffA-Za-z]+/, "") ?? "";
  const looksLikeGoose = /(?:基金买入|定投成功|投资成功|证券买入|理财申购|存入金鹅)/.test(text);
  const looksLikeIncome = !looksLikeGoose && /(?:收款|收入|到账|入账|工资|已收钱|转入成功)/.test(text) && !/(?:支出|付款|支付|消费|扣款|实付)/.test(text);
  const type: ReceiptKind = looksLikeGoose ? "goose" : looksLikeIncome ? "income" : "expense";
  return { type, amount: amount ? String(amount) : "", merchant, date, category: type === "goose" ? "金鹅" : type === "income" ? suggestIncomeSource(text) : suggestCategory(`${merchant}\n${text}`), account: "银行卡", note: merchant ? `账单截图识别：${merchant}` : "账单截图识别", rawText: text.trim() };
}
function normalizePlan(plan: Record<string, number> = {}) { return Object.entries(plan).reduce<Record<string, number>>((next, [key, value]) => { const label = aliases[key] ?? key; next[label] = (next[label] ?? 0) + value; return next; }, {}); }
function buildPlan(amount: number, rules: Record<string, number>) { return labels.reduce<Record<string, number>>((next, label) => { next[label] = Math.round(amount * ((rules[label] ?? 0) / 100)); return next; }, {}); }
function changePaymentBalance(accounts: Account[], accountName: string, amount: number, direction: "in" | "out") {
  const exactIndex = accounts.findIndex((account) => account.name === accountName);
  const fallbackIndex = accounts.findIndex((account) => accountName === "信用卡" ? account.group === "liability" : account.group === "deposit");
  const targetIndex = exactIndex >= 0 ? exactIndex : fallbackIndex;
  if (targetIndex < 0) return accounts;
  return accounts.map((account, index) => {
    if (index !== targetIndex) return account;
    if (account.group === "liability") return { ...account, balance: Math.max(0, account.balance + (direction === "out" ? amount : -amount)) };
    return { ...account, balance: account.balance + (direction === "in" ? amount : -amount) };
  });
}
function migrate(raw: Data): Data {
  const rules = normalizePlan(raw.settings?.allocationRules ?? {});
  return {
    ...demoData,
    ...raw,
    accounts: (raw.accounts?.length ? raw.accounts : demoData.accounts).map((a) => a.group === "emergency" ? { ...a, name: "安全储备" } : a.group === "goal" ? { ...a, name: "梦想储蓄" } : a),
    goals: (raw.goals?.length ? raw.goals : demoData.goals).map((g, i) => ({ icon: i ? "?" : "??", description: g.note, ...g })),
    allocations: (raw.allocations?.length ? raw.allocations : demoData.allocations).map((a) => ({ ...a, plan: normalizePlan(a.plan) })),
    settings: { ...demoData.settings, ...raw.settings, allocationRules: Object.fromEntries(labels.map((l) => [l, rules[l] ?? demoData.settings.allocationRules[l]])), targetAllocation: raw.settings?.targetAllocation ?? demoData.settings.targetAllocation },
    successes: raw.successes?.length ? raw.successes : demoData.successes,
  };
}

export function FinanceSystem() {
  const [data, setData] = useSyncedState<Data>("finance", demoData);
  const [view, setView] = useState("money");
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [income, setIncome] = useState({ amount: "2000", source: "自媒体" });
  const [dream, setDream] = useState({ name: "", icon: "?", description: "", target: "", current: "", deadline: "2027-12-31" });
  const [saving, setSaving] = useState({ goalId: "", amount: "" });
  const [success, setSuccess] = useState("");
  const [tx, setTx] = useState({ type: "expense" as "income" | "expense", amount: "", date: today(), category: "大额支出", account: "银行卡", note: "" });
  const [asset, setAsset] = useState({ name: "", type: "长期本金", invested: "", currentValue: "", reason: "" });


  const stats = useMemo(() => {
    const accountAssets = sum(data.accounts.filter((a) => a.group !== "liability").map((a) => a.balance));
    const liabilities = sum(data.accounts.filter((a) => a.group === "liability").map((a) => a.balance));
    const goose = sum(data.investments.map((i) => i.currentValue));
    const gooseInvested = sum(data.investments.map((i) => i.invested));
    const netWorth = accountAssets + goose - liabilities;
    const previous = data.trend.at(-2)?.netWorth ?? netWorth;
    const monthTransactions = data.transactions.filter((transaction) => transaction.date.slice(0, 7) === monthKey());
    const monthlyIncome = sum(monthTransactions.filter((transaction) => transaction.type === "income").map((transaction) => transaction.amount));
    const monthlyExpense = sum(monthTransactions.filter((transaction) => transaction.type === "expense").map((transaction) => transaction.amount));
    const expenseBreakdown = expenseCategories.map((category, index) => ({ label: category, value: sum(monthTransactions.filter((transaction) => transaction.type === "expense" && (category === "其他" ? !expenseCategories.slice(0, -1).includes(transaction.category) : transaction.category === category)).map((transaction) => transaction.amount)), color: expenseColors[index] })).filter((item) => item.value > 0);
    const plans = data.allocations.filter((a) => a.date.slice(0, 7) === monthKey()).map((a) => normalizePlan(a.plan));
    const topDream = [...data.goals].sort((a, b) => priority(b.priority) - priority(a.priority))[0];
    return { accountAssets, liabilities, goose, gooseInvested, gooseGrowth: goose - gooseInvested, netWorth, monthlyChange: netWorth - previous, monthlyIncome, monthlyExpense, monthlyNet: monthlyIncome - monthlyExpense, expenseBreakdown, gooseMonth: sum(plans.map((p) => p.金鹅 ?? 0)), dreamMonth: sum(plans.map((p) => p.梦想 ?? 0)), safetyMonth: sum(plans.map((p) => p.安全 ?? 0)), freeMonth: sum(plans.map((p) => p.自由 ?? 0)), safety: data.accounts.find((a) => a.group === "emergency")?.balance ?? 0, topDream, successCount: data.successes?.length ?? 0 };
  }, [data]);

  const plan = useMemo(() => buildPlan(Number(income.amount) || 0, data.settings.allocationRules), [income.amount, data.settings.allocationRules]);
  const ruleTotal = sum(Object.values(data.settings.allocationRules));

  function update(updater: (current: Data) => Data) { setData((current) => migrate(updater(current))); }
  function addToAccount(accounts: Account[], group: Account["group"], amount: number) { return accounts.map((a) => a.group === group ? { ...a, balance: a.balance + amount } : a); }
  function confirmIncome() {
    const amount = Number(income.amount); if (!amount || amount <= 0 || ruleTotal !== 100) return;
    const topDream = stats.topDream; const date = today();
    const gooseAsset: Investment | null = plan.金鹅 ? { id: uid("goose"), name: `${shortMonth()}喂金鹅`, type: "长期本金", buyDate: date, invested: plan.金鹅, currentValue: plan.金鹅, quantity: 0, cost: plan.金鹅, price: plan.金鹅, fee: 0, reason: "收到收入后按计划给长期财富本金增加一笔。", horizon: "长期", exitRule: "尽量不取出，让它慢慢长大。", riskTolerance: "不盯短期波动。", note: income.source } : null;
    update((cur) => {
      let accounts = addToAccount(cur.accounts, "deposit", plan.生活 + plan.自由);
      accounts = addToAccount(accounts, "emergency", plan.安全);
      accounts = addToAccount(accounts, "goal", plan.梦想);
      return { ...cur, accounts, transactions: [{ id: uid("income"), type: "income", amount, date, category: income.source, account: "银行卡", note: "收到一笔钱，并完成自动分配" }, ...cur.transactions], allocations: [{ id: uid("plan"), date, amount, source: income.source, plan }, ...cur.allocations], investments: gooseAsset ? [gooseAsset, ...cur.investments] : cur.investments, goals: topDream ? cur.goals.map((g) => g.id === topDream.id ? { ...g, current: g.current + plan.梦想 } : g) : cur.goals, successes: [{ id: uid("success"), date, content: `把 ${money(amount)} 分好了，其中 ${money(plan.金鹅)} 喂给金鹅。` }, ...(cur.successes ?? [])] };
    });
    setIncomeOpen(false);
  }
  function addDream() { if (!dream.name.trim()) return; const g: Goal = { id: uid("dream"), name: dream.name.trim(), icon: dream.icon || "?", description: dream.description, target: Number(dream.target) || 0, current: Number(dream.current) || 0, deadline: dream.deadline, type: "中期", priority: data.goals.length ? "中" : "高", note: dream.description }; update((cur) => ({ ...cur, goals: [g, ...cur.goals], successes: [{ id: uid("success"), date: today(), content: `写下了一个新梦想：${g.name}。` }, ...(cur.successes ?? [])] })); setDream({ name: "", icon: "?", description: "", target: "", current: "", deadline: "2027-12-31" }); }
  function saveDream(goalId: string, amountText: string) { const amount = Number(amountText); if (!goalId || !amount) return; const g = data.goals.find((item) => item.id === goalId); update((cur) => ({ ...cur, accounts: addToAccount(cur.accounts, "goal", amount), goals: cur.goals.map((item) => item.id === goalId ? { ...item, current: item.current + amount } : item), allocations: [{ id: uid("dream-save"), date: today(), amount, plan: { 生活: 0, 安全: 0, 梦想: amount, 金鹅: 0, 自由: 0 }, source: "梦想储蓄" }, ...cur.allocations], successes: [{ id: uid("success"), date: today(), content: `为「${g?.name ?? "梦想"}」存入了 ${money(amount)}。` }, ...(cur.successes ?? [])] })); setSaving({ goalId, amount: "" }); }
  function addSuccess() { if (!success.trim()) return; update((cur) => ({ ...cur, successes: [{ id: uid("success"), date: today(), content: success.trim() }, ...(cur.successes ?? [])] })); setSuccess(""); }
  function updateRule(label: string, value: string) { update((cur) => ({ ...cur, settings: { ...cur.settings, allocationRules: { ...cur.settings.allocationRules, [label]: Math.max(0, Number(value) || 0) } } })); }
  function addTx() { const amount = Number(tx.amount); if (!amount) return; update((cur) => ({ ...cur, transactions: [{ id: uid("tx"), amount, type: tx.type, date: tx.date, category: tx.category, account: tx.account, note: tx.note }, ...cur.transactions] })); setTx({ ...tx, amount: "", note: "" }); }
  function addReceiptTx(receipt: ReceiptDraft): ReceiptSyncResult | null {
    const amount = Number(receipt.amount);
    if (!amount || amount <= 0) return null;
    const date = receipt.date || today();
    const account = receipt.account || "银行卡";
    const note = receipt.note || receipt.merchant || "账单截图识别";
    if (receipt.type === "expense") {
      update((cur) => ({ ...cur, accounts: changePaymentBalance(cur.accounts, account, amount, "out"), transactions: [{ id: uid("receipt"), amount, type: "expense", date, category: receipt.category || "其他", account, note }, ...cur.transactions] }));
      return { message: `已同步：总财富减少 ${money(amount)}，并计入本月${receipt.category || "其他"}支出。` };
    }
    if (receipt.type === "goose") {
      update((cur) => ({ ...cur, accounts: changePaymentBalance(cur.accounts, account, amount, "out"), allocations: [{ id: uid("receipt-goose-plan"), date, amount, source: "账单识别：喂金鹅", plan: { 生活: 0, 安全: 0, 梦想: 0, 金鹅: amount, 自由: 0 } }, ...cur.allocations], investments: [{ id: uid("receipt-goose"), name: receipt.merchant || `${shortMonth()}账单识别入金`, type: "长期本金", buyDate: date, invested: amount, currentValue: amount, quantity: 0, cost: amount, price: amount, fee: 0, reason: note, horizon: "长期", exitRule: "尽量不取出，让它慢慢长大。", riskTolerance: "不盯短期波动。", note }, ...cur.investments], successes: [{ id: uid("success"), date, content: `通过账单识别给金鹅增加了 ${money(amount)} 本金。` }, ...(cur.successes ?? [])] }));
      return { message: `已同步：现金减少 ${money(amount)}，金鹅增加 ${money(amount)}，总财富不重复变化。` };
    }
    const receiptPlan = buildPlan(amount, data.settings.allocationRules);
    update((cur) => {
      let accounts = changePaymentBalance(cur.accounts, account, receiptPlan.生活 + receiptPlan.自由, "in");
      accounts = addToAccount(accounts, "emergency", receiptPlan.安全);
      accounts = addToAccount(accounts, "goal", receiptPlan.梦想);
      const topDream = [...cur.goals].sort((a, b) => priority(b.priority) - priority(a.priority))[0];
      const gooseAsset: Investment | null = receiptPlan.金鹅 ? { id: uid("receipt-goose"), name: `${shortMonth()}收入分配`, type: "长期本金", buyDate: date, invested: receiptPlan.金鹅, currentValue: receiptPlan.金鹅, quantity: 0, cost: receiptPlan.金鹅, price: receiptPlan.金鹅, fee: 0, reason: note, horizon: "长期", exitRule: "尽量不取出，让它慢慢长大。", riskTolerance: "不盯短期波动。", note } : null;
      return { ...cur, accounts, transactions: [{ id: uid("receipt"), amount, type: "income", date, category: receipt.category || "其他", account, note }, ...cur.transactions], allocations: [{ id: uid("receipt-plan"), date, amount, source: receipt.category || receipt.merchant || "账单识别收入", plan: receiptPlan }, ...cur.allocations], investments: gooseAsset ? [gooseAsset, ...cur.investments] : cur.investments, goals: topDream ? cur.goals.map((goal) => goal.id === topDream.id ? { ...goal, current: goal.current + receiptPlan.梦想 } : goal) : cur.goals, successes: [{ id: uid("success"), date, content: `通过账单识别同步收入 ${money(amount)}，并完成分配。` }, ...(cur.successes ?? [])] };
    });
    return { message: `已同步收入 ${money(amount)}；其中金鹅增加 ${money(receiptPlan.金鹅)}，其余按当前计划分配。` };
  }
  function feedGoose() { const invested = Number(asset.invested); if (!asset.name || !invested) return; update((cur) => ({ ...cur, investments: [{ id: uid("asset"), name: asset.name, type: asset.type, buyDate: today(), invested, currentValue: Number(asset.currentValue) || invested, quantity: 0, cost: invested, price: Number(asset.currentValue) || invested, fee: 0, reason: asset.reason, horizon: "长期", exitRule: "尽量不取出，让它慢慢长大。", riskTolerance: "不盯短期波动。", note: "" }, ...cur.investments], successes: [{ id: uid("success"), date: today(), content: `给金鹅增加了 ${money(invested)} 本金。` }, ...(cur.successes ?? [])] })); setAsset({ name: "", type: "长期本金", invested: "", currentValue: "", reason: "" }); }

  return <div className="wealth-system">
    <div className="wealth-tabs">{[{ id: "money", label: "我的钱" }, { id: "dreams", label: "我的梦想" }, { id: "plan", label: "我的计划" }].map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>{item.label}</button>)}</div>
    {view === "money" && <MoneyView data={data} stats={stats} income={income} setIncome={setIncome} plan={plan} incomeOpen={incomeOpen} setIncomeOpen={setIncomeOpen} confirmIncome={confirmIncome} setView={setView} addReceiptTx={addReceiptTx} />}
    {view === "dreams" && <DreamView data={data} dream={dream} setDream={setDream} addDream={addDream} saving={saving} setSaving={setSaving} saveDream={saveDream} />}
    {view === "plan" && <PlanView data={data} stats={stats} ruleTotal={ruleTotal} updateRule={updateRule} success={success} setSuccess={setSuccess} addSuccess={addSuccess} setView={setView} />}
    {view === "details" && <Details data={data} stats={stats} tx={tx} setTx={setTx} addTx={addTx} asset={asset} setAsset={setAsset} feedGoose={feedGoose} setView={setView} updateRule={updateRule} />}
  </div>;
}

function MoneyView({ data, stats, income, setIncome, plan, incomeOpen, setIncomeOpen, confirmIncome, setView, addReceiptTx }: any) {
  const dream = stats.topDream; const dreamRate = dream?.target ? Math.min(100, dream.current / dream.target * 100) : 0; const safetyRate = Math.min(100, stats.safety / Math.max(1, data.settings.emergencyTarget) * 100);
  return <section className="wealth-money-layout"><div className="wealth-home"><article className="wealth-main-card"><div className="wealth-balance"><p className="eyebrow">我的财富</p><strong>{money(stats.netWorth)}</strong><span>本月净变化 {stats.monthlyNet >= 0 ? "+" : "-"}{money(Math.abs(stats.monthlyNet))}</span><small>让每一分钱都有自己的方向。</small></div><MonthlySpendingChart income={stats.monthlyIncome} expense={stats.monthlyExpense} items={stats.expenseBreakdown} /></article><div className="wealth-simple-grid"><article className="wealth-soft-card"><p>我的金鹅</p><strong>{money(stats.goose)}</strong><span>本月喂鹅 {money(stats.gooseMonth)}</span><small>累计成长 {stats.gooseGrowth >= 0 ? "+" : "-"}{money(Math.abs(stats.gooseGrowth))}</small><button onClick={() => setView("details")}>查看金鹅详情</button></article><article className="wealth-soft-card"><p>我的梦想</p>{dream ? <><h3>{dream.icon ?? "?"} {dream.name}</h3><strong>{money(dream.current)} / {money(dream.target)}</strong><div className="wealth-progress"><i style={{ width: `${dreamRate}%` }} /></div><small>还差 {money(Math.max(0, dream.target - dream.current))}</small></> : <><h3>还没有梦想</h3><small>先写下一个想靠近的东西。</small></>}<button onClick={() => setView("dreams")}>查看全部梦想</button></article><article className="wealth-soft-card"><p>这个月可以放心花</p><strong>{money(Math.max(0, stats.freeMonth - stats.monthlyExpense))}</strong><span>自由金额减去本月已记支出</span><small>{safetyRate < 100 ? "你的安全储备还在建立中。" : "安全储备已经更稳了。"}</small></article></div><div className="wealth-actions"><button className="primary" onClick={() => setIncomeOpen(!incomeOpen)}>+ 我收到一笔钱</button><button onClick={() => setView("dreams")}>+ 添加一个梦想</button></div>{incomeOpen && <article className="wealth-income-panel"><p className="eyebrow">Income</p><h3>这笔钱可以这样安排</h3><div className="quick-income-row"><input value={income.amount} onChange={(e) => setIncome({ ...income, amount: e.target.value })} placeholder="金额" /><select value={income.source} onChange={(e) => setIncome({ ...income, source: e.target.value })}>{sources.map((s) => <option key={s}>{s}</option>)}</select></div><div className="money-route-list">{labels.map((l) => <label key={l}><span>{l === "金鹅" ? "喂金鹅" : l === "梦想" ? "梦想储蓄" : l === "安全" ? "安全储备" : l === "自由" ? "自由使用" : "生活"}</span><input value={plan[l] ?? 0} readOnly /></label>)}</div><button className="confirm-plan" onClick={confirmIncome}>确认分配</button></article>}<article className="wealth-note"><p>最近的成功</p><strong>最近：{data.successes?.[0]?.content ?? "先记录一个值得肯定的财务行动。"}</strong><span>已记录 {stats.successCount} 个值得肯定的行动</span></article><button className="wealth-text-link" onClick={() => setView("details")}>查看详细数据</button></div><ReceiptScanner addReceiptTx={addReceiptTx} /></section>;
}

function MonthlySpendingChart({ income, expense, items }: { income: number; expense: number; items: { label: string; value: number; color: string }[] }) {
  const gradient = items.length ? items.reduce<{ parts: string[]; offset: number }>((acc, item) => { const start = acc.offset; const end = start + item.value / Math.max(1, expense) * 100; return { parts: [...acc.parts, `${item.color} ${start}% ${end}%`], offset: end }; }, { parts: [], offset: 0 }).parts.join(", ") : "#dfd4c5 0% 100%";
  return <div className="monthly-spending"><div className="monthly-spending-head"><div><p className="eyebrow">Monthly Flow</p><h3>本月收支</h3></div><div className="monthly-totals"><span><i className="income-dot" />本月收入<strong>{money(income)}</strong></span><span><i className="expense-dot" />本月支出<strong>{money(expense)}</strong></span></div></div><div className="monthly-spending-body"><div className="monthly-donut" style={{ background: `conic-gradient(${gradient})` }}><div><small>支出</small><strong>{money(expense)}</strong></div></div><ul>{items.length ? items.slice(0, 5).map((item) => <li key={item.label}><span><i style={{ background: item.color }} />{item.label}</span><strong>{money(item.value)}</strong></li>) : <li className="monthly-empty">确认第一笔账单后，这里会显示支出分类。</li>}</ul></div></div>;
}

function ReceiptScanner({ addReceiptTx }: { addReceiptTx: (receipt: ReceiptDraft) => ReceiptSyncResult | null }) {
  const [preview, setPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "ready" | "saved" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [expandedText, setExpandedText] = useState(false);
  const [draft, setDraft] = useState<ReceiptDraft>({ type: "expense", amount: "", merchant: "", date: today(), category: "其他", account: "银行卡", note: "", rawText: "" });

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function readReceipt(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setStatus("error"); setMessage("请选择 PNG、JPG 或其他图片格式的账单截图。"); return; }
    if (file.size > 12 * 1024 * 1024) { setStatus("error"); setMessage("图片超过 12MB，请先裁剪或压缩后再上传。"); return; }
    setPreview((previous) => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(file); });
    setFileName(file.name);
    setStatus("reading");
    setProgress(3);
    setMessage("正在用本地识别模型读取截图，首次运行可能稍慢一些。");
    const workerErrors: string[] = [];
    const onWindowError = (event: ErrorEvent) => {
      if (/fetch|tesseract|worker|traineddata|wasm/i.test(`${event.message} ${event.filename}`)) {
        event.preventDefault();
        workerErrors.push(event.message || "识别组件加载失败");
      }
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason?.message ?? event.reason ?? "");
      if (/fetch|tesseract|worker|traineddata|wasm/i.test(reason)) {
        event.preventDefault();
        workerErrors.push(reason || "识别组件加载失败");
      }
    };
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("chi_sim+eng", 1, {
        workerPath: "/ocr/worker/worker.min.js",
        corePath: "/ocr/core",
        langPath: "/ocr/lang",
        logger: (info) => {
          if (info.status === "recognizing text") setProgress(Math.max(5, Math.round((info.progress ?? 0) * 100)));
        },
      });
      const result = await worker.recognize(file);
      await worker.terminate();
      const next = extractReceipt(result.data.text);
      setDraft(next);
      setProgress(100);
      setStatus("ready");
      setMessage(result.data.text.trim() ? "识别完成。请核对金额和分类，再确认入账。" : "没有识别出文字，请手动填写下面的信息。");
    } catch {
      setStatus("error");
      setMessage(workerErrors.length ? "本地识别组件没有成功启动。请刷新页面后重试，你也可以直接手动填写并入账。" : "这次没有成功读取图片，请换一张更清晰、裁切更完整的截图后重试，或直接手动填写。 ");
    } finally {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    }
  }

  function confirm() {
    const result = addReceiptTx(draft);
    if (!result) { setMessage("请先确认并填写正确的金额。"); return; }
    setStatus("saved");
    setMessage(result.message);
  }

  function reset() {
    setPreview((previous) => { if (previous) URL.revokeObjectURL(previous); return ""; });
    setFileName(""); setStatus("idle"); setProgress(0); setMessage(""); setExpandedText(false);
    setDraft({ type: "expense", amount: "", merchant: "", date: today(), category: "其他", account: "银行卡", note: "", rawText: "" });
  }

  const categoryOptions = draft.type === "expense" ? expenseCategories : draft.type === "income" ? sources : ["金鹅"];
  const accountOptions = draft.type === "income" ? paymentAccounts.filter((account) => account !== "信用卡") : paymentAccounts;
  const typeLabel = draft.type === "expense" ? "支出" : draft.type === "income" ? "收入" : "喂金鹅";
  return <aside className="receipt-scanner"><article className="receipt-scanner-card"><div className="receipt-heading"><div><p className="eyebrow">Bill Capture</p><h3>账单截图识别</h3></div>{status !== "idle" && <button type="button" onClick={reset} aria-label="重新上传账单">重新上传</button>}</div><p className="receipt-intro">上传支付、收款或投资截图，系统会识别并建议类型。核对确认后，财富与月度数据会同步更新。</p>{!preview ? <label className="receipt-drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void readReceipt(event.dataTransfer.files[0]); }}><input type="file" accept="image/*" onChange={(event) => void readReceipt(event.target.files?.[0])} /><span aria-hidden="true">＋</span><strong>选择账单截图</strong><small>也可以把图片拖到这里</small></label> : <div className="receipt-preview"><img src={preview} alt="待识别的账单截图预览" /><span>{fileName}</span></div>}{status === "reading" && <div className="receipt-reading"><div><i style={{ width: `${progress}%` }} /></div><span>{message}</span></div>}{status !== "idle" && status !== "reading" && <><p className={`receipt-status ${status}`}>{message}</p><div className="receipt-form"><label><span>资金类型</span><select value={draft.type} onChange={(e) => { const type = e.target.value as ReceiptKind; setDraft({ ...draft, type, category: type === "expense" ? suggestCategory(`${draft.merchant}\n${draft.rawText}`) : type === "income" ? suggestIncomeSource(draft.rawText) : "金鹅", account: type === "income" && draft.account === "信用卡" ? "银行卡" : draft.account }); }}><option value="expense">支出</option><option value="income">收入</option><option value="goose">喂金鹅</option></select></label><label><span>金额</span><div className="receipt-amount-input"><b>￥</b><input inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0.00" /></div></label><label><span>商户或用途</span><input value={draft.merchant} onChange={(e) => setDraft({ ...draft, merchant: e.target.value })} placeholder="例如：瑞幸咖啡" /></label><label><span>日期</span><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label><span>{draft.type === "income" ? "收入来源" : "分类"}</span><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</select></label><label><span>{draft.type === "income" ? "收款账户" : "付款账户"}</span><select value={draft.account} onChange={(e) => setDraft({ ...draft, account: e.target.value })}>{accountOptions.map((account) => <option key={account}>{account}</option>)}</select></label><label className="receipt-form-wide"><span>备注</span><input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="可选" /></label></div><div className="receipt-category-line"><span>同步为</span><strong>{typeLabel} · {draft.category}</strong><button type="button" onClick={() => setDraft({ ...draft, category: draft.type === "expense" ? suggestCategory(`${draft.merchant}\n${draft.rawText}`) : draft.type === "income" ? suggestIncomeSource(draft.rawText) : "金鹅" })}>重新判断</button></div>{draft.rawText && <div className="receipt-raw"><button type="button" onClick={() => setExpandedText(!expandedText)}>{expandedText ? "收起识别文字" : "查看识别文字"}</button>{expandedText && <pre>{draft.rawText}</pre>}</div>}<button className="receipt-confirm" type="button" onClick={confirm} disabled={status === "saved"}>{status === "saved" ? "已同步理财数据" : `确认并同步${typeLabel}`}</button></>}</article><p className="receipt-privacy">图片只在当前设备中识别。只有点击确认后，账户余额、财富和本月统计才会更新。</p></aside>;
}

function DreamView({ data, dream, setDream, addDream, saving, setSaving, saveDream }: any) {
  return <section className="dream-page"><article className="wealth-income-panel"><p className="eyebrow">Dream List</p><h3>我的梦想</h3><div className="dream-create"><input value={dream.icon} onChange={(e) => setDream({ ...dream, icon: e.target.value })} /><input value={dream.name} onChange={(e) => setDream({ ...dream, name: e.target.value })} placeholder="梦想名称" /><input value={dream.description} onChange={(e) => setDream({ ...dream, description: e.target.value })} placeholder="一句话描述，可选" /><input value={dream.target} onChange={(e) => setDream({ ...dream, target: e.target.value })} placeholder="需要多少钱，可稍后填" /><input value={dream.current} onChange={(e) => setDream({ ...dream, current: e.target.value })} placeholder="现在已有，可选" /><input type="date" value={dream.deadline} onChange={(e) => setDream({ ...dream, deadline: e.target.value })} /><button onClick={addDream}>添加梦想</button></div></article><div className="dream-grid">{data.goals.map((g: Goal) => { const rate = g.target ? Math.min(100, g.current / g.target * 100) : 0; const left = Math.max(0, g.target - g.current); return <article className="dream-jar" key={g.id}><p>{g.icon ?? "?"}</p><h3>{g.name}</h3><span>{g.description || g.note || "正在靠近的东西。"}</span>{g.target ? <><strong>{money(g.current)} / {money(g.target)}</strong><div className="wealth-progress"><i style={{ width: `${rate}%` }} /></div><small>{Math.round(rate)}% · 还差 {money(left)} · 每月建议 {money(left / monthsLeft(g.deadline))}</small></> : <small>还没有设置金额，先把它留在梦想清单里。</small>}<div className="save-dream-row"><input value={saving.goalId === g.id ? saving.amount : ""} onFocus={() => setSaving({ goalId: g.id, amount: saving.goalId === g.id ? saving.amount : "" })} onChange={(e) => setSaving({ goalId: g.id, amount: e.target.value })} placeholder="存入金额" /><button onClick={() => saveDream(g.id, saving.amount)}>存入梦想</button></div></article>; })}</div></section>;
}

function PlanView({ data, stats, ruleTotal, updateRule, success, setSuccess, addSuccess, setView }: any) {
  const sample = buildPlan(100, data.settings.allocationRules);
  return <section className="plan-page"><article className="wealth-income-panel"><div className="panel-heading"><div><p className="eyebrow">Plan</p><h3>我的计划</h3></div><span className={ruleTotal === 100 ? "pill green" : "pill"}>合计 {Math.round(ruleTotal)}%</span></div><p className="wealth-copy">你的每 ￥100 会这样安排：{labels.map((l) => `${money(sample[l])} ${l}`).join(" / ")}</p><div className="simple-rule-list">{labels.map((l) => <label key={l}><span>{l}</span><input type="range" min="0" max="100" value={data.settings.allocationRules[l] ?? 0} onChange={(e) => updateRule(l, e.target.value)} /><strong>{Math.round(data.settings.allocationRules[l] ?? 0)}%</strong></label>)}</div>{ruleTotal !== 100 && <p className="finance-warning">比例合计需要等于 100%，这样系统才能准确帮你分配新收入。</p>}</article><article className="wealth-income-panel"><p className="eyebrow">Monthly</p><h3>{shortMonth()}小结</h3><div className="monthly-story"><p>财富{stats.monthlyChange >= 0 ? "增加" : "减少"} {money(Math.abs(stats.monthlyChange))}</p><p>金鹅增加 {money(stats.gooseMonth)}</p><p>梦想增加 {money(stats.dreamMonth)}</p><p>安全储备增加 {money(stats.safetyMonth)}</p><p>完成 {stats.successCount} 个值得肯定的财务行动</p><strong>这个月，你的财富继续向前走了。</strong></div><button className="wealth-text-link" onClick={() => setView("details")}>查看详细数据</button></article><article className="wealth-income-panel"><p className="eyebrow">Success Diary</p><h3>成功日记</h3><div className="success-input"><input value={success} onChange={(e) => setSuccess(e.target.value)} placeholder="写一句值得肯定的财务行动" /><button onClick={addSuccess}>记录</button></div><div className="success-list">{(data.successes ?? []).map((s: Success) => <div key={s.id}><span>{s.date}</span><strong>{s.content}</strong></div>)}</div></article></section>;
}

function Details({ data, stats, tx, setTx, addTx, asset, setAsset, feedGoose, setView, updateRule }: any) {
  return <section className="details-page"><button className="wealth-text-link" onClick={() => setView("money")}>返回我的钱</button><div className="content-grid"><article className="panel"><p className="eyebrow">Golden Goose</p><h3>金鹅详情</h3><ul className="quiet-list"><li><span>金鹅当前金额</span><strong>{money(stats.goose)}</strong></li><li><span>累计喂鹅</span><strong>{money(stats.gooseInvested)}</strong></li><li><span>长期成长</span><strong>{stats.gooseGrowth >= 0 ? "+" : "-"}{money(Math.abs(stats.gooseGrowth))}</strong></li></ul><p className="wealth-copy">金鹅代表你的长期财富本金，取出会减慢长期积累速度。</p></article><article className="panel"><p className="eyebrow">Safety</p><h3>安全储备</h3><strong className="detail-number">{money(stats.safety)} / {money(data.settings.emergencyTarget)}</strong><div className="wealth-progress"><i style={{ width: `${Math.min(100, stats.safety / Math.max(1, data.settings.emergencyTarget) * 100)}%` }} /></div></article><TrendChart trend={data.trend} current={stats.netWorth} /><AssetDonut assets={[{ label: "现金和存款", value: stats.accountAssets - stats.safety, color: "#b7603d" }, { label: "安全储备", value: stats.safety, color: "#5f7d62" }, { label: "金鹅", value: stats.goose, color: "#7d6b91" }]} total={stats.accountAssets + stats.goose} /><article className="panel wide"><p className="eyebrow">Record</p><h3>想记就记的流水</h3><div className="finance-form detail-form"><select value={tx.type} onChange={(e) => setTx({ ...tx, type: e.target.value })}><option value="income">收入</option><option value="expense">支出</option></select><input placeholder="金额" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} /><input type="date" value={tx.date} onChange={(e) => setTx({ ...tx, date: e.target.value })} /><input placeholder="分类" value={tx.category} onChange={(e) => setTx({ ...tx, category: e.target.value })} /><input placeholder="备注" value={tx.note} onChange={(e) => setTx({ ...tx, note: e.target.value })} /><button onClick={addTx}>保存</button></div><div className="finance-table">{data.transactions.map((item: Tx) => <div key={item.id}><span>{item.date}</span><strong>{item.category}</strong><span>{item.note}</span><em className={item.type === "income" ? "positive" : ""}>{item.type === "income" ? "+" : "-"}{money(item.amount)}</em></div>)}</div></article><article className="panel wide"><p className="eyebrow">Investments</p><h3>金鹅资产记录</h3><div className="finance-form detail-form"><input placeholder="资产名称" value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} /><input placeholder="投入本金" value={asset.invested} onChange={(e) => setAsset({ ...asset, invested: e.target.value })} /><input placeholder="当前价值" value={asset.currentValue} onChange={(e) => setAsset({ ...asset, currentValue: e.target.value })} /><input placeholder="为什么放进金鹅？" value={asset.reason} onChange={(e) => setAsset({ ...asset, reason: e.target.value })} /><button onClick={feedGoose}>加入金鹅</button></div><div className="investment-list">{data.investments.map((i: Investment) => <div key={i.id}><h3>{i.name}</h3><span>{i.type}</span><strong>{money(i.currentValue)}</strong><p>{i.reason || "长期保留下来的本金。"}</p></div>)}</div></article><article className="panel wide"><p className="eyebrow">Advanced</p><h3>底层分配规则</h3><div className="rule-grid">{labels.map((l) => <label key={l}>{l}<input value={data.settings.allocationRules[l]} onChange={(e) => updateRule(l, e.target.value)} /></label>)}</div></article></div></section>;
}

function TrendChart({ trend, current }: { trend: { month: string; netWorth: number }[]; current: number }) {
  const points = [...trend.slice(0, -1), { month: "本月", netWorth: current }]; const max = Math.max(...points.map((p) => p.netWorth)); const min = Math.min(...points.map((p) => p.netWorth));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i / Math.max(1, points.length - 1)) * 100},${90 - ((p.netWorth - min) / Math.max(1, max - min)) * 70}`).join(" ");
  return <article className="panel"><p className="eyebrow">Trend</p><h3>详细趋势</h3><svg className="finance-line" viewBox="0 0 100 100" preserveAspectRatio="none"><path d={path} /></svg><div className="finance-axis">{points.map((p) => <span key={p.month}>{p.month}</span>)}</div></article>;
}

function AssetDonut({ assets, total }: { assets: { label: string; value: number; color: string }[]; total: number }) {
  const gradient = assets.reduce<{ parts: string[]; offset: number }>((acc, a) => { const start = acc.offset; const end = start + a.value / Math.max(1, total) * 100; return { parts: [...acc.parts, `${a.color} ${start}% ${end}%`], offset: end }; }, { parts: [], offset: 0 }).parts.join(", ");
  return <article className="panel"><p className="eyebrow">Structure</p><h3>财富结构</h3><div className="asset-donut" style={{ background: `conic-gradient(${gradient})` }}><span>{money(total)}</span></div><ul className="finance-legend">{assets.map((a) => <li key={a.label}><i style={{ background: a.color }} />{a.label}<strong>{money(a.value)}</strong></li>)}</ul></article>;
}







