import { skillLibrary } from "./os-data";
import grillMeMarkdown from "./skill-content/grill-me.md?raw";
import dayuPosterDesignerMarkdown from "./skill-content/dayu-poster-designer.md?raw";
import dayuMegalophobiaConceptDesignerMarkdown from "./skill-content/dayu-megalophobia-concept-designer.md?raw";
import shortSceneDirectorLiteMarkdown from "./skill-content/short-scene-director-lite.md?raw";
import surrealCinematicKeyframeDirectorMarkdown from "./skill-content/surreal-cinematic-keyframe-director.md?raw";
import imagePromptDirectorMarkdown from "./skill-content/image-prompt-director.md?raw";
import lightFreshShortFilmMarkdown from "./skill-content/light-fresh-short-film.md?raw";

export const fullSkillRecords = [
  {
    slug: "grill-me",
    name: "Grill Me｜拷问式深度访谈",
    sourcePath: "C:\\Users\\ChenJ\\.codex\\skills\\grill-me\\SKILL.md",
    markdown: grillMeMarkdown,
  },
  {
    slug: "dayu-poster-designer",
    name: "大羽的海报设计师",
    sourcePath: "https://github.com/AIPlayerDayu/dayu-poster-designer",
    markdown: dayuPosterDesignerMarkdown,
  },
  {
    slug: "dayu-megalophobia-concept-designer",
    name: "大羽的【巨物恐惧】概念设计师",
    sourcePath: "https://github.com/AIPlayerDayu/dayu-megalophobia-concept-designer",
    markdown: dayuMegalophobiaConceptDesignerMarkdown,
  },
  {
    slug: "short-scene-director-lite",
    name: "15秒剧情镜头导演·基础版",
    sourcePath: "C:\\Users\\ChenJ\\Downloads\\15s-scene-director-lite.zip\\short-scene-director-lite",
    markdown: shortSceneDirectorLiteMarkdown,
  },
  {
    slug: "surreal-cinematic-keyframe-director",
    name: "超现实电影底图提示词导演",
    sourcePath: "C:\\Users\\ChenJ\\Downloads\\surreal-cinematic-keyframe-director.zip\\surreal-cinematic-keyframe-director",
    markdown: surrealCinematicKeyframeDirectorMarkdown,
  },
  {
    slug: "image-prompt-director",
    name: "Image Prompt Director",
    sourcePath: "用户直接提供 / Markdown 文本",
    markdown: imagePromptDirectorMarkdown,
  },
  {
    slug: "light-fresh-short-film",
    name: "光感小清新短片",
    sourcePath: "C:\\Users\\ChenJ\\Downloads\\light-fresh-short-film-skill.zip\\light-fresh-short-film",
    markdown: lightFreshShortFilmMarkdown,
  },
];

export function getSkillRecord(slug: string) {
  const fullRecord = fullSkillRecords.find((record) => record.slug === slug);
  if (!fullRecord) return null;
  const summary = skillLibrary.find((skill) => skill.slug === slug);
  return { ...fullRecord, summary };
}
