import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { PrivateStore } from "../app/private-store";
import Home from "../app/page";
import ArchivePage from "../app/archive/page";
import EnglishPage from "../app/english/page";
import GoalsPage from "../app/goals/page";
import GrowthPage from "../app/growth/page";
import MoneyPage from "../app/money/page";
import ProjectsPage from "../app/projects/page";
import ReviewPage from "../app/review/page";
import SkillsPage from "../app/skills/page";
import { SkillDetail } from "../app/skills/PrivateSkills";
import WritingPage from "../app/writing/page";

const pages: Record<string, () => React.ReactNode> = {
  "/": () => <Home />,
  "/archive": () => <ArchivePage />,
  "/english": () => <EnglishPage />,
  "/goals": () => <GoalsPage />,
  "/growth": () => <GrowthPage />,
  "/money": () => <MoneyPage />,
  "/projects": () => <ProjectsPage />,
  "/review": () => <ReviewPage />,
  "/skills": () => <SkillsPage />,
  "/writing": () => <WritingPage />,
};

function currentPath() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  return path;
}

export function MobileApp() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const navigate = () => { setPath(currentPath()); window.scrollTo(0, 0); };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      window.history.pushState(null, "", url.pathname + url.search + url.hash);
      navigate();
    };
    window.addEventListener("popstate", navigate);
    document.addEventListener("click", click);
    return () => { window.removeEventListener("popstate", navigate); document.removeEventListener("click", click); };
  }, []);

  useEffect(() => {
    const receive = (url?: string) => {
      if (!url) return;
      try {
        const value = new URL(url).searchParams.get("code") ?? "";
        if (/^[a-f0-9]{64}$/.test(value)) window.dispatchEvent(new CustomEvent("personal-os-pair", { detail: value }));
      } catch { /* Ignore links that do not belong to this app. */ }
    };
    void App.getLaunchUrl().then(result => receive(result?.url));
    const listener = App.addListener("appUrlOpen", event => receive(event.url));
    return () => { void listener.then(handle => handle.remove()); };
  }, []);

  const skill = path.match(/^\/skills\/([a-z0-9-]+)$/)?.[1];
  const content = skill ? <SkillDetail slug={skill} /> : (pages[path]?.() ?? <Home />);
  return <PrivateStore>{content}</PrivateStore>;
}
