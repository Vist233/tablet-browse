/**
 * TabletBrowse Pro - 常量定义
 */

// 触摸事件相关常量
const TOUCH_CONSTANTS = {
  LONG_PRESS_DURATION: 600,        // 长按持续时间 (ms) - 为平板优化，降低到600ms
  HOVER_SIMULATION_DELAY: 100,     // 悬停模拟延迟 (ms)
  PRECISION_CLICK_THRESHOLD: 15,   // 精准点击阈值 (px) - 为手指触摸增加到15px
  GESTURE_MIN_DISTANCE: 40,        // 手势最小距离 (px) - 为平板优化，减少到40px
  THREE_FINGER_THRESHOLD: 3,       // 三指手势阈值
  HIGHLIGHT_DEBOUNCE: 30,          // 高亮防抖延迟 (ms) - 为平板性能优化
  TABLET_MIN_TOUCH_TARGET: 44,     // 平板最小触摸目标尺寸 (px) - 遵循移动端设计规范
  DOUBLE_TAP_DELAY: 300,           // 双击延迟 (ms) - 平板优化
  TOUCH_TOLERANCE: 10,             // 触摸容差 (px) - 手指触摸的误差范围
  SWIPE_VELOCITY_THRESHOLD: 0.5    // 滑动速度阈值 (px/ms) - 平板手势识别
};

// CSS 类名
const CSS_CLASSES = {
  TABLET_BROWSE_ACTIVE: 'tablet-browse-active',
  HOVER_SIMULATED: 'tb-hover-simulated',
  PRECISION_MODE: 'tb-precision-mode',
  FOCUS_MODE: 'tb-focus-mode',
  HIGHLIGHTED: 'tb-highlighted',
  SUPER_MENU: 'tb-super-menu',
  MAGNIFIER: 'tb-magnifier',
  CROSSHAIR: 'tb-crosshair'
};

// 选择器
const SELECTORS = {
  INTERACTIVE: 'a, button, input, select, textarea, [onclick], [role="button"], [tabindex]:not([tabindex="-1"])',
  CLICKABLE: 'a, button, input[type="button"], input[type="submit"], [onclick], [role="button"]',
  HOVERABLE: '[title], [data-tooltip], .dropdown, .menu-item, [onmouseover]',
  FOCUSABLE: 'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
};

// 事件名称
const EVENTS = {
  LONG_PRESS_START: 'tb-long-press-start',
  LONG_PRESS_END: 'tb-long-press-end',
  PRECISION_MODE_TOGGLE: 'tb-precision-mode-toggle',
  FOCUS_MODE_TOGGLE: 'tb-focus-mode-toggle',
  GESTURE_DETECTED: 'tb-gesture-detected',
  ELEMENT_HIGHLIGHTED: 'tb-element-highlighted'
};

// 手势类型
const GESTURES = {
  THREE_FINGER_SWIPE_LEFT: 'three-finger-swipe-left',
  THREE_FINGER_SWIPE_RIGHT: 'three-finger-swipe-right',
  LONG_PRESS: 'long-press',
  DOUBLE_TAP: 'double-tap'
};

// Z-index 层级
const Z_INDEX = {
  SUPER_MENU: 10000,
  PRECISION_OVERLAY: 9999,
  MAGNIFIER: 9998,
  HIGHLIGHT: 9997,
  FOCUS_OVERLAY: 9996
};

// 动画持续时间
const ANIMATION_DURATION = {
  FADE_IN: 200,
  FADE_OUT: 150,
  SLIDE_IN: 250,
  HIGHLIGHT: 100
};
