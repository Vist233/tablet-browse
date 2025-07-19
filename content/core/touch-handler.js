/**
 * TabletBrowse Pro - 触摸事件处理器
 * 处理所有触摸相关的事件和手势识别
 */

class TouchHandler {
  constructor() {
    this.touchStartTime = 0;
    this.touchStartPosition = { x: 0, y: 0 };
    this.currentTouches = new Map();
    this.longPressTimer = null;
    this.isLongPressing = false;
    this.settings = {};
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.bindEvents();
  }

  bindEvents() {
    // 触摸事件监听
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });

    // 设置更新监听
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = event.detail.settings;
    });
  }

  handleTouchStart(event) {
    if (!this.settings.enabled) return;

    const touch = event.touches[0];
    const target = event.target;
    
    // 记录触摸信息
    this.touchStartTime = Date.now();
    this.touchStartPosition = { x: touch.clientX, y: touch.clientY };
    this.currentTouches.set(touch.identifier, {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      target: target,
      startTime: this.touchStartTime
    });

    // 检查是否为可悬停元素
    if (this.isHoverableElement(target)) {
      this.startLongPressDetection(target, touch);
    }

    // 阻止默认的触摸行为
    if (this.shouldPreventDefault(target)) {
      event.preventDefault();
    }
  }

  handleTouchMove(event) {
    if (!this.settings.enabled) return;

    const touch = event.touches[0];
    if (!touch) return;

    const touchInfo = this.currentTouches.get(touch.identifier);
    if (!touchInfo) return;

    // 更新触摸位置
    touchInfo.currentX = touch.clientX;
    touchInfo.currentY = touch.clientY;

    // 计算移动距离
    const distance = getDistance(
      { x: touchInfo.startX, y: touchInfo.startY },
      { x: touch.clientX, y: touch.clientY }
    );

    // 如果移动距离超过阈值，取消长按检测
    if (distance > TOUCH_CONSTANTS.PRECISION_CLICK_THRESHOLD) {
      this.cancelLongPress();
    }

    // 触发元素高亮
    this.highlightElementUnderTouch(touch.clientX, touch.clientY);
  }

  handleTouchEnd(event) {
    if (!this.settings.enabled) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const touchInfo = this.currentTouches.get(touch.identifier);
    if (!touchInfo) return;

    // 清理触摸信息
    this.currentTouches.delete(touch.identifier);
    this.cancelLongPress();

    // 如果是短按且没有移动太多，执行正常点击
    const touchDuration = Date.now() - touchInfo.startTime;
    const distance = getDistance(
      { x: touchInfo.startX, y: touchInfo.startY },
      { x: touch.clientX, y: touch.clientY }
    );

    if (touchDuration < this.settings.hoverDelay && 
        distance < TOUCH_CONSTANTS.PRECISION_CLICK_THRESHOLD &&
        !this.isLongPressing) {
      this.handleNormalClick(touchInfo.target, touch);
    }

    this.isLongPressing = false;
  }

  handleTouchCancel(event) {
    if (!this.settings.enabled) return;

    // 清理所有触摸状态
    this.currentTouches.clear();
    this.cancelLongPress();
    this.isLongPressing = false;
  }

  startLongPressDetection(target, touch) {
    this.cancelLongPress();
    
    this.longPressTimer = setTimeout(() => {
      if (this.currentTouches.size > 0) {
        this.triggerLongPress(target, touch);
      }
    }, this.settings.hoverDelay || TOUCH_CONSTANTS.LONG_PRESS_DURATION);
  }

  cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  triggerLongPress(target, touch) {
    this.isLongPressing = true;
    
    // 添加长按反馈效果
    target.classList.add('tb-long-press-feedback');
    setTimeout(() => {
      target.classList.remove('tb-long-press-feedback');
    }, 800);

    // 触发长按事件
    const longPressEvent = createCustomEvent(EVENTS.LONG_PRESS_START, {
      target: target,
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    
    document.dispatchEvent(longPressEvent);

    // 如果是悬停元素，模拟悬停效果
    if (this.isHoverableElement(target)) {
      this.simulateHover(target, touch);
    }
  }

  simulateHover(target, touch) {
    // 添加悬停样式
    target.classList.add(CSS_CLASSES.HOVER_SIMULATED);
    
    // 模拟鼠标进入事件
    simulateMouseEvent(target, 'mouseenter', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    
    simulateMouseEvent(target, 'mouseover', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });

    // 延迟移除悬停效果
    setTimeout(() => {
      target.classList.remove(CSS_CLASSES.HOVER_SIMULATED);
      
      // 模拟鼠标离开事件
      simulateMouseEvent(target, 'mouseleave', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      
      simulateMouseEvent(target, 'mouseout', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    }, 2000); // 2秒后自动取消悬停
  }

  handleNormalClick(target, touch) {
    // 模拟正常的点击事件
    simulateMouseEvent(target, 'click', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
  }

  highlightElementUnderTouch(x, y) {
    if (!this.settings.highlightEnabled) return;

    const element = getInteractiveElementAt(x, y);
    if (element) {
      // 移除之前的高亮
      document.querySelectorAll('.tb-highlighted').forEach(el => {
        el.classList.remove('tb-highlighted');
      });
      
      // 添加新的高亮
      element.classList.add('tb-highlighted');
      
      // 延迟移除高亮
      setTimeout(() => {
        element.classList.remove('tb-highlighted');
      }, 1000);
    }
  }

  isHoverableElement(element) {
    if (!element || !element.matches) return false;
    
    return element.matches(SELECTORS.HOVERABLE) ||
           element.title ||
           element.getAttribute('data-tooltip') ||
           element.classList.contains('dropdown') ||
           element.classList.contains('menu-item') ||
           element.onmouseover ||
           getComputedStyle(element).cursor === 'pointer';
  }

  shouldPreventDefault(target) {
    // 对于某些元素，我们需要阻止默认行为
    return target.matches('a, button, [onclick], [role="button"]') ||
           target.classList.contains('dropdown') ||
           target.classList.contains('menu-item');
  }
}

// 全局触摸处理器实例
window.tabletBrowseTouchHandler = null;
