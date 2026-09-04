"use client";

import { useState } from "react";

export function CopyMarkdownButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="copy-button" type="button" onClick={copyMarkdown}>
      {copied ? "已复制" : "复制完整 MD"}
    </button>
  );
}
