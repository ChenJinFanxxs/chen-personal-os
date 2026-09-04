import { OSShell } from "../os-shell";
import { FinanceSystem } from "./FinanceSystem";

export default function MoneyPage() {
  return (
    <OSShell active="Money" kicker="Finance System" title="理财系统" description="围绕净资产、现金流、资金分配、财务目标、投资组合和月度复盘，形成一个可长期使用的个人财富管理闭环。">
      <FinanceSystem />
    </OSShell>
  );
}
