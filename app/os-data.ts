export const navItems = [
  { label: "总览", key: "Dashboard", href: "/" },
  { label: "目标", key: "Goals", href: "/goals" },
  { label: "英语", key: "English", href: "/english" },
  { label: "项目", key: "Projects", href: "/projects" },
  { label: "理财", key: "Money", href: "/money" },
  { label: "成长", key: "Growth", href: "/growth" },
  { label: "公众号", key: "Writing", href: "/writing" },
  { label: "收录库", key: "Skills", href: "/skills" },
  { label: "档案", key: "Archive", href: "/archive" },
  { label: "复盘", key: "Review", href: "/review" },
];

export const focusCards = [
  { title: "当前主线", value: "填写你的当前主线", note: "这里只是一条示例，实际内容由你自己记录。", accent: "clay" },
];

export const goals = [
  { range: "中期", name: "示例中期目标", progress: "0%", detail: "把目标拆成可以执行的步骤。", next: "写下第一条真实行动" },
];

export const projects = [
  { name: "示例项目", status: "示例", metric: "待更新", next: "填入你当前真正要推进的一件事", owner: "项目资产" },
];

export const skillLibrary: { name: string; type: string; status: string }[] = [];

export const timeline = [
  "示例：收录一条真实进展后，这里会更适合做最近记录。",
];

export const writingStats = [
  { label: "示例", value: "1" },
];

export const archiveTags = ["示例档案"];

export const growthAreas = ["口语"];
