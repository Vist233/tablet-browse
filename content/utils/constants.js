/**
 * TabletBrowse Pro - 常量定义
 */

// 触摸事件相关常量
const TOUCH_CONSTANTS = {
  LONG_PRESS_DURATION: 600,        // 长按持续时间 (ms) - 为平板优化，降低到600ms
  HIGHLIGHT_DEBOUNCE: 30,          // 高亮防抖延迟 (ms) - 为平板性能优化
  TABLET_MIN_TOUCH_TARGET: 44,     // 平板最小触摸目标尺寸 (px) - 遵循移动端设计规范
  TOUCH_TOLERANCE: 10              // 触摸容差 (px) - 手指触摸的误差范围
};

// CSS 类名
const CSS_CLASSES = {
  TABLET_BROWSE_ACTIVE: 'tablet-browse-active',
  HIGHLIGHTED: 'tb-highlighted'
};

// 选择器
const SELECTORS = {
  INTERACTIVE: 'a, button, input, select, textarea, [onclick], [role="button"], [tabindex]:not([tabindex="-1"])'
};

// 事件名称
const EVENTS = {
  ELEMENT_HIGHLIGHTED: 'tb-element-highlighted',
  SWIPE_PREVENTED: 'tb-swipe-prevented',
  FONT_SIZE_CHANGED: 'tb-font-size-changed'
};

// Z-index 层级
const Z_INDEX = {
  HIGHLIGHT: 9997
};

// 动画持续时间
const ANIMATION_DURATION = {
  FADE_IN: 200,
  HIGHLIGHT: 100
};
