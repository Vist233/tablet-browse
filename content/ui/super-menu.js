/**
 * TabletBrowse Pro - 统一超级菜单
 * 整合浏览器功能、网页右键功能和插件自定义功能的统一菜单系统
 */

class SuperMenuHandler {
  constructor() {
    this.settings = {};
    this.isVisible = false;
    this.menu = null;
    this.triggerElement = null;
    this.menuItems = [];
    this.currentContext = null;
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.bindEvents();
    this.setupMenuItems();
  }

  bindEvents() {
    // 监听四指点击或长按激活超级菜单
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    
    // 监听右键菜单事件
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this), { passive: false });
    
    // 监听键盘快捷键
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // 监听点击外部关闭菜单
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    
    // 监听设置更新
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = event.detail.settings;
    });
  }

  handleTouchStart(event) {
    if (!this.settings.enabled) return;
    
    // 检查是否为四指触摸
    if (event.touches.length === 4) {
      event.preventDefault();
      const centerX = Array.from(event.touches).reduce((sum, touch) => sum + touch.clientX, 0) / 4;
      const centerY = Array.from(event.touches).reduce((sum, touch) => sum + touch.clientY, 0) / 4;
      
      this.showSuperMenu(centerX, centerY, event.target);
    }
  }

  handleContextMenu(event) {
    if (!this.settings.enabled) return;
    
    // 检查是否应该显示超级菜单而不是原生右键菜单
    if (event.ctrlKey || event.shiftKey) {
      event.preventDefault();
      this.showSuperMenu(event.clientX, event.clientY, event.target);
    }
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' && this.isVisible) {
      this.hideSuperMenu();
    } else if (event.key === 'F10' && event.shiftKey) {
      // Shift+F10 显示超级菜单
      event.preventDefault();
      const rect = document.activeElement?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
      this.showSuperMenu(x, y, document.activeElement);
    }
  }

  handleOutsideClick(event) {
    if (this.isVisible && this.menu && !this.menu.contains(event.target)) {
      this.hideSuperMenu();
    }
  }

  setupMenuItems() {
    this.menuItems = [
      {
        id: 'browser-actions',
        label: '浏览器操作',
        icon: '🌐',
        submenu: [
          { id: 'back', label: '后退', icon: '⬅️', action: () => history.back() },
          { id: 'forward', label: '前进', icon: '➡️', action: () => history.forward() },
          { id: 'reload', label: '刷新', icon: '🔄', action: () => location.reload() },
          { id: 'home', label: '主页', icon: '🏠', action: () => this.goHome() },
          { id: 'bookmark', label: '添加书签', icon: '⭐', action: () => this.addBookmark() }
        ]
      },
      {
        id: 'page-actions',
        label: '页面操作',
        icon: '📄',
        submenu: [
          { id: 'select-all', label: '全选', icon: '📋', action: () => document.execCommand('selectAll') },
          { id: 'copy', label: '复制', icon: '📄', action: () => document.execCommand('copy') },
          { id: 'find', label: '查找', icon: '🔍', action: () => this.showFindDialog() },
          { id: 'print', label: '打印', icon: '🖨️', action: () => window.print() },
          { id: 'share', label: '分享', icon: '📤', action: () => this.shareCurrentPage() }
        ]
      },
      {
        id: 'tablet-features',
        label: '平板功能',
        icon: '📱',
        submenu: [
          { id: 'precision-click', label: '精准点击', icon: '🎯', action: () => this.activatePrecisionClick() },
          { id: 'focus-mode', label: '聚焦模式', icon: '🎯', action: () => this.activateFocusMode() },
          { id: 'gesture-help', label: '手势帮助', icon: '👋', action: () => this.showGestureHelp() },
          { id: 'settings', label: '插件设置', icon: '⚙️', action: () => this.openSettings() }
        ]
      }
    ];
  }

  showSuperMenu(x, y, targetElement) {
    if (this.isVisible) {
      this.hideSuperMenu();
      return;
    }
    
    this.isVisible = true;
    this.triggerElement = targetElement;
    this.currentContext = this.analyzeContext(targetElement);
    
    this.createMenu(x, y);
    this.populateMenu();
    this.positionMenu(x, y);
    
    // 添加显示动画
    requestAnimationFrame(() => {
      this.menu.classList.add('tb-super-menu-visible');
    });
  }

  hideSuperMenu() {
    if (!this.isVisible || !this.menu) return;
    
    this.isVisible = false;
    
    // 添加隐藏动画
    this.menu.classList.remove('tb-super-menu-visible');
    this.menu.classList.add('tb-super-menu-hiding');
    
    setTimeout(() => {
      if (this.menu) {
        this.menu.remove();
        this.menu = null;
      }
    }, 200);
    
    this.triggerElement = null;
    this.currentContext = null;
  }

  createMenu(x, y) {
    this.menu = document.createElement('div');
    this.menu.className = 'tb-super-menu';
    this.menu.style.cssText = `
      position: fixed;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      z-index: ${Z_INDEX.SUPER_MENU};
      min-width: 200px;
      max-width: 300px;
      padding: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      opacity: 0;
      transform: scale(0.8) translateY(-10px);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: auto;
    `;
    
    document.body.appendChild(this.menu);
  }

  populateMenu() {
    if (!this.menu) return;
    
    // 添加上下文相关的快速操作
    this.addContextualActions();
    
    // 添加分隔线
    this.addSeparator();
    
    // 添加主要菜单项
    this.menuItems.forEach(item => {
      this.addMenuItem(item);
    });
  }

  addContextualActions() {
    if (!this.currentContext) return;
    
    const contextActions = [];
    
    // 根据上下文添加相关操作
    if (this.currentContext.isLink) {
      contextActions.push(
        { id: 'open-link', label: '打开链接', icon: '🔗', action: () => this.openLink() },
        { id: 'copy-link', label: '复制链接', icon: '📋', action: () => this.copyLink() }
      );
    }
    
    if (this.currentContext.isImage) {
      contextActions.push(
        { id: 'save-image', label: '保存图片', icon: '💾', action: () => this.saveImage() },
        { id: 'copy-image', label: '复制图片', icon: '🖼️', action: () => this.copyImage() }
      );
    }
    
    if (this.currentContext.isText) {
      contextActions.push(
        { id: 'copy-text', label: '复制文本', icon: '📄', action: () => this.copySelectedText() }
      );
    }
    
    if (this.currentContext.isInput) {
      contextActions.push(
        { id: 'paste', label: '粘贴', icon: '📋', action: () => this.pasteText() },
        { id: 'clear', label: '清空', icon: '🗑️', action: () => this.clearInput() }
      );
    }
    
    // 添加上下文操作到菜单
    contextActions.forEach(action => {
      this.addSimpleMenuItem(action);
    });
  }

  addMenuItem(item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'tb-menu-item';
    
    if (item.submenu) {
      // 有子菜单的项目
      menuItem.innerHTML = `
        <div class="tb-menu-item-content">
          <span class="tb-menu-icon">${item.icon}</span>
          <span class="tb-menu-label">${item.label}</span>
          <span class="tb-menu-arrow">▶</span>
        </div>
      `;
      
      menuItem.addEventListener('click', () => {
        this.showSubmenu(item, menuItem);
      });
    } else {
      // 普通菜单项
      this.addSimpleMenuItem(item, menuItem);
    }
    
    this.menu.appendChild(menuItem);
  }

  addSimpleMenuItem(item, element = null) {
    const menuItem = element || document.createElement('div');
    menuItem.className = 'tb-menu-item';
    menuItem.innerHTML = `
      <div class="tb-menu-item-content">
        <span class="tb-menu-icon">${item.icon}</span>
        <span class="tb-menu-label">${item.label}</span>
      </div>
    `;
    
    menuItem.addEventListener('click', () => {
      if (item.action) {
        item.action();
      }
      this.hideSuperMenu();
    });
    
    if (!element) {
      this.menu.appendChild(menuItem);
    }
  }

  showSubmenu(parentItem, parentElement) {
    // 移除现有的子菜单
    const existingSubmenu = this.menu.querySelector('.tb-submenu');
    if (existingSubmenu) {
      existingSubmenu.remove();
    }
    
    const submenu = document.createElement('div');
    submenu.className = 'tb-submenu';
    submenu.style.cssText = `
      position: absolute;
      left: 100%;
      top: 0;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      min-width: 180px;
      padding: 4px;
      margin-left: 4px;
      animation: tbSlideIn 0.2s ease;
    `;
    
    parentItem.submenu.forEach(subItem => {
      const subMenuItem = document.createElement('div');
      subMenuItem.className = 'tb-menu-item tb-submenu-item';
      subMenuItem.innerHTML = `
        <div class="tb-menu-item-content">
          <span class="tb-menu-icon">${subItem.icon}</span>
          <span class="tb-menu-label">${subItem.label}</span>
        </div>
      `;
      
      subMenuItem.addEventListener('click', () => {
        if (subItem.action) {
          subItem.action();
        }
        this.hideSuperMenu();
      });
      
      submenu.appendChild(subMenuItem);
    });
    
    parentElement.style.position = 'relative';
    parentElement.appendChild(submenu);
    
    // 调整子菜单位置，确保不超出视口
    this.adjustSubmenuPosition(submenu, parentElement);
  }

  adjustSubmenuPosition(submenu, parentElement) {
    const submenuRect = submenu.getBoundingClientRect();
    const parentRect = parentElement.getBoundingClientRect();
    
    // 如果子菜单超出右边界，显示在左侧
    if (submenuRect.right > window.innerWidth) {
      submenu.style.left = '-100%';
      submenu.style.marginLeft = '-4px';
    }
    
    // 如果子菜单超出下边界，向上调整
    if (submenuRect.bottom > window.innerHeight) {
      const offset = submenuRect.bottom - window.innerHeight + 10;
      submenu.style.top = `-${offset}px`;
    }
  }

  addSeparator() {
    const separator = document.createElement('div');
    separator.className = 'tb-menu-separator';
    separator.style.cssText = `
      height: 1px;
      background: rgba(0, 0, 0, 0.1);
      margin: 4px 8px;
    `;
    this.menu.appendChild(separator);
  }

  positionMenu(x, y) {
    if (!this.menu) return;
    
    // 获取菜单尺寸
    const menuRect = this.menu.getBoundingClientRect();
    
    // 计算最佳位置
    let menuX = x - menuRect.width / 2;
    let menuY = y - menuRect.height / 2;
    
    // 确保菜单不超出视口
    menuX = Math.max(10, Math.min(menuX, window.innerWidth - menuRect.width - 10));
    menuY = Math.max(10, Math.min(menuY, window.innerHeight - menuRect.height - 10));
    
    this.menu.style.left = menuX + 'px';
    this.menu.style.top = menuY + 'px';
  }

  analyzeContext(element) {
    if (!element) return {};
    
    const context = {
      isLink: element.matches('a') || element.closest('a'),
      isImage: element.matches('img'),
      isInput: element.matches('input, textarea, [contenteditable]'),
      isText: window.getSelection().toString().length > 0,
      element: element
    };
    
    return context;
  }

  // 菜单操作方法
  goHome() {
    window.location.href = 'about:home';
  }

  addBookmark() {
    // 尝试添加书签（需要用户交互）
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href
      });
    } else {
      // 复制URL到剪贴板作为备选
      navigator.clipboard.writeText(window.location.href);
      this.showToast('链接已复制到剪贴板');
    }
  }

  showFindDialog() {
    const searchTerm = prompt('请输入要查找的内容：');
    if (searchTerm) {
      window.find(searchTerm);
    }
  }

  shareCurrentPage() {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      this.showToast('链接已复制到剪贴板');
    }
  }

  activatePrecisionClick() {
    if (window.tabletBrowsePrecisionClickHandler) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      window.tabletBrowsePrecisionClickHandler.activatePrecisionMode(centerX, centerY);
    }
  }

  activateFocusMode() {
    if (window.tabletBrowseFocusModeHandler) {
      // 尝试找到主要内容区域
      const mainContent = document.querySelector('main, article, .content, .post, .article');
      if (mainContent) {
        window.tabletBrowseFocusModeHandler.activateFocusMode(mainContent);
      } else {
        this.showToast('未找到合适的内容区域');
      }
    }
  }

  showGestureHelp() {
    const helpText = `
平板浏览手势帮助：

• 长按：模拟悬停效果
• 长按链接：显示右键菜单
• 双击内容：激活聚焦模式
• 三指滑动：切换标签页
• 四指点击：显示超级菜单
• Ctrl+右键：显示超级菜单
    `;
    
    alert(helpText);
  }

  openSettings() {
    chrome.runtime.openOptionsPage?.();
  }

  // 上下文操作方法
  openLink() {
    const link = this.currentContext?.element?.closest('a');
    if (link) {
      window.open(link.href, '_blank');
    }
  }

  copyLink() {
    const link = this.currentContext?.element?.closest('a');
    if (link) {
      navigator.clipboard.writeText(link.href);
      this.showToast('链接已复制');
    }
  }

  saveImage() {
    const img = this.currentContext?.element;
    if (img && img.src) {
      const a = document.createElement('a');
      a.href = img.src;
      a.download = '';
      a.click();
    }
  }

  copyImage() {
    // 图片复制功能（需要现代浏览器支持）
    this.showToast('图片复制功能需要浏览器支持');
  }

  copySelectedText() {
    document.execCommand('copy');
    this.showToast('文本已复制');
  }

  pasteText() {
    const input = this.currentContext?.element;
    if (input) {
      navigator.clipboard.readText().then(text => {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  }

  clearInput() {
    const input = this.currentContext?.element;
    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      z-index: ${Z_INDEX.SUPER_MENU + 1};
      animation: tbFadeIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 2000);
  }
}

// 全局超级菜单处理器实例
window.tabletBrowseSuperMenuHandler = null;
