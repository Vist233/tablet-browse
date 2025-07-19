/**
 * TabletBrowse Pro - 精准点击模式
 * 提供放大镜和准星工具，让用户精确点击小元素
 */

class PrecisionClickHandler {
  constructor() {
    this.settings = {};
    this.isActive = false;
    this.magnifier = null;
    this.crosshair = null;
    this.overlay = null;
    this.zoomLevel = 2;
    this.magnifierSize = 200;
    this.activationTimer = null;
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.bindEvents();
  }

  bindEvents() {
    // 监听长按事件来激活精准模式
    document.addEventListener(EVENTS.LONG_PRESS_START, this.handleLongPress.bind(this));
    
    // 监听双击事件作为备用激活方式
    document.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    
    // 监听设置更新
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = event.detail.settings;
    });
    
    // 监听键盘事件
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleLongPress(event) {
    if (!this.settings.precisionClickEnabled) return;
    
    const { target } = event.detail;
    
    // 检查是否为小元素或密集区域
    if (this.shouldActivatePrecisionMode(target)) {
      this.activationTimer = setTimeout(() => {
        this.activatePrecisionMode(event.detail.clientX, event.detail.clientY);
      }, 1200); // 比普通长按稍长一点
    }
  }

  handleDoubleClick(event) {
    if (!this.settings.precisionClickEnabled) return;
    
    // 双击激活精准模式
    event.preventDefault();
    this.activatePrecisionMode(event.clientX, event.clientY);
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' && this.isActive) {
      this.deactivatePrecisionMode();
    }
  }

  shouldActivatePrecisionMode(target) {
    if (!target) return false;
    
    // 检查元素大小
    const rect = target.getBoundingClientRect();
    const isSmall = rect.width < 44 || rect.height < 44; // 小于推荐的触摸目标大小
    
    // 检查是否在密集区域
    const isDense = this.isInDenseArea(target);
    
    // 检查是否为特定类型的小元素
    const isSmallInteractive = target.matches('a, button, input[type="checkbox"], input[type="radio"], select') && isSmall;
    
    return isSmall || isDense || isSmallInteractive;
  }

  isInDenseArea(target) {
    // 检查周围是否有很多可点击元素
    const rect = target.getBoundingClientRect();
    const searchRadius = 50;
    
    const nearbyElements = document.elementsFromPoint(rect.left, rect.top)
      .concat(document.elementsFromPoint(rect.right, rect.top))
      .concat(document.elementsFromPoint(rect.left, rect.bottom))
      .concat(document.elementsFromPoint(rect.right, rect.bottom));
    
    const interactiveCount = nearbyElements.filter(el => 
      el.matches && el.matches(SELECTORS.INTERACTIVE)
    ).length;
    
    return interactiveCount > 3;
  }

  activatePrecisionMode(centerX, centerY) {
    if (this.isActive) return;
    
    this.isActive = true;
    document.body.classList.add(CSS_CLASSES.PRECISION_MODE);
    
    this.createOverlay();
    this.createMagnifier(centerX, centerY);
    this.createCrosshair(centerX, centerY);
    
    // 绑定精准模式事件
    this.bindPrecisionEvents();
    
    // 触发自定义事件
    document.dispatchEvent(createCustomEvent(EVENTS.PRECISION_MODE_TOGGLE, {
      active: true,
      centerX,
      centerY
    }));
  }

  deactivatePrecisionMode() {
    if (!this.isActive) return;
    
    this.isActive = false;
    document.body.classList.remove(CSS_CLASSES.PRECISION_MODE);
    
    // 清理UI元素
    this.cleanupUI();
    
    // 解绑事件
    this.unbindPrecisionEvents();
    
    // 清理定时器
    if (this.activationTimer) {
      clearTimeout(this.activationTimer);
      this.activationTimer = null;
    }
    
    // 触发自定义事件
    document.dispatchEvent(createCustomEvent(EVENTS.PRECISION_MODE_TOGGLE, {
      active: false
    }));
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tb-precision-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.3);
      z-index: ${Z_INDEX.PRECISION_OVERLAY};
      cursor: none;
      animation: tbFadeIn 0.3s ease;
    `;
    
    document.body.appendChild(this.overlay);
  }

  createMagnifier(centerX, centerY) {
    this.magnifier = document.createElement('div');
    this.magnifier.className = 'tb-magnifier';
    this.magnifier.style.cssText = `
      position: fixed;
      width: ${this.magnifierSize}px;
      height: ${this.magnifierSize}px;
      border: 3px solid #007bff;
      border-radius: 50%;
      z-index: ${Z_INDEX.MAGNIFIER};
      pointer-events: none;
      overflow: hidden;
      background: white;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      animation: tbFadeIn 0.3s ease;
    `;
    
    // 创建放大的内容
    this.magnifierContent = document.createElement('div');
    this.magnifierContent.style.cssText = `
      position: absolute;
      transform-origin: 0 0;
      transform: scale(${this.zoomLevel});
      pointer-events: none;
    `;
    
    this.magnifier.appendChild(this.magnifierContent);
    document.body.appendChild(this.magnifier);
    
    this.updateMagnifier(centerX, centerY);
  }

  createCrosshair(centerX, centerY) {
    this.crosshair = document.createElement('div');
    this.crosshair.className = 'tb-crosshair';
    this.crosshair.style.cssText = `
      position: fixed;
      width: 30px;
      height: 30px;
      z-index: ${Z_INDEX.MAGNIFIER + 1};
      pointer-events: none;
      animation: tbFadeIn 0.3s ease;
    `;
    
    // 创建十字线
    const horizontal = document.createElement('div');
    horizontal.style.cssText = `
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      height: 2px;
      background: #ff4444;
      transform: translateY(-50%);
    `;
    
    const vertical = document.createElement('div');
    vertical.style.cssText = `
      position: absolute;
      left: 50%;
      top: 0;
      width: 2px;
      height: 100%;
      background: #ff4444;
      transform: translateX(-50%);
    `;
    
    this.crosshair.appendChild(horizontal);
    this.crosshair.appendChild(vertical);
    document.body.appendChild(this.crosshair);
    
    this.updateCrosshair(centerX, centerY);
  }

  updateMagnifier(x, y) {
    if (!this.magnifier) return;
    
    // 更新放大镜位置
    const magnifierX = Math.max(this.magnifierSize / 2, 
      Math.min(window.innerWidth - this.magnifierSize / 2, x));
    const magnifierY = Math.max(this.magnifierSize / 2, 
      Math.min(window.innerHeight - this.magnifierSize / 2, y - this.magnifierSize / 2 - 20));
    
    this.magnifier.style.left = (magnifierX - this.magnifierSize / 2) + 'px';
    this.magnifier.style.top = (magnifierY - this.magnifierSize / 2) + 'px';
    
    // 更新放大内容
    this.updateMagnifierContent(x, y);
  }

  updateMagnifierContent(x, y) {
    if (!this.magnifierContent) return;
    
    // 计算要放大的区域
    const sourceSize = this.magnifierSize / this.zoomLevel;
    const sourceX = x - sourceSize / 2;
    const sourceY = y - sourceSize / 2;
    
    // 克隆页面内容
    const bodyClone = document.body.cloneNode(true);
    
    // 移除我们添加的UI元素
    bodyClone.querySelectorAll('.tb-precision-overlay, .tb-magnifier, .tb-crosshair').forEach(el => el.remove());
    
    // 设置克隆内容的样式
    bodyClone.style.cssText = `
      position: absolute;
      left: ${-sourceX * this.zoomLevel}px;
      top: ${-sourceY * this.zoomLevel}px;
      width: ${document.body.scrollWidth}px;
      height: ${document.body.scrollHeight}px;
      transform-origin: 0 0;
      pointer-events: none;
    `;
    
    // 清空并更新放大镜内容
    this.magnifierContent.innerHTML = '';
    this.magnifierContent.appendChild(bodyClone);
  }

  updateCrosshair(x, y) {
    if (!this.crosshair) return;
    
    this.crosshair.style.left = (x - 15) + 'px';
    this.crosshair.style.top = (y - 15) + 'px';
  }

  bindPrecisionEvents() {
    this.precisionMouseMove = this.handlePrecisionMouseMove.bind(this);
    this.precisionClick = this.handlePrecisionClick.bind(this);
    this.precisionTouchMove = this.handlePrecisionTouchMove.bind(this);
    this.precisionTouchEnd = this.handlePrecisionTouchEnd.bind(this);
    
    document.addEventListener('mousemove', this.precisionMouseMove);
    document.addEventListener('click', this.precisionClick);
    document.addEventListener('touchmove', this.precisionTouchMove, { passive: false });
    document.addEventListener('touchend', this.precisionTouchEnd);
  }

  unbindPrecisionEvents() {
    document.removeEventListener('mousemove', this.precisionMouseMove);
    document.removeEventListener('click', this.precisionClick);
    document.removeEventListener('touchmove', this.precisionTouchMove);
    document.removeEventListener('touchend', this.precisionTouchEnd);
  }

  handlePrecisionMouseMove(event) {
    this.updateMagnifier(event.clientX, event.clientY);
    this.updateCrosshair(event.clientX, event.clientY);
  }

  handlePrecisionClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    // 执行精准点击
    this.executePrecisionClick(event.clientX, event.clientY);
    this.deactivatePrecisionMode();
  }

  handlePrecisionTouchMove(event) {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      this.updateMagnifier(touch.clientX, touch.clientY);
      this.updateCrosshair(touch.clientX, touch.clientY);
    }
    event.preventDefault();
  }

  handlePrecisionTouchEnd(event) {
    if (event.changedTouches.length > 0) {
      const touch = event.changedTouches[0];
      this.executePrecisionClick(touch.clientX, touch.clientY);
      this.deactivatePrecisionMode();
    }
    event.preventDefault();
  }

  executePrecisionClick(x, y) {
    // 找到精确位置的元素
    const targetElement = document.elementFromPoint(x, y);
    
    if (targetElement) {
      // 模拟点击事件
      simulateMouseEvent(targetElement, 'click', {
        clientX: x,
        clientY: y
      });
      
      // 添加点击反馈
      this.addClickFeedback(targetElement, x, y);
    }
  }

  addClickFeedback(element, x, y) {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      left: ${x - 10}px;
      top: ${y - 10}px;
      width: 20px;
      height: 20px;
      border: 2px solid #00ff00;
      border-radius: 50%;
      pointer-events: none;
      z-index: ${Z_INDEX.MAGNIFIER + 2};
      animation: precisionClickFeedback 0.6s ease-out forwards;
    `;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.remove();
    }, 600);
  }

  cleanupUI() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    if (this.magnifier) {
      this.magnifier.remove();
      this.magnifier = null;
      this.magnifierContent = null;
    }
    
    if (this.crosshair) {
      this.crosshair.remove();
      this.crosshair = null;
    }
  }
}

// 全局精准点击处理器实例
window.tabletBrowsePrecisionClickHandler = null;
