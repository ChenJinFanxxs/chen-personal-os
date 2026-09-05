/* eslint-disable @typescript-eslint/no-explicit-any */
export function validateRecord(id: string, value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "记录必须是对象";
  const v = value as Record<string, any>;
  const array = (key: string) => Array.isArray(v[key]) && v[key].every((item: any) => item && typeof item === "object" && typeof item.id === "string");
  const text = (key: string) => typeof v[key] === "string";
  if (id === "finance") {
    if (!["accounts", "transactions", "goals", "allocations", "investments"].every(array) || !Array.isArray(v.trend) || !v.settings || typeof v.settings !== "object") return "理财记录不完整";
    if (v.accounts.some((a: any) => !Number.isFinite(a.balance)) || v.transactions.some((a: any) => !Number.isFinite(a.amount) || a.amount < 0 || typeof a.date !== "string")) return "账目金额或日期无效";
  } else if (id === "english") {
    if (!v.profile || typeof v.profile.targetDate !== "string" || !v.answers || !v.assessment || typeof v.dailyDate !== "string" || !["dailyTasks", "phrases", "materials", "recordings", "weeklyReviews", "customQuestions"].every(array)) return "英语记录格式不完整，请先从旧版英语页面导出进度";
  } else if (id === "skill-folders") {
    if (!Array.isArray(v.folders) || !v.folders.every((s: unknown) => typeof s === "string") || !v.assignments || typeof v.assignments !== "object" || !Array.isArray(v.trashed)) return "文件夹格式无效";
  } else if (id === "skill-edits") {
    if (Object.values(v).some((s: any) => !s || typeof s.name !== "string" || !Array.isArray(s.tags) || !s.tags.every((t: unknown) => typeof t === "string"))) return "标题或标签格式无效";
  } else if (id.startsWith("skill:")) {
    if (!text("slug") || id !== `skill:${v.slug}` || !text("name") || !text("markdown")) return "Skill 全文或标题缺失";
  } else return "不支持此记录类型";
  return null;
}
