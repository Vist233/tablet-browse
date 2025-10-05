# TabletBrowse Pro

平板优先的 Chromium 扩展，聚焦触摸体验、视频播放与渲染性能的全面优化。加载后内容脚本会与背景 Service Worker 协同工作，为任意 http/https 页面提供稳定且无感的增益体验，且不会再屏蔽文本选择或复制操作。

## 核心特性

- **横向滑动防误触**：`SwipeDisabler` 会在左右 24px 处拦截横向手势，避免意外触发浏览器返回/前进，同时保持文本选择与长按复制能力。
- **视频播放调优**：`VideoOptimizer` 会拦截 AV1/VP9（含 MSE 自适应流），强制 H.264，并根据设置附加分辨率/帧率上限。加载后即检查现有 `<video>` 与 `source`，确保回退链路生效。
- **渲染减负**：`RenderOptimizer` 采用延迟批处理，仅对新增节点做懒加载与 srcset 裁剪，必要时注入低动效样式，减少频繁 DOM 变化下的重复计算。
- **静默运行**：默认关闭所有日志；在开发环境通过 `window.tabletBrowseDebug = true`（或 Service Worker 中设置 `self.tabletBrowseDebug = true`）即可即时启用调试输出。
- **即时配置同步**：设置读取采用缓存合并策略，任何来自弹窗或内容脚本的更新都会广播 `settingsUpdated`，确保页面瞬时响应。

## 安装与开发

1. 打开 Chrome，访问 `chrome://extensions` 并启用“开发者模式”。
2. 点击“加载已解压的扩展程序”，选择仓库根目录。
3. 修改后使用扩展面板中的“重新加载”按钮即可热更新。

> 打包分发：`mkdir -p dist && zip -r dist/tablet-browse-pro.zip manifest.json background content popup icons -x "*/.DS_Store"`

## 弹窗快速开关

弹窗 (`popup/`) 提供模块级按钮，可独立启用/禁用插件、滑动抑制、视频优化与渲染优化；更改会立即写入 `chrome.storage.sync` 并广播至所有标签页。

## 目录速览

```
manifest.json              # MV3 配置，限制在 http/https
background/background.js   # Service Worker，负责存储同步与消息调度
content/                    # 主运行时代码（features/utils/styles/main.js）
popup/                      # 扩展弹窗 UI
icons/                      # 图标资源
```

## 许可证

本项目使用 Apache 2.0 许可证。
