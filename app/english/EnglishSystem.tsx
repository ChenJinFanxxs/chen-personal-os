"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSyncedState, queueAttachment, PrivateAudio } from "../private-store";

type Tab = "plan" | "today" | "practice" | "scenes" | "archive" | "guide";
type StageKey = "foundation" | "interview" | "application" | "visa" | "departure";
type TaskMode = "站内" | "站外";

type TrainingTask = {
  id: string;
  title: string;
  mode: TaskMode;
  duration: number;
  instruction: string;
  evidence: string;
  note: string;
  done: boolean;
};

type QuestionItem = {
  id: string;
  category: string;
  question: string;
  cue: string;
  followUp: string;
};

type PhraseItem = {
  id: string;
  phrase: string;
  meaning: string;
  scene: string;
};

type MaterialItem = {
  id: string;
  title: string;
  source: string;
  purpose: string;
};

type RecordingItem = {
  audioId?: string;
  id: string;
  date: string;
  question: string;
  duration: number;
  issue: string;
  improvedSentence: string;
  score: string;
};

type WeeklyReview = {
  id: string;
  week: string;
  completed: string;
  strongest: string;
  blocked: string;
  nextFocus: string;
};

type EnglishData = {
  profile: {
    targetDate: string;
    daysPerWeek: number;
    dailyMinutes: number;
    targetLevel: string;
  };
  dailyDate: string;
  dailyTasks: TrainingTask[];
  assessment: Record<string, number>;
  answers: Record<string, string>;
  phrases: PhraseItem[];
  materials: MaterialItem[];
  recordings: RecordingItem[];
  weeklyReviews: WeeklyReview[];
  customQuestions: QuestionItem[];
};

type EnglishProgressBackup = {
  app: "chen-personal-os";
  module: "english";
  version: 2;
  exportedAt: string;
  data: EnglishData;
};

const storageKey = "personal-os-english-v2";
const legacyStorageKey = "personal-os-english-v1";

const tabs: { id: Tab; label: string }[] = [
  { id: "plan", label: "训练计划" },
  { id: "today", label: "今日训练" },
  { id: "practice", label: "口语训练室" },
  { id: "scenes", label: "SWT 场景" },
  { id: "archive", label: "训练档案" },
  { id: "guide", label: "SWT 参考" },
];

const stages: Record<StageKey, { label: string; goal: string; standard: string }> = {
  foundation: {
    label: "基础开口期",
    goal: "先做到听懂慢速日常问题，并用简单句连续回答 45-60 秒。",
    standard: "不追求复杂语法；能听懂、敢回答、别人能理解。",
  },
  interview: {
    label: "面试基础期",
    goal: "建立自我介绍、参加动机、经历和工作态度四组核心回答。",
    standard: "常见问题能在 5 秒内开始回答，并能接住一次追问。",
  },
  application: {
    label: "报名与雇主面试期",
    goal: "能独立填写英文信息，并完成 Sponsor 和雇主的基础面试。",
    standard: "达到可独立完成基本沟通的 SWT 5-6 级水平。",
  },
  visa: {
    label: "签证表达期",
    goal: "简洁说明项目目的、岗位信息、费用安排和回国计划。",
    standard: "回答真实、一致、简短，不依赖背诵长稿。",
  },
  departure: {
    label: "工作与生活实战期",
    goal: "覆盖排班、顾客、住房、交通、工资、医疗和紧急求助。",
    standard: "遇到听不懂或突发问题时，能够澄清、确认并主动求助。",
  },
};

const coreQuestions: QuestionItem[] = [
  { id: "self-introduction", category: "基础", question: "Could you introduce yourself?", cue: "姓名、学校、专业、性格或兴趣、为什么适合参加 SWT。", followUp: "What are you studying at university?" },
  { id: "why-swt", category: "Sponsor 面试", question: "Why do you want to join the Summer Work Travel program?", cue: "文化交流、提升独立性、工作体验。不要只说赚钱。", followUp: "What do you hope to learn in the United States?" },
  { id: "work-experience", category: "雇主面试", question: "Do you have any work or volunteer experience?", cue: "没有正式工作也可以讲社团、家务、志愿活动或团队任务。", followUp: "What was the most difficult part?" },
  { id: "difficult-customer", category: "工作场景", question: "What would you do if a customer was unhappy?", cue: "先听、保持礼貌、确认问题、能解决就解决，不能解决就找主管。", followUp: "What would you say to the customer first?" },
  { id: "job-flexibility", category: "雇主面试", question: "What if you do not get your first choice of job?", cue: "表达开放、适应和愿意学习，同时诚实说明不能接受的工作。", followUp: "What kind of job would you prefer?" },
  { id: "homesick", category: "Sponsor 面试", question: "How would you deal with homesickness?", cue: "保持联系、建立日常、主动认识同事、需要时向 Sponsor 求助。", followUp: "Have you ever lived away from home?" },
  { id: "visa-purpose", category: "签证面试", question: "What is the purpose of your trip to the United States?", cue: "参加 SWT 文化交流项目、临时工作、体验文化，并按时回国继续学业。", followUp: "What will you do after the program?" },
  { id: "schedule-problem", category: "工作场景", question: "How would you ask your supervisor about a schedule problem?", cue: "说明具体班次、问题、可行替代方案，并确认最后安排。", followUp: "Can you work on weekends?" },
  { id: "housing-help", category: "生活场景", question: "How would you report a problem with your housing?", cue: "地点、具体问题、何时发生、影响、安全风险、希望如何处理。", followUp: "Is this an emergency?" },
  { id: "did-not-understand", category: "生存表达", question: "What can you say when you do not understand an instruction?", cue: "礼貌请求重复、放慢、举例或确认自己的理解。", followUp: "Could you repeat the instruction in your own words?" },
];

const assessmentItems = [
  { id: "listening", label: "听懂问题", note: "能否听懂正常语速的日常问题" },
  { id: "continuity", label: "连续表达", note: "能否不停顿太久地说满一分钟" },
  { id: "structure", label: "组织回答", note: "能否先说结论，再补原因和例子" },
  { id: "followup", label: "追问反应", note: "问题换一种问法后能否继续回答" },
  { id: "work", label: "工作沟通", note: "能否确认任务、排班并处理顾客问题" },
  { id: "survival", label: "生活与求助", note: "能否处理住房、交通、医疗和紧急情况" },
];

const scenes = [
  { title: "Sponsor 英语面试", stage: "报名之前", target: "证明你能独立生活、理解项目并参与文化交流。", practice: "自我介绍、参加动机、适应能力、离家生活和文化兴趣。", phrases: "The main reason I want to join is... / If I need help, I will...", questionId: "why-swt" },
  { title: "雇主面试", stage: "岗位匹配", target: "让雇主相信你可靠、愿意学习并能完成基础工作沟通。", practice: "工作经历、可工作日期、岗位选择、顾客服务和团队协作。", phrases: "I am willing to learn. / I would first listen carefully and...", questionId: "work-experience" },
  { title: "J-1 签证面试", stage: "获得 DS-2019 后", target: "真实、简洁地说明项目、岗位、费用来源和回国安排。", practice: "项目目的、工作地点、Sponsor、学业和回国计划。", phrases: "I will return to continue my studies. / My host employer is...", questionId: "visa-purpose" },
  { title: "顾客与服务", stage: "赴美工作", target: "听懂常见需求，礼貌确认，并在无法处理时找到主管。", practice: "问候、点单、退款、投诉、方向和等待时间。", phrases: "Let me make sure I understood you correctly. / I will ask my supervisor.", questionId: "difficult-customer" },
  { title: "主管与排班", stage: "赴美工作", target: "确认任务、班次、请假、迟到和换班，不留下误解。", practice: "复述指令、询问优先级、报告进度和提出替代方案。", phrases: "Could you show me how to do it once? / Would it be possible to switch shifts?", questionId: "schedule-problem" },
  { title: "住房与交通", stage: "行前及抵美", target: "看懂基本协议，描述设施问题并安排上下班交通。", practice: "租金、押金、维修、路线、错过公交和夜间安全。", phrases: "There is a problem with... / What is the safest way to get there?", questionId: "housing-help" },
  { title: "工资与权益", stage: "赴美工作", target: "核对工时、工资单和扣款，发现问题时清楚询问。", practice: "时薪、加班、漏算工时、发薪日和联系 Sponsor。", phrases: "I think some hours may be missing. / Could we review my timesheet together?", questionId: "schedule-problem" },
  { title: "紧急情况与求助", stage: "全程", target: "在生病、受伤、走失或安全受到威胁时迅速说明情况。", practice: "位置、症状、危险、需要的帮助和紧急联系人。", phrases: "I need help. My current location is... / Could you stay on the line?", questionId: "did-not-understand" },
];

const guideSteps = [
  ["1", "确认资格与了解项目", "全日制高校学生、至少完成一学期；英语要能在英语环境中独立交流。"],
  ["2", "联系国内机构或美国指定 Sponsor", "比较费用、岗位、住房、退款规则和支持方式；这里只提供核验资料。"],
  ["3", "英语筛选与项目报名", "Sponsor 通常通过现场或视频面谈核验口语及阅读理解。"],
  ["4", "岗位匹配与雇主面试", "确认岗位职责、日期、工资、住房和交通，理解后再接受。"],
  ["5", "DS-2019、SEVIS 与 DS-160", "Sponsor 录入 SEVIS 并签发 DS-2019，之后进入签证申请流程。"],
  ["6", "J-1 签证面试", "准备护照、DS-160 确认页、DS-2019 等材料，并说明真实项目目的。"],
  ["7", "行前、入境与在美工作", "提前理解工作和住房条款；抵达及信息变更时按 Sponsor 要求报告。"],
];

const defaultData: EnglishData = {
  profile: { targetDate: "2027-12-31", daysPerWeek: 5, dailyMinutes: 30, targetLevel: "SWT 实用沟通" },
  dailyDate: "",
  dailyTasks: [],
  assessment: Object.fromEntries(assessmentItems.map((item) => [item.id, 0])),
  answers: {},
  phrases: [
    { id: "sample-phrase", phrase: "Could you say that again more slowly?", meaning: "可以再慢一点说一遍吗？", scene: "听不懂时的澄清" },
  ],
  materials: [
    { id: "sample-material", title: "示例：1 分钟 SWT 自我介绍音频", source: "替换为链接或本地文件名", purpose: "跟读后脱稿复述" },
  ],
  recordings: [],
  weeklyReviews: [],
  customQuestions: [],
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(from: string, to: string) {
  if (!from || !to) return null;
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const value = Math.ceil((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
  return Number.isFinite(value) ? value : null;
}

function stageFromDays(days: number | null): StageKey {
  if (days === null || days > 240) return "foundation";
  if (days > 150) return "interview";
  if (days > 90) return "application";
  if (days > 45) return "visa";
  return "departure";
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return "未设置";
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function generateTasks(stage: StageKey, date: string): TrainingTask[] {
  const packs: Record<StageKey, Omit<TrainingTask, "id" | "note" | "done">[]> = {
    foundation: [
      { title: "慢速听力辨意", mode: "站外", duration: 8, instruction: "找一段 60-90 秒的慢速日常英语。第一遍只听意思，第二遍记关键词，第三遍对照原文。", evidence: "写下听懂的 3 个关键词" },
      { title: "四句跟读", mode: "站内", duration: 8, instruction: "跟读今日示范句三遍：先看文本，再只听节奏，最后不看文本复述。", evidence: "标记最卡的一句" },
      { title: "一分钟回答", mode: "站内", duration: 10, instruction: "回答 Could you introduce yourself? 先说结论，再补两点信息；允许简单句。", evidence: "完成一次录音" },
      { title: "只改一句", mode: "站内", duration: 4, instruction: "回听录音，只找一个最影响理解的问题，并写下一句更容易说出口的版本。", evidence: "保存改进句" },
    ],
    interview: [
      { title: "面试问题听辨", mode: "站外", duration: 8, instruction: "让语音工具用三种问法询问你的参加动机，不看字幕判断意思。", evidence: "记录一种没听懂的问法" },
      { title: "核心回答拆分", mode: "站内", duration: 8, instruction: "把参加动机拆成结论、原因、例子三句，不写长稿。", evidence: "保存三句提纲" },
      { title: "追问模拟", mode: "站内", duration: 10, instruction: "完成一道主问题和一道追问，保持每次回答 30-60 秒。", evidence: "录制主问题和追问" },
      { title: "一次修正", mode: "站内", duration: 4, instruction: "只修正今天最明显的停顿、语序或发音问题。", evidence: "保存改进句" },
    ],
    application: [
      { title: "岗位词汇听力", mode: "站外", duration: 8, instruction: "听一段餐饮、酒店或游乐园岗位介绍，确认职责、时间和地点。", evidence: "写下 3 项岗位信息" },
      { title: "经历表达", mode: "站内", duration: 8, instruction: "用 Situation-Action-Result 三步讲一段学习、社团或家务经历。", evidence: "完成三句经历提纲" },
      { title: "雇主面试", mode: "站内", duration: 10, instruction: "随机完成一道雇主问题，并回答一次追问。", evidence: "完成一次录音" },
      { title: "核对理解", mode: "站内", duration: 4, instruction: "练习复述：So, if I understand correctly, my main responsibility is...", evidence: "保存一条确认表达" },
    ],
    visa: [
      { title: "材料信息口述", mode: "站外", duration: 8, instruction: "不背长稿，口头说出 Sponsor、雇主、地点、岗位、日期和费用来源。", evidence: "找出一项说不清的信息" },
      { title: "短答训练", mode: "站内", duration: 8, instruction: "用 2-4 句回答项目目的和回国计划，保证内容与真实材料一致。", evidence: "保存回答提纲" },
      { title: "签证模拟", mode: "站内", duration: 10, instruction: "连续完成三道短问题，每题 15-30 秒，不展开无关信息。", evidence: "录制一轮模拟" },
      { title: "一致性检查", mode: "站内", duration: 4, instruction: "检查今天的回答是否和申请资料、岗位信息及学业计划一致。", evidence: "记录一个待核实点" },
    ],
    departure: [
      { title: "真实语速听力", mode: "站外", duration: 8, instruction: "听一段真实工作或生活对话，重点识别时间、金额、地点和动作。", evidence: "写下 4 项关键信息" },
      { title: "澄清与确认", mode: "站内", duration: 8, instruction: "练习请求重复、放慢、举例和复述确认四种表达。", evidence: "选出最自然的两句" },
      { title: "突发场景模拟", mode: "站内", duration: 10, instruction: "从排班、顾客、住房、工资或医疗中随机练一个场景。", evidence: "完成一次录音" },
      { title: "行动复盘", mode: "站内", duration: 4, instruction: "确认自己是否说清楚发生了什么、在哪里、需要什么帮助。", evidence: "保存改进句" },
    ],
  };

  return packs[stage].map((task, index) => ({ ...task, id: `${date}-${stage}-${index}`, note: "", done: false }));
}

function normalizeEnglishData(value: unknown): EnglishData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const parsed = value as Partial<EnglishData>;
  if (parsed.profile && typeof parsed.profile !== "object") return null;
  return {
    ...defaultData,
    ...parsed,
    profile: { ...defaultData.profile, ...parsed.profile },
    assessment: { ...defaultData.assessment, ...(parsed.assessment && typeof parsed.assessment === "object" ? parsed.assessment : {}) },
    answers: { ...defaultData.answers, ...(parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {}) },
    dailyTasks: Array.isArray(parsed.dailyTasks) ? parsed.dailyTasks : [],
    phrases: Array.isArray(parsed.phrases) ? parsed.phrases : defaultData.phrases,
    materials: Array.isArray(parsed.materials) ? parsed.materials : defaultData.materials,
    recordings: Array.isArray(parsed.recordings) ? parsed.recordings : [],
    weeklyReviews: Array.isArray(parsed.weeklyReviews) ? parsed.weeklyReviews : [],
    customQuestions: Array.isArray(parsed.customQuestions) ? parsed.customQuestions : [],
  };
}

export function readSavedData(): EnglishData {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) return normalizeEnglishData(JSON.parse(saved)) ?? defaultData;

    const legacyRaw = window.localStorage.getItem(legacyStorageKey);
    if (!legacyRaw) return defaultData;
    const legacy = JSON.parse(legacyRaw) as {
      qa?: { id: string; question: string; answer?: string; followUp?: string; chinesePoints?: string }[];
      phrases?: { id: string; phrase: string; meaning: string; scene: string }[];
      materials?: { id: string; title: string; source: string; topic?: string; scene?: string }[];
      recordings?: { id: string; date: string; topic: string; issue: string; nextSentence: string; score: string }[];
    };
    const customQuestions = (legacy.qa ?? []).filter((item) => item.id !== "sample-qa").map((item) => ({
      id: item.id,
      category: "旧版问答",
      question: item.question,
      cue: item.chinesePoints ?? "",
      followUp: item.followUp ?? "",
    }));
    const answers = Object.fromEntries((legacy.qa ?? []).map((item) => [item.id, item.answer ?? ""]));
    return {
      ...defaultData,
      customQuestions,
      answers,
      phrases: legacy.phrases ?? defaultData.phrases,
      materials: (legacy.materials ?? []).map((item) => ({ id: item.id, title: item.title, source: item.source, purpose: item.scene || item.topic || "口语输出" })),
      recordings: (legacy.recordings ?? []).map((item) => ({ id: item.id, date: item.date, question: item.topic, duration: 0, issue: item.issue, improvedSentence: item.nextSentence, score: item.score })),
    };
  } catch {
    return defaultData;
  }
}

function Field({ label, value, onChange, multiline = false, placeholder = "", type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; multiline?: boolean; placeholder?: string; type?: string }) {
  return (
    <label className="swt-field">
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

export function EnglishSystem() {
  const [tab, setTab] = useState<Tab>("plan");
  const [data, setData] = useSyncedState<EnglishData>("english", defaultData);
  const [loaded, setLoaded] = useState(false);
  const [todayDate, setTodayDate] = useState("");
  const [activeQuestionId, setActiveQuestionId] = useState(coreQuestions[0].id);
  const [timer, setTimer] = useState<{ mode: "idle" | "prep" | "answer"; remaining: number }>({ mode: "idle", remaining: 0 });
  const [recordingState, setRecordingState] = useState<"idle" | "recording">("idle");
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [recordError, setRecordError] = useState("");
  const [recordDraft, setRecordDraft] = useState({ issue: "", improvedSentence: "", score: "" });
  const [phraseDraft, setPhraseDraft] = useState({ phrase: "", meaning: "", scene: "" });
  const [materialDraft, setMaterialDraft] = useState({ title: "", source: "", purpose: "" });
  const [weeklyDraft, setWeeklyDraft] = useState({ week: "", completed: "", strongest: "", blocked: "", nextFocus: "" });
  const [progressNotice, setProgressNotice] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Initial daily-task rollover runs once after the synchronized snapshot is available.
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const currentDate = localDateString(new Date());
      const saved = data;
      const remaining = daysBetween(currentDate, saved.profile.targetDate);
      const currentStage = stageFromDays(remaining);
      const nextData = saved.dailyDate === currentDate && saved.dailyTasks.length
        ? saved
        : { ...saved, dailyDate: currentDate, dailyTasks: generateTasks(currentStage, currentDate) };
      setTodayDate(currentDate);
      setWeeklyDraft((current) => ({ ...current, week: `本周（${formatDate(currentDate)}）` }));
      setData(nextData);
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timerId);
  // The synchronized snapshot is intentionally captured once during initialization.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    if (timer.mode === "idle") return;
    const timeout = window.setTimeout(() => {
      setTimer((current) => {
        if (current.remaining > 1) return { ...current, remaining: current.remaining - 1 };
        if (current.mode === "prep") return { mode: "answer", remaining: 60 };
        return { mode: "idle", remaining: 0 };
      });
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [timer]);

  useEffect(() => {
    if (recordingState !== "recording") return;
    const timeout = window.setTimeout(() => setRecordSeconds((value) => value + 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [recordingState, recordSeconds]);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, [audioUrl]);

  const daysRemaining = useMemo(() => daysBetween(todayDate, data.profile.targetDate), [todayDate, data.profile.targetDate]);
  const stageKey = useMemo(() => stageFromDays(daysRemaining), [daysRemaining]);
  const stage = stages[stageKey];
  const questions = useMemo(() => [...coreQuestions, ...data.customQuestions], [data.customQuestions]);
  const activeQuestion = questions.find((item) => item.id === activeQuestionId) ?? questions[0];
  const completedTasks = data.dailyTasks.filter((task) => task.done).length;
  const totalMinutes = data.dailyTasks.reduce((sum, task) => sum + task.duration, 0);
  const assessmentValues = Object.values(data.assessment);
  const measuredValues = assessmentValues.filter((value) => value > 0);
  const assessmentAverage = measuredValues.length ? (measuredValues.reduce((sum, value) => sum + value, 0) / measuredValues.length).toFixed(1) : "未测";

  function updateProfile(key: keyof EnglishData["profile"], value: string | number) {
    setData((current) => ({ ...current, profile: { ...current.profile, [key]: value } }));
  }

  function refreshTodayPlan() {
    if (!todayDate) return;
    const nextStage = stageFromDays(daysBetween(todayDate, data.profile.targetDate));
    setData((current) => ({ ...current, dailyDate: todayDate, dailyTasks: generateTasks(nextStage, todayDate) }));
  }

  function toggleTask(id: string) {
    setData((current) => ({ ...current, dailyTasks: current.dailyTasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) }));
  }

  function updateTaskNote(id: string, note: string) {
    setData((current) => ({ ...current, dailyTasks: current.dailyTasks.map((task) => task.id === id ? { ...task, note } : task) }));
  }

  function chooseQuestion(id: string, moveToPractice = false) {
    setActiveQuestionId(id);
    setTimer({ mode: "idle", remaining: 0 });
    if (moveToPractice) setTab("practice");
  }

  function chooseNextQuestion() {
    const currentIndex = questions.findIndex((item) => item.id === activeQuestion.id);
    chooseQuestion(questions[(currentIndex + 1) % questions.length].id);
  }

  async function startRecording() {
    setRecordError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordError("当前浏览器不支持直接录音，请使用系统录音后把结果记在训练档案中。");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(blob);
        });
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      };
      recorder.start();
      setRecordSeconds(0);
      setRecordingState("recording");
    } catch {
      setRecordError("没有获得麦克风权限。你可以允许浏览器使用麦克风后再试，或用系统录音完成任务。");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setRecordingState("idle");
  }

  async function savePracticeReview() {
    if (!recordDraft.issue.trim() && !recordDraft.improvedSentence.trim() && !audioUrl) return;
    let audioId: string | undefined;
    try { if (audioUrl) audioId = await queueAttachment(await (await fetch(audioUrl)).blob()); }
    catch { setRecordError("录音保存失败，请下载本次录音后重试。"); return; }
    const item: RecordingItem = {
      audioId,
      id: uid("recording"),
      date: todayDate || "未记录日期",
      question: activeQuestion.question,
      duration: recordSeconds,
      issue: recordDraft.issue.trim() || "本次未填写卡点",
      improvedSentence: recordDraft.improvedSentence.trim() || "本次未填写改进句",
      score: recordDraft.score || "未评分",
    };
    setData((current) => ({ ...current, recordings: [item, ...current.recordings] }));
    setRecordDraft({ issue: "", improvedSentence: "", score: "" });
    setAudioUrl("");
  }

  function addPhrase() {
    if (!phraseDraft.phrase.trim()) return;
    setData((current) => ({ ...current, phrases: [{ id: uid("phrase"), ...phraseDraft }, ...current.phrases] }));
    setPhraseDraft({ phrase: "", meaning: "", scene: "" });
  }

  function addMaterial() {
    if (!materialDraft.title.trim()) return;
    setData((current) => ({ ...current, materials: [{ id: uid("material"), ...materialDraft }, ...current.materials] }));
    setMaterialDraft({ title: "", source: "", purpose: "" });
  }

  function addWeeklyReview() {
    if (!weeklyDraft.completed.trim() && !weeklyDraft.blocked.trim() && !weeklyDraft.nextFocus.trim()) return;
    setData((current) => ({ ...current, weeklyReviews: [{ id: uid("week"), ...weeklyDraft }, ...current.weeklyReviews] }));
    setWeeklyDraft({ week: `本周（${formatDate(todayDate)}）`, completed: "", strongest: "", blocked: "", nextFocus: "" });
  }

  function exportProgress() {
    const backup: EnglishProgressBackup = {
      app: "chen-personal-os",
      module: "english",
      version: 2,
      exportedAt: new Date().toISOString(),
      data,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `swt-english-progress-${todayDate || localDateString(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setProgressNotice("进度备份已导出");
  }

  async function importProgress(file?: File) {
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith(".json") || file.size > 3 * 1024 * 1024) throw new Error("invalid-file");
      const parsed = JSON.parse(await file.text()) as Partial<EnglishProgressBackup>;
      if (parsed.app !== "chen-personal-os" || parsed.module !== "english" || parsed.version !== 2) throw new Error("invalid-backup");
      const nextData = normalizeEnglishData(parsed.data);
      if (!nextData) throw new Error("invalid-data");
      const completed = nextData.dailyTasks.filter((task) => task.done).length;
      const approved = window.confirm(`将导入 ${nextData.recordings.length} 条录音复盘、${nextData.weeklyReviews.length} 条周复盘和 ${completed} 项已完成任务。\n\n这会覆盖当前英语学习进度，是否继续？`);
      if (!approved) {
        setProgressNotice("已取消导入，当前进度没有改变");
        return;
      }
      setData(nextData);
      setProgressNotice("进度导入成功，已自动保存");
    } catch {
      setProgressNotice("导入失败：请选择由英语系统导出的 JSON 备份");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  return (
    <section className="english-system swt-system">
      <article className="panel swt-status-band">
        <div>
          <p className="eyebrow">Current Stage</p>
          <div className="swt-status-title">
            <h2>{stage.label}</h2>
            <span>{daysRemaining === null ? "等待目标日期" : `距预计出发 ${Math.max(daysRemaining, 0)} 天`}</span>
          </div>
          <p>{stage.goal}</p>
        </div>
        <div className="swt-status-progress" aria-label="今日训练进度">
          <span>今日输出</span>
          <strong>{completedTasks}/{data.dailyTasks.length || 4}</strong>
          <div><i style={{ width: `${data.dailyTasks.length ? Math.round((completedTasks / data.dailyTasks.length) * 100) : 0}%` }} /></div>
          <button type="button" onClick={() => setTab("today")}>进入今日训练</button>
        </div>
      </article>

      <nav className="swt-tabs" aria-label="英语系统模块">
        {tabs.map((item) => (
          <button className={tab === item.id ? "active" : ""} key={item.id} type="button" onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
      </nav>

      <div className="swt-progress-tools" aria-label="学习进度管理">
        <span><i aria-hidden="true" />{progressNotice || "学习进度已自动保存在此浏览器"}</span>
        <div>
          <button type="button" onClick={exportProgress}>导出进度</button>
          <button type="button" onClick={() => importInputRef.current?.click()}>导入进度</button>
          <input ref={importInputRef} type="file" accept="application/json,.json" onChange={(event) => void importProgress(event.target.files?.[0])} />
        </div>
      </div>

      {!loaded ? <article className="panel swt-loading">正在准备今天的训练计划...</article> : null}

      {loaded && tab === "plan" ? (
        <PlanView
          data={data}
          stageKey={stageKey}
          daysRemaining={daysRemaining}
          assessmentAverage={assessmentAverage}
          updateProfile={updateProfile}
          refreshTodayPlan={refreshTodayPlan}
          setData={setData}
          openToday={() => setTab("today")}
        />
      ) : null}

      {loaded && tab === "today" ? (
        <TodayView
          tasks={data.dailyTasks}
          completed={completedTasks}
          totalMinutes={totalMinutes}
          toggleTask={toggleTask}
          updateTaskNote={updateTaskNote}
          openPractice={() => chooseQuestion("self-introduction", true)}
        />
      ) : null}

      {loaded && tab === "practice" ? (
        <PracticeView
          questions={questions}
          activeQuestion={activeQuestion}
          answer={data.answers[activeQuestion.id] ?? ""}
          timer={timer}
          recordingState={recordingState}
          recordSeconds={recordSeconds}
          audioUrl={audioUrl}
          recordError={recordError}
          recordDraft={recordDraft}
          chooseQuestion={chooseQuestion}
          chooseNextQuestion={chooseNextQuestion}
          startTimer={() => setTimer({ mode: "prep", remaining: 20 })}
          cancelTimer={() => setTimer({ mode: "idle", remaining: 0 })}
          updateAnswer={(value) => setData((current) => ({ ...current, answers: { ...current.answers, [activeQuestion.id]: value } }))}
          startRecording={startRecording}
          stopRecording={stopRecording}
          setRecordDraft={setRecordDraft}
          savePracticeReview={savePracticeReview}
        />
      ) : null}

      {loaded && tab === "scenes" ? <ScenesView chooseQuestion={(id) => chooseQuestion(id, true)} /> : null}

      {loaded && tab === "archive" ? (
        <ArchiveView
          data={data}
          phraseDraft={phraseDraft}
          setPhraseDraft={setPhraseDraft}
          materialDraft={materialDraft}
          setMaterialDraft={setMaterialDraft}
          weeklyDraft={weeklyDraft}
          setWeeklyDraft={setWeeklyDraft}
          addPhrase={addPhrase}
          addMaterial={addMaterial}
          addWeeklyReview={addWeeklyReview}
          removePhrase={(id) => setData((current) => ({ ...current, phrases: current.phrases.filter((item) => item.id !== id) }))}
          removeMaterial={(id) => setData((current) => ({ ...current, materials: current.materials.filter((item) => item.id !== id) }))}
          removeRecording={(id) => setData((current) => ({ ...current, recordings: current.recordings.filter((item) => item.id !== id) }))}
        />
      ) : null}

      {loaded && tab === "guide" ? <GuideView /> : null}
    </section>
  );
}

function PlanView({ data, stageKey, daysRemaining, assessmentAverage, updateProfile, refreshTodayPlan, setData, openToday }: {
  data: EnglishData;
  stageKey: StageKey;
  daysRemaining: number | null;
  assessmentAverage: string;
  updateProfile: (key: keyof EnglishData["profile"], value: string | number) => void;
  refreshTodayPlan: () => void;
  setData: React.Dispatch<React.SetStateAction<EnglishData>>;
  openToday: () => void;
}) {
  const roadmap: { id: StageKey; period: string; title: string; output: string }[] = [
    { id: "foundation", period: "现在 - 2026年9月", title: "基础开口", output: "60 秒自我介绍 + 听不懂时会澄清" },
    { id: "interview", period: "2026年10月 - 12月", title: "Sponsor 面试基础", output: "10 道核心题 + 一次追问" },
    { id: "application", period: "2027年1月 - 2月", title: "报名与雇主面试", output: "岗位面试 + 独立填写英文信息" },
    { id: "visa", period: "2027年3月 - 4月", title: "签证表达", output: "真实简短地说明项目和回国计划" },
    { id: "departure", period: "2027年5月 - 出发", title: "工作与生活实战", output: "排班、顾客、住房、工资和求助" },
  ];
  const schedule = [
    ["周一", "慢速听力 + 四句跟读"],
    ["周二", "自我介绍 + 一分钟录音"],
    ["周三", "SWT 场景问答 + 一次追问"],
    ["周四", "站外语音对话或真人练习"],
    ["周五", "同题重录 + 一周只改一个问题"],
  ];

  return (
    <div className="swt-view-stack">
      <section className="swt-plan-layout">
        <article className="panel swt-roadmap-panel">
          <p className="eyebrow">Roadmap</p>
          <h3>从现在到 2027 年暑期</h3>
          <p className="swt-panel-intro">路线只负责告诉你当前该练什么。报名和签证流程会提供参考，但不占用每日英语训练。</p>
          <div className="swt-roadmap">
            {roadmap.map((item) => {
              const order = roadmap.findIndex((phase) => phase.id === item.id);
              const currentOrder = roadmap.findIndex((phase) => phase.id === stageKey);
              const state = order < currentOrder ? "done" : order === currentOrder ? "current" : "upcoming";
              return (
                <div className={`swt-roadmap-row ${state}`} key={item.id}>
                  <span className="swt-roadmap-marker" aria-hidden="true" />
                  <div><small>{item.period}</small><strong>{item.title}</strong><p>{item.output}</p></div>
                  <em>{state === "done" ? "已经过" : state === "current" ? "当前" : "待开始"}</em>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel swt-settings-panel">
          <p className="eyebrow">Settings</p>
          <h3>训练设置</h3>
          <Field label="预计出发日期" type="date" value={data.profile.targetDate} onChange={(value) => updateProfile("targetDate", value)} />
          <Field label="每周训练天数" type="number" value={data.profile.daysPerWeek} onChange={(value) => updateProfile("daysPerWeek", Math.max(1, Math.min(7, Number(value) || 1)))} />
          <Field label="每天训练分钟" type="number" value={data.profile.dailyMinutes} onChange={(value) => updateProfile("dailyMinutes", Math.max(10, Math.min(90, Number(value) || 10)))} />
          <Field label="目标" value={data.profile.targetLevel} onChange={(value) => updateProfile("targetLevel", value)} />
          <div className="swt-settings-summary">
            <span>当前阶段</span><strong>{stages[stageKey].label}</strong>
            <span>剩余时间</span><strong>{daysRemaining === null ? "未计算" : `${Math.max(daysRemaining, 0)} 天`}</strong>
          </div>
          <button className="swt-primary" type="button" onClick={refreshTodayPlan}>按设置更新今日计划</button>
        </article>
      </section>

      <section className="swt-plan-layout">
        <article className="panel swt-week-panel">
          <div className="swt-section-heading"><div><p className="eyebrow">This Week</p><h3>本周训练节奏</h3></div><button type="button" onClick={openToday}>开始今天</button></div>
          <div className="swt-week-list">
            {schedule.slice(0, data.profile.daysPerWeek).map(([day, task]) => <div key={day}><strong>{day}</strong><span>{task}</span></div>)}
          </div>
          <p className="swt-quiet-note">每次只留下录音、卡点和一条改进句。没有用于输出的材料不进入长期档案。</p>
        </article>

        <article className="panel swt-assessment-panel">
          <div className="swt-section-heading"><div><p className="eyebrow">Monthly Check</p><h3>六项能力基线</h3></div><strong>{assessmentAverage}</strong></div>
          <p className="swt-panel-intro">0 表示尚未测评。每月用同一套问题录音一次，再根据真实表现更新。</p>
          <div className="swt-assessment-list">
            {assessmentItems.map((item) => (
              <label key={item.id}>
                <span><strong>{item.label}</strong><small>{item.note}</small></span>
                <input type="range" min="0" max="5" step="1" value={data.assessment[item.id] ?? 0} onChange={(event) => setData((current) => ({ ...current, assessment: { ...current.assessment, [item.id]: Number(event.target.value) } }))} />
                <em>{data.assessment[item.id] || "未测"}</em>
              </label>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

function TodayView({ tasks, completed, totalMinutes, toggleTask, updateTaskNote, openPractice }: {
  tasks: TrainingTask[];
  completed: number;
  totalMinutes: number;
  toggleTask: (id: string) => void;
  updateTaskNote: (id: string, note: string) => void;
  openPractice: () => void;
}) {
  return (
    <section className="swt-today-layout">
      <article className="panel swt-task-panel">
        <div className="swt-section-heading">
          <div><p className="eyebrow">Today</p><h3>今天只完成一次真实输出</h3></div>
          <span>{completed}/{tasks.length} · 约 {totalMinutes} 分钟</span>
        </div>
        <div className="swt-task-list">
          {tasks.map((task, index) => (
            <div className={`swt-task-row ${task.done ? "done" : ""}`} key={task.id}>
              <button className="swt-task-check" type="button" onClick={() => toggleTask(task.id)} aria-label={task.done ? `取消完成 ${task.title}` : `完成 ${task.title}`}>{task.done ? "✓" : index + 1}</button>
              <div className="swt-task-copy">
                <div><strong>{task.title}</strong><span>{task.mode} · {task.duration} 分钟</span></div>
                <p>{task.instruction}</p>
                <label><span>{task.evidence}</span><input value={task.note} onChange={(event) => updateTaskNote(task.id, event.target.value)} placeholder="完成后留下一个简短结果" /></label>
              </div>
            </div>
          ))}
        </div>
      </article>

      <aside className="swt-today-side">
        <article className="panel swt-shadow-card">
          <p className="eyebrow">Shadowing</p>
          <h3>今日四句</h3>
          <div className="swt-script">
            <p>Hi, my name is Chen. I am currently a university student.</p>
            <p>I want to join the program because I would like to experience American culture.</p>
            <p>I am still improving my English, but I am willing to practice every day.</p>
            <p>If I do not understand something, I will ask politely and confirm the instruction.</p>
          </div>
          <small>示范内容，不代表你的真实信息。之后可以替换成自己的版本。</small>
        </article>
        <article className="panel swt-output-card">
          <p className="eyebrow">Output</p>
          <h3>把输入变成开口</h3>
          <p>准备 20 秒，然后回答：<strong>Could you introduce yourself?</strong></p>
          <button className="swt-primary" type="button" onClick={openPractice}>进入口语训练室</button>
        </article>
      </aside>
    </section>
  );
}

function PracticeView({ questions, activeQuestion, answer, timer, recordingState, recordSeconds, audioUrl, recordError, recordDraft, chooseQuestion, chooseNextQuestion, startTimer, cancelTimer, updateAnswer, startRecording, stopRecording, setRecordDraft, savePracticeReview }: {
  questions: QuestionItem[];
  activeQuestion: QuestionItem;
  answer: string;
  timer: { mode: "idle" | "prep" | "answer"; remaining: number };
  recordingState: "idle" | "recording";
  recordSeconds: number;
  audioUrl: string;
  recordError: string;
  recordDraft: { issue: string; improvedSentence: string; score: string };
  chooseQuestion: (id: string) => void;
  chooseNextQuestion: () => void;
  startTimer: () => void;
  cancelTimer: () => void;
  updateAnswer: (value: string) => void;
  startRecording: () => void;
  stopRecording: () => void;
  setRecordDraft: React.Dispatch<React.SetStateAction<{ issue: string; improvedSentence: string; score: string }>>;
  savePracticeReview: () => void;
}) {
  const timerLabel = timer.mode === "prep" ? "准备" : timer.mode === "answer" ? "回答" : "未开始";
  return (
    <section className="swt-practice-layout">
      <aside className="panel swt-question-list">
        <p className="eyebrow">Question Bank</p>
        <h3>SWT 口语题库</h3>
        <div>
          {questions.map((question) => (
            <button className={question.id === activeQuestion.id ? "active" : ""} type="button" key={question.id} onClick={() => chooseQuestion(question.id)}>
              <small>{question.category}</small><span>{question.question}</span>
            </button>
          ))}
        </div>
      </aside>

      <article className="panel swt-practice-room">
        <div className="swt-question-meta"><span>{activeQuestion.category}</span><button type="button" onClick={chooseNextQuestion}>下一题</button></div>
        <h3>{activeQuestion.question}</h3>
        <div className="swt-cue"><strong>回答线索</strong><p>{activeQuestion.cue}</p><small>可能追问：{activeQuestion.followUp}</small></div>

        <div className="swt-timer-box">
          <div><span>{timerLabel}</span><strong>{String(timer.remaining).padStart(2, "0")}</strong><small>准备 20 秒 · 回答 60 秒</small></div>
          {timer.mode === "idle" ? <button className="swt-primary" type="button" onClick={startTimer}>开始计时</button> : <button type="button" onClick={cancelTimer}>停止计时</button>}
        </div>

        <label className="swt-answer-draft"><span>回答提纲，只写关键词，不背长稿</span><textarea value={answer} onChange={(event) => updateAnswer(event.target.value)} placeholder="结论 / 原因 / 一个例子" /></label>

        <div className="swt-recorder">
          <div><span className={recordingState === "recording" ? "recording" : ""} /><strong>{recordingState === "recording" ? "正在录音" : "录音练习"}</strong><small>{recordSeconds} 秒</small></div>
          {recordingState === "recording" ? <button className="swt-stop" type="button" onClick={stopRecording}>停止录音</button> : <button className="swt-primary" type="button" onClick={startRecording}>开始录音</button>}
        </div>
        {recordError ? <p className="swt-error">{recordError}</p> : null}
        {audioUrl ? (
          <div className="swt-playback">
            {/* The recording is user-generated speech and has no caption source. */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={audioUrl} />
            <a href={audioUrl} download={`swt-speaking-${activeQuestion.id}.webm`}>下载本次录音</a>
          </div>
        ) : null}

        <div className="swt-review-fields">
          <Field label="本次最明显的卡点" value={recordDraft.issue} onChange={(value) => setRecordDraft((current) => ({ ...current, issue: value }))} placeholder="例如：开头停顿太久" />
          <Field label="下次只改这一句" value={recordDraft.improvedSentence} onChange={(value) => setRecordDraft((current) => ({ ...current, improvedSentence: value }))} placeholder="写一句更容易说出口的版本" />
          <label className="swt-field"><span>自评</span><select value={recordDraft.score} onChange={(event) => setRecordDraft((current) => ({ ...current, score: event.target.value }))}><option value="">未评分</option><option value="1/5">1/5 很难开口</option><option value="2/5">2/5 能说少量短句</option><option value="3/5">3/5 基本能表达</option><option value="4/5">4/5 较流畅</option><option value="5/5">5/5 自然稳定</option></select></label>
        </div>
        <button className="swt-primary" type="button" onClick={savePracticeReview}>保存本次复盘</button>
        <p className="swt-quiet-note">录音只在当前页面临时保留。需要长期保存时先下载；网站会长期保存题目、卡点和改进句。</p>
      </article>
    </section>
  );
}

function ScenesView({ chooseQuestion }: { chooseQuestion: (id: string) => void }) {
  return (
    <article className="panel swt-scenes-panel">
      <div className="swt-section-heading"><div><p className="eyebrow">Real Situations</p><h3>所有训练都要落到真实场景</h3></div><span>8 个核心场景</span></div>
      <p className="swt-panel-intro">这里不是资料收藏区。展开一个场景后，直接进入对应问题练习。</p>
      <div className="swt-scene-list">
        {scenes.map((scene, index) => (
          <details key={scene.title} open={index === 0}>
            <summary><span>{String(index + 1).padStart(2, "0")}</span><strong>{scene.title}</strong><small>{scene.stage}</small></summary>
            <div className="swt-scene-content">
              <dl><div><dt>能力目标</dt><dd>{scene.target}</dd></div><div><dt>练习内容</dt><dd>{scene.practice}</dd></div><div><dt>核心表达</dt><dd>{scene.phrases}</dd></div></dl>
              <button className="swt-primary" type="button" onClick={() => chooseQuestion(scene.questionId)}>练这个场景</button>
            </div>
          </details>
        ))}
      </div>
    </article>
  );
}

function ArchiveView({ data, phraseDraft, setPhraseDraft, materialDraft, setMaterialDraft, weeklyDraft, setWeeklyDraft, addPhrase, addMaterial, addWeeklyReview, removePhrase, removeMaterial, removeRecording }: {
  data: EnglishData;
  phraseDraft: { phrase: string; meaning: string; scene: string };
  setPhraseDraft: React.Dispatch<React.SetStateAction<{ phrase: string; meaning: string; scene: string }>>;
  materialDraft: { title: string; source: string; purpose: string };
  setMaterialDraft: React.Dispatch<React.SetStateAction<{ title: string; source: string; purpose: string }>>;
  weeklyDraft: { week: string; completed: string; strongest: string; blocked: string; nextFocus: string };
  setWeeklyDraft: React.Dispatch<React.SetStateAction<{ week: string; completed: string; strongest: string; blocked: string; nextFocus: string }>>;
  addPhrase: () => void;
  addMaterial: () => void;
  addWeeklyReview: () => void;
  removePhrase: (id: string) => void;
  removeMaterial: (id: string) => void;
  removeRecording: (id: string) => void;
}) {
  return (
    <div className="swt-view-stack">
      <section className="swt-archive-grid">
        <ArchivePanel eyebrow="Phrase Bank" title="真正说过的表达">
          <Field label="英文表达" value={phraseDraft.phrase} onChange={(value) => setPhraseDraft((current) => ({ ...current, phrase: value }))} />
          <Field label="中文意思" value={phraseDraft.meaning} onChange={(value) => setPhraseDraft((current) => ({ ...current, meaning: value }))} />
          <Field label="使用场景" value={phraseDraft.scene} onChange={(value) => setPhraseDraft((current) => ({ ...current, scene: value }))} />
          <button className="swt-primary" type="button" onClick={addPhrase}>保存表达</button>
          <ArchiveList empty="还没有保存表达。" items={data.phrases.map((item) => ({ id: item.id, title: item.phrase, body: item.meaning, meta: item.scene }))} remove={removePhrase} />
        </ArchivePanel>

        <ArchivePanel eyebrow="Material" title="用过的训练材料">
          <Field label="材料名称" value={materialDraft.title} onChange={(value) => setMaterialDraft((current) => ({ ...current, title: value }))} />
          <Field label="来源链接或文件" value={materialDraft.source} onChange={(value) => setMaterialDraft((current) => ({ ...current, source: value }))} />
          <Field label="用于哪次输出" value={materialDraft.purpose} onChange={(value) => setMaterialDraft((current) => ({ ...current, purpose: value }))} />
          <button className="swt-primary" type="button" onClick={addMaterial}>保存材料</button>
          <ArchiveList empty="还没有训练材料。" items={data.materials.map((item) => ({ id: item.id, title: item.title, body: item.source, meta: item.purpose }))} remove={removeMaterial} />
        </ArchivePanel>
      </section>

      <section className="swt-archive-grid">
        <ArchivePanel eyebrow="Recording Review" title="录音复盘记录">
          <ArchiveList empty="完成第一次录音后，这里会保留题目、卡点和改进句。" items={data.recordings.map((item) => ({ id: item.id, title: item.question, body: item.issue, meta: `${item.date} · ${item.score} · 改进：${item.improvedSentence}` }))} remove={removeRecording} />
          {data.recordings.filter(item => item.audioId).map(item => <div key={item.id}><p>{item.question} · {item.date}</p><PrivateAudio id={item.audioId!} /></div>)}
        </ArchivePanel>

        <ArchivePanel eyebrow="Weekly Review" title="一周只确定一个改进方向">
          <Field label="周次" value={weeklyDraft.week} onChange={(value) => setWeeklyDraft((current) => ({ ...current, week: value }))} />
          <Field label="本周实际完成" value={weeklyDraft.completed} onChange={(value) => setWeeklyDraft((current) => ({ ...current, completed: value }))} multiline />
          <Field label="最稳定的一次表达" value={weeklyDraft.strongest} onChange={(value) => setWeeklyDraft((current) => ({ ...current, strongest: value }))} />
          <Field label="最常见卡点" value={weeklyDraft.blocked} onChange={(value) => setWeeklyDraft((current) => ({ ...current, blocked: value }))} />
          <Field label="下周唯一重点" value={weeklyDraft.nextFocus} onChange={(value) => setWeeklyDraft((current) => ({ ...current, nextFocus: value }))} />
          <button className="swt-primary" type="button" onClick={addWeeklyReview}>保存周复盘</button>
          <ArchiveList empty="周末完成第一份复盘。" items={data.weeklyReviews.map((item) => ({ id: item.id, title: item.week, body: item.completed, meta: `下周：${item.nextFocus}` }))} />
        </ArchivePanel>
      </section>
    </div>
  );
}

function ArchivePanel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <article className="panel swt-archive-panel"><p className="eyebrow">{eyebrow}</p><h3>{title}</h3>{children}</article>;
}

function ArchiveList({ items, empty, remove }: { items: { id: string; title: string; body: string; meta: string }[]; empty: string; remove?: (id: string) => void }) {
  if (!items.length) return <p className="swt-empty">{empty}</p>;
  return <div className="swt-archive-list">{items.map((item) => <div key={item.id}><strong>{item.title}</strong><p>{item.body}</p><small>{item.meta}</small>{remove ? <button type="button" onClick={() => remove(item.id)} aria-label={`删除 ${item.title}`}>删除</button> : null}</div>)}</div>;
}

function GuideView() {
  return (
    <section className="swt-guide-layout">
      <article className="panel swt-guide-panel">
        <p className="eyebrow">Reference Only</p>
        <h3>SWT 项目流程参考</h3>
        <p className="swt-panel-intro">这一部分只帮助你理解下一次英语面试为什么出现、应该准备哪些信息，不会进入每日英语任务。</p>
        <div className="swt-guide-steps">
          {guideSteps.map(([number, title, description]) => <div key={number}><span>{number}</span><div><strong>{title}</strong><p>{description}</p></div></div>)}
        </div>
      </article>

      <aside className="swt-guide-side">
        <article className="panel">
          <p className="eyebrow">English Standard</p>
          <h3>英语要求怎么理解</h3>
          <dl className="swt-levels">
            <div><dt>最低方向</dt><dd>能以句子形式回答，虽然语法不完美，但别人可以理解。</dd></div>
            <div><dt>当前目标</dt><dd>达到基本对话水平，常见问题反应较快，能够独立澄清和求助。</dd></div>
            <div><dt>进阶目标</dt><dd>能够承担收银、接待、服务员等需要持续顾客沟通的岗位。</dd></div>
          </dl>
        </article>
        <article className="panel">
          <p className="eyebrow">Official Sources</p>
          <h3>需要核实时看这里</h3>
          <div className="swt-official-links">
            <a href="https://j1visa.state.gov/programs/summer-work-travel" target="_blank" rel="noreferrer"><strong>BridgeUSA SWT 官方说明</strong><span>资格、项目长度和岗位规则</span></a>
            <a href="https://j1visa.state.gov/participants/how-to-apply/" target="_blank" rel="noreferrer"><strong>J-1 官方申请入口</strong><span>Sponsor、DS-2019 和申请步骤</span></a>
            <a href="https://travel.state.gov/content/travel/en/us-visas/study/exchange.html" target="_blank" rel="noreferrer"><strong>美国国务院 J-1 签证说明</strong><span>DS-160、材料和面试流程</span></a>
          </div>
          <p className="swt-quiet-note">具体报名时间、费用和岗位以你最终选择的国内机构及美国 Sponsor 的最新书面信息为准。</p>
        </article>
      </aside>
    </section>
  );
}
