/**
 * TabletBrowse Pro - 聚焦模式
 * 点选页面核心区域并隐藏干扰元素的聚焦阅读功能
 */

class FocusModeHandler {
  constructor() {
    this.settings = {};
    this.isActive = false;
    this.focusedElement = null;
    this.hiddenElements = [];
    this.overlay = null;
    this.selectionMode = false;
    this.originalStyles = new Map();
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.bindEvents();
  }

  bindEvents() {
    // 监听双击事件激活聚焦模式
    document.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    
    // 监听键盘快捷键
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // 监听设置更新
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = event.detail.settings;
    });
    
    // 监听页面变化
    const observer = new MutationObserver(() => {
      if (this.isActive) {
        this.refreshFocusMode();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }

  handleDoubleClick(event) {
    if (!this.settings.focusModeEnabled) return;
    
    // 防止在已经聚焦的情况下重复触发
    if (this.isActive) return;
    
    const target = event.target;
    
    // 检查是否为可聚焦的内容区域
    if (this.isFocusableContent(target)) {
      event.preventDefault();
      this.activateFocusMode(target);
    }
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' && this.isActive) {
      this.deactivateFocusMode();
    } else if (event.key === 'F' && event.ctrlKey && event.shiftKey) {
      // Ctrl+Shift+F 激活选择模式
      event.preventDefault();
      this.toggleSelectionMode();
    }
  }

  isFocusableContent(element) {
    if (!element) return false;
    
    // 检查常见的内容容器
    const contentSelectors = [
      'article',
      'main',
      '.content',
      '.post',
      '.article',
      '.entry',
      '.story',
      '.text',
      '.body',
      '[role="main"]',
      '[role="article"]'
    ];
    
    // 检查元素本身或其父级是否匹配内容选择器
    let current = element;
    while (current && current !== document.body) {
      if (contentSelectors.some(selector => current.matches && current.matches(selector))) {
        return true;
      }
      current = current.parentElement;
    }
    
    // 检查元素是否包含大量文本内容
    const textContent = element.textContent || '';
    if (textContent.length > 200) {
      return true;
    }
    
    // 检查是否为段落或标题
    if (element.matches('p, h1, h2, h3, h4, h5, h6, div')) {
      const rect = element.getBoundingClientRect();
      // 检查元素大小是否合适
      if (rect.width > 200 && rect.height > 100) {
        return true;
      }
    }
    
    return false;
  }

  activateFocusMode(targetElement) {
    if (this.isActive) return;
    
    this.isActive = true;
    this.focusedElement = this.findBestFocusTarget(targetElement);
    
    // 添加聚焦模式类
    document.body.classList.add(CSS_CLASSES.FOCUS_MODE);
    
    // 创建覆盖层
    this.createOverlay();
    
    // 隐藏干扰元素
    this.hideDistractingElements();
    
    // 优化聚焦元素
    this.optimizeFocusedElement();
    
    // 显示控制面板
    this.showControlPanel();
    
    // 触发聚焦模式事件
    document.dispatchEvent(createCustomEvent(EVENTS.FOCUS_MODE_TOGGLE, {
      active: true,
      focusedElement: this.focusedElement
    }));
    
    // 滚动到聚焦元素
    this.scrollToFocusedElement();
  }

  deactivateFocusMode() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // 移除聚焦模式类
    document.body.classList.remove(CSS_CLASSES.FOCUS_MODE);
    
    // 恢复隐藏的元素
    this.restoreHiddenElements();
    
    // 恢复聚焦元素的原始样式
    this.restoreFocusedElement();
    
    // 清理UI
    this.cleanupUI();
    
    // 触发聚焦模式事件
    document.dispatchEvent(createCustomEvent(EVENTS.FOCUS_MODE_TOGGLE, {
      active: false,
      focusedElement: null
    }));
    
    this.focusedElement = null;
  }

  findBestFocusTarget(element) {
    // 尝试找到最佳的聚焦目标
    let current = element;
    let bestTarget = element;
    let maxScore = this.calculateContentScore(element);
    
    // 向上查找更好的容器
    while (current && current !== document.body) {
      const score = this.calculateContentScore(current);
      if (score > maxScore) {
        maxScore = score;
        bestTarget = current;
      }
      current = current.parentElement;
    }
    
    return bestTarget;
  }

  calculateContentScore(element) {
    if (!element) return 0;
    
    let score = 0;
    
    // 文本内容长度
    const textLength = (element.textContent || '').length;
    score += Math.min(textLength / 100, 50);
    
    // 元素大小
    const rect = element.getBoundingClientRect();
    score += Math.min(rect.width * rect.height / 10000, 30);
    
    // 语义化标签加分
    if (element.matches('article, main, section')) score += 20;
    if (element.matches('[role="main"], [role="article"]')) score += 15;
    if (element.matches('.content, .post, .article, .entry')) score += 10;
    
    // 包含标题加分
    if (element.querySelector('h1, h2, h3')) score += 10;
    
    // 包含段落加分
    const paragraphs = element.querySelectorAll('p');
    score += Math.min(paragraphs.length * 2, 20);
    
    return score;
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'tb-focus-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      z-index: ${Z_INDEX.FOCUS_OVERLAY};
      animation: tbFadeIn 0.3s ease;
      pointer-events: none;
    `;
    
    document.body.appendChild(this.overlay);
  }

  hideDistractingElements() {
    const distractingSelectors = [
      'header',
      'nav',
      'aside',
      'footer',
      '.sidebar',
      '.menu',
      '.navigation',
      '.ads',
      '.advertisement',
      '.banner',
      '.popup',
      '.modal',
      '.overlay',
      '[role="banner"]',
      '[role="navigation"]',
      '[role="complementary"]'
    ];
    
    // 隐藏干扰元素
    distractingSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        if (!this.focusedElement.contains(element) && !element.contains(this.focusedElement)) {
          this.hideElement(element);
        }
      });
    });
    
    // 隐藏与聚焦元素同级的其他元素
    if (this.focusedElement.parentElement) {
      Array.from(this.focusedElement.parentElement.children).forEach(sibling => {
        if (sibling !== this.focusedElement && !sibling.contains(this.focusedElement)) {
          // 检查是否为重要内容
          if (!this.isImportantContent(sibling)) {
            this.hideElement(sibling);
          }
        }
      });
    }
  }

  isImportantContent(element) {
    // 检查是否为重要内容，不应该隐藏
    const importantSelectors = [
      'main',
      'article',
      '[role="main"]',
      '[role="article"]'
    ];
    
    return importantSelectors.some(selector => element.matches && element.matches(selector));
  }

  hideElement(element) {
    if (!element || element.style.display === 'none') return;
    
    // 保存原始样式
    this.originalStyles.set(element, {
      display: element.style.display,
      visibility: element.style.visibility,
      opacity: element.style.opacity
    });
    
    // 隐藏元素
    element.style.display = 'none';
    this.hiddenElements.push(element);
  }

  optimizeFocusedElement() {
    if (!this.focusedElement) return;
    
    // 保存原始样式
    this.originalStyles.set(this.focusedElement, {
      position: this.focusedElement.style.position,
      zIndex: this.focusedElement.style.zIndex,
      maxWidth: this.focusedElement.style.maxWidth,
      margin: this.focusedElement.style.margin,
      padding: this.focusedElement.style.padding,
      background: this.focusedElement.style.background,
      boxShadow: this.focusedElement.style.boxShadow
    });
    
    // 优化聚焦元素样式
    this.focusedElement.style.cssText += `
      position: relative !important;
      z-index: ${Z_INDEX.FOCUS_OVERLAY + 1} !important;
      max-width: 800px !important;
      margin: 20px auto !important;
      padding: 40px !important;
      background: white !important;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
      border-radius: 8px !important;
      line-height: 1.6 !important;
      font-size: 16px !important;
    `;
    
    // 添加聚焦样式类
    this.focusedElement.classList.add('tb-focused-content');
  }

  showControlPanel() {
    const controlPanel = document.createElement('div');
    controlPanel.className = 'tb-focus-control-panel';
    controlPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px;
      border-radius: 8px;
      z-index: ${Z_INDEX.FOCUS_OVERLAY + 2};
      animation: tbSlideIn 0.3s ease;
    `;
    
    controlPanel.innerHTML = `
      <div style="margin-bottom: 8px; font-size: 14px; font-weight: bold;">聚焦模式</div>
      <button class="tb-focus-btn" data-action="exit">退出 (ESC)</button>
      <button class="tb-focus-btn" data-action="adjust">调整区域</button>
    `;
    
    // 绑定按钮事件
    controlPanel.addEventListener('click', (event) => {
      const action = event.target.getAttribute('data-action');
      if (action === 'exit') {
        this.deactivateFocusMode();
      } else if (action === 'adjust') {
        this.toggleSelectionMode();
      }
    });
    
    document.body.appendChild(controlPanel);
    this.controlPanel = controlPanel;
  }

  toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;
    
    if (this.selectionMode) {
      this.startSelectionMode();
    } else {
      this.endSelectionMode();
    }
  }

  startSelectionMode() {
    document.body.style.cursor = 'crosshair';
    
    // 显示选择提示
    const hint = document.createElement('div');
    hint.className = 'tb-selection-hint';
    hint.textContent = '点击选择新的聚焦区域';
    hint.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 123, 255, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: ${Z_INDEX.FOCUS_OVERLAY + 3};
      animation: tbFadeIn 0.2s ease;
    `;
    
    document.body.appendChild(hint);
    this.selectionHint = hint;
    
    // 绑定选择事件
    this.selectionClickHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      if (this.isFocusableContent(event.target)) {
        this.changeFocusTarget(event.target);
      }
      
      this.endSelectionMode();
    };
    
    document.addEventListener('click', this.selectionClickHandler, true);
  }

  endSelectionMode() {
    this.selectionMode = false;
    document.body.style.cursor = '';
    
    if (this.selectionHint) {
      this.selectionHint.remove();
      this.selectionHint = null;
    }
    
    if (this.selectionClickHandler) {
      document.removeEventListener('click', this.selectionClickHandler, true);
      this.selectionClickHandler = null;
    }
  }

  changeFocusTarget(newTarget) {
    // 恢复当前聚焦元素
    this.restoreFocusedElement();
    
    // 设置新的聚焦目标
    this.focusedElement = this.findBestFocusTarget(newTarget);
    
    // 重新应用聚焦效果
    this.hideDistractingElements();
    this.optimizeFocusedElement();
    this.scrollToFocusedElement();
  }

  scrollToFocusedElement() {
    if (!this.focusedElement) return;
    
    this.focusedElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  restoreHiddenElements() {
    this.hiddenElements.forEach(element => {
      const originalStyle = this.originalStyles.get(element);
      if (originalStyle) {
        element.style.display = originalStyle.display;
        element.style.visibility = originalStyle.visibility;
        element.style.opacity = originalStyle.opacity;
      }
    });
    
    this.hiddenElements = [];
  }

  restoreFocusedElement() {
    if (!this.focusedElement) return;
    
    const originalStyle = this.originalStyles.get(this.focusedElement);
    if (originalStyle) {
      Object.keys(originalStyle).forEach(prop => {
        this.focusedElement.style[prop] = originalStyle[prop];
      });
    }
    
    this.focusedElement.classList.remove('tb-focused-content');
  }

  refreshFocusMode() {
    if (!this.isActive) return;
    
    // 重新检查和隐藏干扰元素
    this.hideDistractingElements();
  }

  cleanupUI() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    if (this.controlPanel) {
      this.controlPanel.remove();
      this.controlPanel = null;
    }
    
    if (this.selectionHint) {
      this.selectionHint.remove();
      this.selectionHint = null;
    }
    
    this.originalStyles.clear();
    this.endSelectionMode();
  }
}

// 全局聚焦模式处理器实例
window.tabletBrowseFocusModeHandler = null;
