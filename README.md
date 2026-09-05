# Personal OS

一个公开架构、私人数据的个人工作台。界面可以公开访问，理财、英语训练、Skill 全文、分类、录音与附件只对已配对设备开放。

## 能力

- 一次性设备配对与恢复码，无需注册或日常登录
- D1 保存版本化记录，R2 保存录音和图片
- 本地暂存、自动同步、冲突保留与重复操作去重
- 完整 ZIP 备份、导入预览与设备撤销
- PWA 安装配置，可添加到安卓主屏幕
- 理财、英语训练和 Skill 收录库

## 隐私边界

仓库只包含工作台程序和中性的示例数据。个人记录、Skill 全文、设备凭证、恢复码和附件不应提交到 Git。

公开访客只能看到配对入口。所有私人接口都在服务端验证设备凭证，并返回 `Cache-Control: no-store, private`。Service Worker 不缓存私人接口。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

首次初始化需要在运行环境中配置随机的 `BOOTSTRAP_SECRET`，然后仅由所有者访问：

```text
/#setup=<BOOTSTRAP_SECRET>
```

初始化成功后保存恢复码。不要把初始化链接、恢复码或配对链接提交到仓库或发送给其他人。

## 检查

```bash
npm run build
npx tsc --noEmit
node --test tests/private-api.test.mjs
```

测试覆盖未授权访问、一次性配对、设备撤销、版本冲突、请求去重、附件权限和恢复码。
