/**
 * Touch Guard - 触摸保护与边缘防护模块
 * 防止误触，提供阅读模式，边缘保护带
 */

class TouchGuard {
  constructor() {
    this.settings = {};
    this.isEnabled = false;
    this.edgeGuards = [];
    this.readingModeEnabled = false;
    this.touchStartX = null;
    this.touchStartY = null;
    this.touchStartTime = null;
    this.isLongPress = false;
    this.longPressTimer = null;
    this.edgeGuardWidth = 16; // 边缘保护带宽度 (px)
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.isEnabled = this.settings.touchGuard?.enabled ?? true;
    
    if (!this.isEnabled) {
      console.log('TouchGuard: Disabled');
      return;
    }

    console.log('TouchGuard: Initializing...');

    // 默认设置
    this.defaultSettings = {
      edgeGuardEnabled: true,
      edgeGuardWidth: 16,
      readingModeEnabled: true,
      readingModeHotkey: 'HoldAlt', // 按住Alt键启用阅读模式
      whitelist: [],
      blacklist: []
    };

    // 合并设置
    this.settings.touchGuard = {
      ...this.defaultSettings,
      ...(this.settings.touchGuard || {})
    };

    this.edgeGuardWidth = this.settings.touchGuard.edgeGuardWidth;

    // 检查当前页面是否在黑名单中
    if (this.isBlacklisted()) {
      console.log('TouchGuard: Page is blacklisted, disabling');
      return;
    }

    this.setupEventListeners();
    
    if (this.settings.touchGuard.edgeGuardEnabled) {
      this.createEdgeGuards();
    }

    if (this.settings.touchGuard.readingModeEnabled) {
      this.applyReadingModeStyles();
    }

    console.log('TouchGuard: Initialized with settings', this.settings.touchGuard);
  }

  isBlacklisted() {
    const currentUrl = window.location.href;
    const blacklist = this.settings.touchGuard.blacklist || [];
    
    return blacklist.some(pattern => {
      if (pattern.startsWith('*')) {
        return currentUrl.includes(pattern.slice(1));
      }
      return currentUrl === pattern;
    });
  }

  setupEventListeners() {
    // 触摸事件监听 - 使用 passive: true 确保滚动性能，只在需要时阻止默认行为
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

    // 键盘事件监听（阅读模式快捷键）
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // 防止事件冒泡
    this.preventEventPropagation();
  }

  handleTouchStart(event) {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isLongPress = false;

    // 启动长按计时器
    this.longPressTimer = setTimeout(() => {
      this.isLongPress = true;
      console.log('TouchGuard: Long press detected - allowing default behavior');
    }, 300); // 300ms后认为是长按

    // 检查是否在边缘保护带内 - 只在边缘区域阻止默认行为
    if (this.isInEdgeGuard(touch.clientX)) {
      // 只在边缘区域阻止默认行为
      event.stopPropagation();
      console.log('TouchGuard: Edge touch detected');
      return;
    }

    // 阅读模式快捷键检测
    if (this.settings.touchGuard.readingModeHotkey === 'HoldAlt' && event.altKey) {
      this.toggleReadingMode(true);
    }
  }

  handleTouchMove(event) {
    if (!this.touchStartX || !this.touchStartY) return;

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - this.touchStartX);
    const deltaY = Math.abs(touch.clientY - this.touchStartY);

    // 如果是长按操作，允许默认行为（复制菜单等）
    if (this.isLongPress) {
      return;
    }

    // 增加长按容忍度 - 只有在明显滑动时才阻止
    const isSignificantSwipe = deltaX > 25; // 增加阈值到25px，减少误判
    const isHorizontalSwipe = deltaX > deltaY * 2; // 更严格的水平检测

    // 水平滑动检测（防止误触）
    if (isSignificantSwipe && isHorizontalSwipe) {
      // 检查是否从边缘开始
      if (this.isInEdgeGuard(this.touchStartX)) {
        event.stopPropagation();
        console.log('TouchGuard: Horizontal swipe from edge blocked');
        return;
      }

      // 在阅读模式下限制水平滑动
      if (this.readingModeEnabled && deltaX > 40) {
        event.stopPropagation();
        console.log('TouchGuard: Horizontal swipe limited in reading mode');
        return;
      }
    }
  }

  handleTouchEnd() {
    // 清理长按计时器
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    this.touchStartX = null;
    this.touchStartY = null;
    this.touchStartTime = null;
    this.isLongPress = false;

    // 释放阅读模式快捷键
    if (this.settings.touchGuard.readingModeHotkey === 'HoldAlt') {
      this.toggleReadingMode(false);
    }
  }

  handleKeyDown(event) {
    // 阅读模式快捷键
    if (event.key === 'Alt' && this.settings.touchGuard.readingModeHotkey === 'HoldAlt') {
      this.toggleReadingMode(true);
    }

    // 快速启用/禁用快捷键 (Alt+T)
    if (event.altKey && event.key === 't') {
      event.preventDefault();
      this.toggleEnabled();
    }
  }

  handleKeyUp(event) {
    if (event.key === 'Alt' && this.settings.touchGuard.readingModeHotkey === 'HoldAlt') {
      this.toggleReadingMode(false);
    }
  }

  isInEdgeGuard(x) {
    const viewportWidth = window.innerWidth;
    return x < this.edgeGuardWidth || x > viewportWidth - this.edgeGuardWidth;
  }

  createEdgeGuards() {
    // 创建左侧边缘保护带
    const leftGuard = document.createElement('div');
    leftGuard.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: ${this.edgeGuardWidth}px;
      height: 100vh;
      z-index: 9998;
      pointer-events: auto;
      background: transparent;
    `;

    // 创建右侧边缘保护带
    const rightGuard = document.createElement('div');
    rightGuard.style.cssText = `
      position: fixed;
      right: 0;
      top: 0;
      width: ${this.edgeGuardWidth}px;
      height: 100vh;
      z-index: 9998;
      pointer-events: auto;
      background: transparent;
    `;

    document.body.appendChild(leftGuard);
    document.body.appendChild(rightGuard);

    this.edgeGuards = [leftGuard, rightGuard];
    console.log('TouchGuard: Edge guards created');
  }

  applyReadingModeStyles() {
    const readingModeCSS = `
      .touch-guard-reading-mode {
        touch-action: pan-y !important;
        overscroll-behavior-x: none !important;
        -webkit-overflow-scrolling: touch !important;
      }

      .touch-guard-reading-mode * {
        touch-action: pan-y !important;
      }

      /* 减少横向滑块干扰 */
      .touch-guard-reading-mode ::-webkit-scrollbar:horizontal {
        display: none !important;
      }

      .touch-guard-reading-mode [role="slider"],
      .touch-guard-reading-mode input[type="range"] {
        touch-action: pan-y !important;
      }

      /* 清理粘性吸顶、悬浮层 */
      .touch-guard-reading-mode .sticky,
      .touch-guard-reading-mode [class*="sticky"],
      .touch-guard-reading-mode [style*="position: sticky"],
      .touch-guard-reading-mode .fixed,
      .touch-guard-reading-mode [class*="fixed"],
      .touch-guard-reading-mode [style*="position: fixed"] {
        position: relative !important;
        top: auto !important;
        bottom: auto !important;
      }

      /* 隐藏浮动元素 */
      .touch-guard-reading-mode .floating,
      .touch-guard-reading-mode [class*="float"],
      .touch-guard-reading-mode .popup,
      .touch-guard-reading-mode .modal {
        display: none !important;
      }
    `;

    const style = document.createElement('style');
    style.textContent = readingModeCSS;
    document.head.appendChild(style);
  }

  toggleReadingMode(enable) {
    if (enable === this.readingModeEnabled) return;

    this.readingModeEnabled = enable;

    if (enable) {
      document.body.classList.add('touch-guard-reading-mode');
      console.log('TouchGuard: Reading mode enabled');
    } else {
      document.body.classList.remove('touch-guard-reading-mode');
      console.log('TouchGuard: Reading mode disabled');
    }
  }

  toggleEnabled() {
    this.isEnabled = !this.isEnabled;
    
    if (this.isEnabled) {
      this.enable();
    } else {
      this.disable();
    }

    console.log(`TouchGuard: ${this.isEnabled ? 'Enabled' : 'Disabled'}`);
  }

  preventEventPropagation() {
    // 防止某些元素的默认触摸行为
    const preventSelectors = [
      '[role="slider"]',
      'input[type="range"]',
      '.carousel',
      '.slider'
    ];

    preventSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.addEventListener('touchstart', (e) => {
          if (this.readingModeEnabled) {
            e.preventDefault();
          }
        }, { passive: false });
      });
    });
  }

  enable() {
    this.isEnabled = true;
    this.setupEventListeners();
    
    if (this.settings.touchGuard.edgeGuardEnabled) {
      this.createEdgeGuards();
    }

    if (this.settings.touchGuard.readingModeEnabled) {
      this.applyReadingModeStyles();
    }
  }

  disable() {
    this.isEnabled = false;
    
    // 移除事件监听器
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);

    // 移除边缘保护带
    this.edgeGuards.forEach(guard => {
      if (guard.parentNode) {
        guard.parentNode.removeChild(guard);
      }
    });
    this.edgeGuards = [];

    // 禁用阅读模式
    this.toggleReadingMode(false);

    // 移除阅读模式样式
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent.includes('touch-guard-reading-mode')) {
        style.remove();
      }
    });
  }

  cleanup() {
    this.disable();
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.isEnabled = this.settings.touchGuard?.enabled ?? true;
    
    if (this.isEnabled) {
      this.disable();
      this.enable();
    }
  }
}