"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [details, setDetails] = useState("");

  useEffect(() => {
    setDetails(error.message || "网站加载时遇到了一个未知错误。");
  }, [error]);

  return (
    <html lang="zh-CN">
      <body>
        <main className="error-shell">
          <section className="error-card">
            <p className="eyebrow">Site Recovery</p>
            <h1>网站没有正常打开</h1>
            <p>
              页面已经收到服务器内容，但浏览器接管时发生了错误。先尝试重新加载；
              如果仍然出现，把这里的提示发给我，我会继续修。
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
      </body>
    </html>
  );
}
