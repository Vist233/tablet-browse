/**
 * TabletBrowse Pro - 工具函数
 */

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 节流函数
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 获取元素的绝对位置
function getElementPosition(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + window.scrollX,
    y: rect.top + window.scrollY,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2
  };
}

// 计算两点之间的距离
function getDistance(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// 检查元素是否可见
function isElementVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetWidth > 0 && 
         element.offsetHeight > 0;
}

// 检查元素是否在视口内
function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// 获取指定点下的可交互元素
function getInteractiveElementAt(x, y) {
  const elements = document.elementsFromPoint(x, y);
  return elements.find(el => el.matches && el.matches(SELECTORS.INTERACTIVE));
}

// 创建自定义事件
function createCustomEvent(eventName, detail = {}) {
  return new CustomEvent(eventName, {
    detail,
    bubbles: true,
    cancelable: true
  });
}

// 模拟鼠标事件
function simulateMouseEvent(element, eventType, options = {}) {
  const event = new MouseEvent(eventType, {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: options.clientX || 0,
    clientY: options.clientY || 0,
    ...options
  });
  element.dispatchEvent(event);
}

// 获取元素的所有父级元素
function getParents(element) {
  const parents = [];
  let current = element.parentElement;
  while (current) {
    parents.push(current);
    current = current.parentElement;
  }
  return parents;
}

// 安全地获取设置（统一走 ChromeAPI 存储）
async function getSettings() {
  try {
    const defaults = getDefaultSettings();
    const raw = await (window.ChromeAPI?.storageGet ? window.ChromeAPI.storageGet() : Promise.resolve({}));
    // 合并默认值，确保缺省项存在
    return { ...defaults, ...(raw || {}) };
  } catch (error) {
    console.error('Failed to get settings:', error);
    return getDefaultSettings();
  }
}

// 获取默认设置
function getDefaultSettings() {
  return {
    enabled: true,
    highlightEnabled: true
  };
}

// 添加CSS样式
function addStyles(css) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

// 获取选中的文本
function getSelectedText() {
  const selection = window.getSelection();
  return selection.toString().trim();
}
