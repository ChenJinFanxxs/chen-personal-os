import { OSShell } from "../os-shell";
import { EnglishSystem } from "./EnglishSystem";

export default function EnglishPage() {
  return (
    <OSShell
      active="English"
      kicker="English System"
      title="英语系统"
      description="以 SWT 真实场景为方向的英语口语训练台：系统负责安排下一步，你负责完成一次真实输出。"
      actions={["阶段计划", "口语训练", "SWT 参考"]}
    >
      <EnglishSystem />
    </OSShell>
  );
}
