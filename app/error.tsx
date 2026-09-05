"use client";

import { useEffect, useState } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [details, setDetails] = useState("");

  useEffect(() => {
    setDetails(error.message || "页面加载时遇到了一个未知错误。");
  }, [error]);

  return (
    <main className="error-shell">
      <section className="error-card">
        <p className="eyebrow">Page Recovery</p>
        <h1>页面没有正常打开</h1>
        <p>
          网站已经启动，但这一页在浏览器运行时遇到了问题。你可以先刷新，
          如果仍然出现，我会根据这里的提示继续修。
        </p>
        {details ? <pre>{details}</pre> : null}
        <div className="error-actions">
          <button type="button" onClick={reset}>
            重新加载
          </button>
          <a href="/">回到首页</a>
        </div>
      </section>
    </main>
  );
}
