# TabletBrowse Pro 技术概览

本文面向开发者，概述扩展在 MV3 运行时中的工作方式，并深入讲解核心优化模块（视频优化与渲染减负）的策略、局限与调试要点。

## 架构总览
- **Manifest V3**：`manifest.json` 将背景 Service Worker (`background/background.js`)、内容脚本 (`content/main.js`) 与弹窗 UI (`popup/`) 关联起来，所有页面级优化都由内容脚本注入完成。
- **主控入口**：`content/main.js` 负责加载用户设置、实例化各个特性模块，并在设置变更时通过 `settingsUpdated` 广播更新，确保单页应用在导航后依旧保持正确状态。
- **模块注册**：每个 `features/*.js` 文件都暴露一个类（例如 `VideoOptimizer`、`RenderOptimizer`、`SwipeDisabler`），实例被缓存到 `window.tabletBrowseMain`，方便调试时通过 `getModule(name)` 访问。
- **背景通信**：`background/background.js` 监听来自内容脚本与弹窗的消息，统一读取或写入 `chrome.storage.sync`，再将最新设置回推到所有活动标签页。

## 设置与日志
- 设置结构统一存放在 `chrome.storage.sync`，内容脚本通过 `getSettings()` 取得缓存值，后续变更会触发模块内部的 `updateSettings`。
- 为避免污染宿主页面控制台，所有模块默认静默，仅在显式设置 `window.tabletBrowseDebug = true`（内容脚本）或 `self.tabletBrowseDebug = true`（Service Worker）时输出 `logDebug/logWarn/logError`。

## 视频优化模块 (`content/features/video-optimizer.js`)

### 工作流程
1. **初始化**：读取设置并合并默认值（强制 H.264、限制分辨率 720p、FPS 30 等）。
2. **媒体劫持**：
   - 扫描页面现有 `<video>` 元素，并监听 DOM Mutation，以捕获 SPA/懒加载带来的新视频。
   - 重写单个视频元素的 `src` setter，所有后续赋值都会先经过 `processVideoSource`。
   - 遍历 `<source>` 子节点，对静态资源同样改写。
3. **URL 重写**：`processVideoSource` 将原地址包装为 `URL`，统一增删查询参数：
   - 移除现有 `codec/vcodec`，写入 `h264`。
   - 如果路径或查询字符串提示 AV1、VP9 编码，则调用 `createFallbackUrl` 生成回退地址，保留原路径只替换查询参数。
   - 根据设置附加 `maxres/maxfps` 等字段，辅助部分站点选择更低清晰度资源。
4. **MSE 拦截**：通过猴补 `MediaSource.prototype.addSourceBuffer`，当站点尝试请求 `video/mp4;codecs="av01"` 或 `vp9` 等 MIME 时，直接抛出 `NotSupportedError`，迫使播放器降回 H.264 轨道。
5. **分辨率/帧率执行**：在 `loadedmetadata` 事件或现成就绪的情况下，调用 `enforceResolutionLimits` 校正播放高度，必要时尝试切换低码率 Track；若检测到 `playbackRate` 超过限制，会动态调整。

### 场景影响
- YouTube、Bilibili、知乎课堂等支持多编解码器的站点会被强制回退到 H.264 轨；结合分辨率上限，可显著降低解码能耗与内存占用。
- 无 `<video>` 的页面（例如 WebGL Demo、纯音频站点）不会触发任何逻辑，模块几乎无开销。

### 局限
- 对完全自定义的自适应播放器（自行实现媒体调度、未调用标准 `MediaSource`）可能无效。
- 仅通过查询参数提示站点选择 H.264，无法保证服务端绝对提供；遇到只提供 AV1 的资源会导致播放失败。
- 不参与 GPU 着色器或 Canvas 绘制，无法缓解 WebGL“毒蘑菇”等纯 Shader 压测场景。

## 渲染减负模块 (`content/features/render-optimizer.js`)

### 工作流程
1. **初始化**：合并默认配置（懒加载、图片优化、减少动画等）后启用 DOM Mutation Observer。
2. **节点排队**：新增节点会被放入 `pendingNodes` 集合，统一在 `requestIdleCallback`（或回退到 `setTimeout`）里批处理，避免频繁同步操作造成掉帧。
3. **图片优化**：
   - 对 `<img>`/`<picture>` 自动添加 `loading="lazy"`，减少首屏请求。
   - 解析 `srcset` 列表，过滤超过 `targetDensity` 或 `maxImageWidth` 的候选项。
   - 图片加载后监控 `naturalWidth`，必要时设置 `max-width`、`width/height` 属性，防止巨图撑出布局。
4. **iframe 懒加载**：为无 `loading` 属性的 `<iframe>` 写入 `lazy`，常见于视频卡片、广告位。
5. **动画降级**：
   - 注入 `render-optimizer-reduced-motion` 样式：压缩动画/过渡时长，清理行内 transform/filter。
   - 检测 `prefers-reduced-motion`，自动在 `<body>` 上切换 CSS 类；用户偏好改变时同步生效。
   - 针对含昂贵动画的元素（transform/filter/animation/transition）调用 `optimizeAnimations` 手动简化。

### 场景影响
- 新闻流、长帖子、图库：大幅减少首屏资源与滚动抖动，触控滚动更顺滑。
- SPA 页面：批处理策略保证组件热插拔时不阻塞主线程，降低 Mutation 风暴带来的卡顿。

### 局限
- 不修改 `<canvas>`、WebGL 或 SVG 渲染，无法减少纯 GPU 着色器负载。
- 对于依赖精细动画的 Web App 可能产生视觉差异，需要在设置中关闭或调低动画优化。
- 懒加载依赖浏览器 `loading="lazy"` 行为，在极端老旧内核可能退化为普通加载。

## 毒蘑菇（Volumeshader_bm）案例分析
- 页面核心是高强度 WebGL 片元着色器循环；TabletBrowse Pro 不拦截 WebGL API，也不会降低 `requestAnimationFrame` 频率，因此优化模块几乎不生效。
- 可受益的仅限页面外围元素（若存在）：例如背景图、嵌入视频的 `<iframe>` 会被懒加载，但渲染性能瓶颈仍在 GPU 着色器本身。
- 想降低毒蘑菇压力，需从源站参数入手（降低迭代次数、缩小画布），或依赖系统层面的功耗/频率限制。

## 调试与验证
- 内容脚本：`window.tabletBrowseMain.getModule('videoOptimizer')`、`getModule('renderOptimizer')` 查看状态与设置。
- 视频编码：Chrome DevTools → Media 面板确认实际解码轨；必要时在 Console 里追踪 `logDebug` 输出。
- 渲染性能：利用 Performance 录制滚动，观察 `Mutation`/`Layout`/`Paint` 开销是否下降。
- 回归测试参考 README 中的“Testing Checklist”，确保滑动拦截、视频加载和滚动体验均符合预期。

## 总结
TabletBrowse Pro 通过对标准 DOM/媒体 API 的劫持与懒处理，实现触摸设备上的“低干扰”优化：
- 视频模块在不改动站点 JS 的前提下，优先选择能耗更低的 H.264 清晰度。
- 渲染模块通过延迟批处理与懒加载，缓解瀑布流和动画密集页面的卡顿。
- 面对 WebGL Shader-heavy 页面（如毒蘑菇），扩展不会阻止 GPU 满载，需结合其它手段。

掌握上述原理可以帮助你在调优、扩展功能或排查兼容性问题时快速定位关键路径。
