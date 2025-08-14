/**
 * TabletBrowse Pro - 可交互元素高亮器
 * 手指按住移动时自动高亮可点击元素的视觉反馈系统
 */

class ElementHighlighter {
  constructor() {
    this.settings = {};
    this.isActive = false;
    this.highlightedElements = new Set();
    this.lastHighlightTime = 0;
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.bindEvents();
    this.setupIntersectionObserver();
  }

  bindEvents() {
    // 触摸事件监听
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    
    // 鼠标事件监听（用于桌面测试）
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    // 设置更新监听
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = event.detail.settings;
    });
    
    // 页面滚动时更新高亮
    document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
  }

  setupIntersectionObserver() {
    // 监听元素进入/离开视口，优化性能
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          this.removeHighlight(entry.target);
        }
      });
    }, {
      threshold: 0,
      rootMargin: '-10px'
    });
  }

  handleTouchStart(event) {
    if (!this.settings.highlightEnabled) return;
    
    this.isActive = true;
    this.touchTrail = [];
    
    const touch = event.touches[0];
    this.startHighlighting(touch.clientX, touch.clientY);
  }

  handleTouchMove(event) {
    if (!this.settings.highlightEnabled || !this.isActive) return;
    
    const touch = event.touches[0];
    this.updateHighlighting(touch.clientX, touch.clientY);
  }

  handleTouchEnd(event) {
    if (!this.settings.highlightEnabled) return;
    
    this.isActive = false;
    this.scheduleCleanup();
  }

  handleMouseDown(event) {
    if (!this.settings.highlightEnabled) return;
    
    this.isActive = true;
    this.startHighlighting(event.clientX, event.clientY);
  }

  handleMouseMove(event) {
    if (!this.settings.highlightEnabled || !this.isActive) return;
    
    this.updateHighlighting(event.clientX, event.clientY);
  }

  handleMouseUp(event) {
    if (!this.settings.highlightEnabled) return;
    
    this.isActive = false;
    this.scheduleCleanup();
  }

  handleScroll() {
    if (this.isActive) {
      // 滚动时重新计算高亮
      this.refreshHighlights();
    }
  }

  startHighlighting(x, y) {
    this.clearAllHighlights();
    this.updateHighlighting(x, y);
  }

  updateHighlighting(x, y) {
    // 防抖处理，避免过于频繁的更新
    const now = Date.now();
    if (now - this.lastHighlightTime < TOUCH_CONSTANTS.HIGHLIGHT_DEBOUNCE) {
      return;
    }
    this.lastHighlightTime = now;

    // 获取指定位置的所有元素
    const elementsAtPoint = document.elementsFromPoint(x, y);
    const interactiveElements = this.findInteractiveElements(elementsAtPoint);
    
    // 高亮新的可交互元素
    interactiveElements.forEach(element => {
      this.highlightElement(element, x, y);
    });
    
    // 触发高亮事件
    if (interactiveElements.length > 0) {
      document.dispatchEvent(createCustomEvent(EVENTS.ELEMENT_HIGHLIGHTED, {
        elements: interactiveElements,
        position: { x, y }
      }));
    }
  }

  findInteractiveElements(elements) {
    const interactive = [];
    const processed = new Set();
    
    elements.forEach(element => {
      if (processed.has(element)) return;
      processed.add(element);
      
      if (this.isInteractiveElement(element)) {
        interactive.push(element);
      }
      
      // 检查父级元素
      let parent = element.parentElement;
      while (parent && parent !== document.body && !processed.has(parent)) {
        processed.add(parent);
        if (this.isInteractiveElement(parent)) {
          interactive.push(parent);
          break; // 找到交互父级后停止向上查找
        }
        parent = parent.parentElement;
      }
    });
    
    return interactive;
  }

  isInteractiveElement(element) {
    if (!element || !element.matches) return false;
    
    // 基本的可交互元素
    if (element.matches(SELECTORS.INTERACTIVE)) return true;
    
    // 检查是否有点击事件监听器
    if (element.onclick) return true;
    
    // 检查CSS cursor属性
    const computedStyle = getComputedStyle(element);
    if (computedStyle.cursor === 'pointer') return true;
    
    // 检查是否有特定的CSS类
    const interactiveClasses = [
      'btn', 'button', 'link', 'clickable', 'interactive',
      'menu-item', 'nav-item', 'tab', 'card', 'tile'
    ];
    
    if (interactiveClasses.some(cls => element.classList.contains(cls))) {
      return true;
    }
    
    // 检查ARIA属性
    const role = element.getAttribute('role');
    if (['button', 'link', 'menuitem', 'tab', 'option'].includes(role)) {
      return true;
    }
    
    // 检查元素大小（过小的元素可能不是真正的交互元素）
    const rect = element.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return false;
    
    return false;
  }

  highlightElement(element, x, y) {
    if (this.highlightedElements.has(element)) return;
    
    // 添加高亮样式
    element.classList.add(CSS_CLASSES.HIGHLIGHTED);
    this.highlightedElements.add(element);
    
    // 开始观察元素
    this.intersectionObserver.observe(element);
    
    // 设置自动移除定时器
    setTimeout(() => {
      if (!this.isActive) {
        this.removeHighlight(element);
      }
    }, 1500);
  }

  removeHighlight(element) {
    if (!this.highlightedElements.has(element)) return;
    
    element.classList.remove(CSS_CLASSES.HIGHLIGHTED);
    this.highlightedElements.delete(element);
    
    // 停止观察元素
    this.intersectionObserver.unobserve(element);
  }

  clearAllHighlights() {
    this.highlightedElements.forEach(element => {
      this.removeHighlight(element);
    });
    this.highlightedElements.clear();
  }

  refreshHighlights() {
    // 重新计算所有高亮元素的位置
    // 边框效果已移除，此方法现在为空
  }

  scheduleCleanup() {
    // 延迟清理高亮，给用户时间看到反馈
    setTimeout(() => {
      if (!this.isActive) {
        this.clearAllHighlights();
      }
    }, 800);
  }

  // 公共方法：手动高亮元素
  manualHighlight(element, duration = 1000) {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    this.highlightElement(element, centerX, centerY);
    
    setTimeout(() => {
      this.removeHighlight(element);
    }, duration);
  }

  // 公共方法：获取当前高亮的元素
  getHighlightedElements() {
    return Array.from(this.highlightedElements);
  }

  // 公共方法：检查元素是否被高亮
  isElementHighlighted(element) {
    return this.highlightedElements.has(element);
  }
}

// 全局元素高亮器实例
window.tabletBrowseElementHighlighter = null;
