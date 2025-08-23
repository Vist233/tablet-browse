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
    this.swipeThreshold = 50; // 滑动阈值（像素）
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.bindEvents();
  }

  bindEvents() {
    // 触摸事件监听 - 阻止默认滑动行为
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
    
    // 设置更新监听
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = event.detail.settings;
    });
  }

  handleTouchStart(event) {
    if (!this.settings.swipeDisabled) return;
    
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    
    // 记录开始时间用于速度计算
    this.touchStartTime = Date.now();
  }

  handleTouchMove(event) {
    if (!this.settings.swipeDisabled || event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    const deltaX = Math.abs(currentX - this.touchStartX);
    const deltaY = Math.abs(currentY - this.touchStartY);
    
    // 如果是明显的水平滑动，阻止默认行为
    if (deltaX > this.swipeThreshold && deltaX > deltaY * 2) {
      event.preventDefault();
      event.stopPropagation();
      
      // 触发滑动阻止事件
      document.dispatchEvent(createCustomEvent('swipePrevented', {
        direction: currentX > this.touchStartX ? 'right' : 'left',
        distance: deltaX,
        timestamp: Date.now()
      }));
    }
  }

  handleTouchEnd(event) {
    if (!this.settings.swipeDisabled) return;
    
    // 重置触摸状态
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
  }

  // 公共方法：启用滑动禁用
  enable() {
    this.isActive = true;
    console.log('TabletBrowse Pro: Swipe disabler enabled');
  }

  // 公共方法：禁用滑动禁用
  disable() {
    this.isActive = false;
    console.log('TabletBrowse Pro: Swipe disabler disabled');
  }

  // 公共方法：清理
  cleanup() {
    // 移除事件监听器
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
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