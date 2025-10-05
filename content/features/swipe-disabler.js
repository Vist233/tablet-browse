/**
 * TabletBrowse Pro - 页面滑动行为禁用器
 * 禁用页面的左右滑动行为，防止意外页面导航
 */

class SwipeDisabler {
  constructor() {
    this.settings = {};
    this.isActive = false;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.swipeThreshold = 18; // 滑动阈值（像素）
    this.edgeGuardWidth = 24; // 屏幕边缘保护宽度

    this.handleTouchStartBound = this.handleTouchStart.bind(this);
    this.handleTouchMoveBound = this.handleTouchMove.bind(this);
    this.handleTouchEndBound = this.handleTouchEnd.bind(this);
    this.handleSettingsUpdatedBound = this.handleSettingsUpdated.bind(this);

    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.bindEvents();
  }

  bindEvents() {
    // 触摸事件监听 - 阻止默认滑动行为
    document.addEventListener('touchstart', this.handleTouchStartBound, { passive: false });
    document.addEventListener('touchmove', this.handleTouchMoveBound, { passive: false });
    document.addEventListener('touchend', this.handleTouchEndBound, { passive: true });

    // 设置更新监听
    document.addEventListener('settingsUpdated', this.handleSettingsUpdatedBound);
  }

  handleTouchStart(event) {
    if (!this.settings.swipeDisabled) return;
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    
    // 记录开始时间用于速度计算
    this.touchStartTime = Date.now();

    // 针对边缘滑动手势，立即阻止默认返回操作
    if (this.isEdgeSwipeStart(this.touchStartX) && event.cancelable) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  handleTouchMove(event) {
    if (!this.settings.swipeDisabled || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;

    const deltaX = Math.abs(currentX - this.touchStartX);
    const deltaY = Math.abs(currentY - this.touchStartY);

    if (!event.cancelable) return;

    const isHorizontalPriority = deltaX >= deltaY;
    const exceedsThreshold = deltaX > this.swipeThreshold;
    const startedFromEdge = this.isEdgeSwipeStart(this.touchStartX);

    // 如果是明显的水平滑动，阻止默认行为
    if ((isHorizontalPriority && exceedsThreshold) || startedFromEdge) {
      this.preventSwipe(event, currentX > this.touchStartX ? 'right' : 'left', deltaX);
      return;
    }
  }

  handleTouchEnd(event) {
    if (!this.settings.swipeDisabled) return;
    
    // 重置触摸状态
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.isActive = false;
  }

  handleSettingsUpdated(event) {
    this.settings = event.detail.settings;
  }

  isEdgeSwipeStart(x) {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    return x < this.edgeGuardWidth || x > viewportWidth - this.edgeGuardWidth;
  }

  preventSwipe(event, direction, distance) {
    if (event.cancelable) {
      event.preventDefault();
    }
    event.stopImmediatePropagation();
    this.isActive = true;

    document.dispatchEvent(createCustomEvent('swipePrevented', {
      direction,
      distance,
      timestamp: Date.now()
    }));
  }

  // 公共方法：启用滑动禁用
  enable() {
    this.isActive = true;
    logDebug('TabletBrowse Pro: Swipe disabler enabled');
  }

  // 公共方法：禁用滑动禁用
  disable() {
    this.isActive = false;
    logDebug('TabletBrowse Pro: Swipe disabler disabled');
  }

  // 公共方法：清理
  cleanup() {
    // 移除事件监听器
    document.removeEventListener('touchstart', this.handleTouchStartBound);
    document.removeEventListener('touchmove', this.handleTouchMoveBound);
    document.removeEventListener('touchend', this.handleTouchEndBound);
    document.removeEventListener('settingsUpdated', this.handleSettingsUpdatedBound);
  }

  // 公共方法：获取状态
  getStatus() {
    return {
      isActive: this.isActive,
      settings: { ...this.settings }
    };
  }
}

// 全局滑动禁用器实例
window.tabletBrowseSwipeDisabler = null;
