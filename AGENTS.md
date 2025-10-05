# Repository Guidelines

## Project Structure & Module Organization
TabletBrowse Pro 是一个 MV3 扩展：`manifest.json` 连接背景 Service Worker、内容脚本与弹窗。核心逻辑集中在 `content/` —— `main.js` 负责加载/缓存设置并向模块广播，`features/*.js` 目前涵盖滑动抑制、视频调优与渲染减负，`utils/` 提供 ChromeAPI 包装、常量与缓存工具，`styles/main.css` 注入触摸友好样式。`background/background.js` 处理 `chrome.storage` 同步与跨标签消息，`popup/` 存放配置 UI，资源放在 `icons/`。若需要扩展资源访问范围，请同步更新 `web_accessible_resources` 并评估对内容脚本加载顺序的影响。

## Build, Test & Development
开发无需额外构建：在 `chrome://extensions` 启用“开发者模式”→`Load unpacked…` 指向仓库根目录即可调试。改动后点击扩展卡片上的 `Reload` 热加载。若需分发压缩包，执行 `mkdir -p dist && zip -r dist/tablet-browse-pro.zip manifest.json background content popup icons -x "*/.DS_Store"`。建议在 Chrome Canary 或 Edge Dev 上测试最新触摸 API 行为，并在桌面/平板双模式下对比触控与鼠标体验，同时保持网络面板开启以观察媒体流切换。提交变更前请移除临时压缩包或调试脚本，保持仓库干净。发布前同步更新 README 与扩展商店描述，确保信息一致。

## Coding Style & Runtime Conventions
统一 2 空格缩进、尾随分号与 `const`/`let`。异步流程使用 `async/await`，并复用现有单例（如 `window.tabletBrowseMain`）。所有日志调用 `logDebug/logWarn/logError`，保障默认静默；需要调试时在 DevTools 注入 `window.tabletBrowseDebug = true`，Service Worker 场景使用 `self.tabletBrowseDebug = true`。新增触摸监听必须缓存绑定后的回调以便移除，CSS 钩子维持 `tb-` 或 `tablet-browse-` 前缀，避免污染宿主页面。
遵循既定的代码评审模板，方便追踪讨论重点。

## Feature Guidelines
- **SwipeDisabler**：依赖 `settingsUpdated` 广播控制开关，维护左右 24px 边缘拦截；新增逻辑需确保不会影响文本选择或复制能力。
- 如需扩展手势支持（例如纵向滑动手势或双指操作），优先通过实验性分支验证，再评估是否合并主干。
- **RenderOptimizer**：通过 `queueNodeForOptimization` 去抖，扩展功能时保持“先记录、后批处理”的节奏，并检查 `optimizedElements`，避免在虚拟列表或无限滚动页面出现性能回退。
- **VideoOptimizer**：`patchMediaSource` 会阻止 AV1/VP9 MSE 轨道，扩展时确保返回值兼容 `MediaSource.addSourceBuffer` 的异常处理，同时照顾到静态 `source` 与动态 `src` setter 的回退链路。

## Testing Checklist
手动回归覆盖：1) 新闻/论坛站点上横向手势仍被阻止且文本可被选中/复制；2) SPA（如知乎、微博、YouTube Studio）反复导航后滑动禁用保持生效且无多余样式残留；3) YouTube/Bilibili 视频加载为 H.264 并遵守设定的分辨率/帧数；4) 图片瀑布流或长列表在滚动加载时无明显抖动；5) 调试开关关闭时控制台保持干净。PR 描述需附上测试 URL、浏览器版本与结果。

## Debugging Tips
利用内容脚本控制台的 `window.tabletBrowseMain.getModule('swipeDisabler')` 等接口可快速查看状态；若需观察设置缓存，执行 `window.tabletBrowseMain.getSettings()`。排查媒体问题时可以在 DevTools ➜ Media 面板确认实际编码，同时关注 Service Worker 日志（开启 `self.tabletBrowseDebug`）。必要时配合 Performance 面板录制长滚动场景，核对异步批处理是否存在卡顿帧，并可使用事件监听器断点记录触摸与手势事件时间线。

## Security & Permissions
`manifest.json` 仅匹配 `http`/`https`，权限限于 `tabs` 与 `storage`。如需新增 host 权限或 API，必须在 PR 中说明原因、影响范围与测试方案。严禁提交个人数据或密钥，背景日志需保持脱敏。
引入第三方依赖前请确认无网络请求需求，并在代码评审中阐明安全审计结论与后续维护计划。始终遵循最小权限原则，如需新增权限请同步更新用户文档。
必要时请邀请其他前端同伴共同复核潜在风险，并定期回顾权限列表与日志策略。
