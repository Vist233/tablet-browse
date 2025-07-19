/**
 * TabletBrowse Pro - 原生右键菜单调用器
 * 处理长按链接触发网页原生右键菜单的功能
 */

class ContextMenuHandler {
  constructor() {
    this.settings = {};
    this.contextMenuTimeout = null;
    this.isContextMenuActive = false;
    this.lastContextTarget = null;
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.bindEvents();
  }

  bindEvents() {
    // 监听长按事件
    document.addEventListener(EVENTS.LONG_PRESS_START, this.handleLongPress.bind(this));
    
    // 监听设置更新
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = event.detail.settings;
    });

    // 监听右键菜单事件
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    // 监听点击事件，用于关闭右键菜单
    document.addEventListener('click', this.handleClick.bind(this));
    
    // 监听键盘事件
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleLongPress(event) {
    if (!this.settings.enabled) return;

    const { target, clientX, clientY } = event.detail;
    
    // 检查是否为链接或其他需要右键菜单的元素
    if (this.shouldShowContextMenu(target)) {
      this.showContextMenu(target, clientX, clientY);
    }
  }

  shouldShowContextMenu(element) {
    if (!element || !element.matches) return false;
    
    // 链接元素
    if (element.matches('a[href]')) return true;
    
    // 图片元素
    if (element.matches('img')) return true;
    
    // 视频元素
    if (element.matches('video')) return true;
    
    // 音频元素
    if (element.matches('audio')) return true;
    
    // 输入框
    if (element.matches('input, textarea')) return true;
    
    // 可编辑元素
    if (element.contentEditable === 'true') return true;
    
    // 有自定义右键菜单的元素
    if (element.getAttribute('data-context-menu')) return true;
    
    // 检查父级元素
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (parent.matches('a[href]')) return true;
      parent = parent.parentElement;
    }
    
    return false;
  }

  showContextMenu(target, clientX, clientY) {
    // 防止重复触发
    if (this.isContextMenuActive) return;
    
    this.isContextMenuActive = true;
    this.lastContextTarget = target;
    
    // 创建并触发右键菜单事件
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: clientX,
      clientY: clientY,
      button: 2, // 右键
      buttons: 2
    });
    
    // 添加视觉反馈
    this.addContextMenuFeedback(target);
    
    // 延迟触发，确保视觉反馈先显示
    setTimeout(() => {
      target.dispatchEvent(contextMenuEvent);
    }, 100);
    
    // 设置超时清理
    this.contextMenuTimeout = setTimeout(() => {
      this.cleanupContextMenu();
    }, 5000); // 5秒后自动清理
  }

  handleContextMenu(event) {
    // 如果是我们触发的右键菜单，不阻止默认行为
    if (this.isContextMenuActive) {
      // 让浏览器显示原生右键菜单
      return true;
    }
    
    // 对于其他情况，根据设置决定是否阻止
    if (this.settings.preventDefaultContextMenu) {
      event.preventDefault();
      return false;
    }
  }

  handleClick(event) {
    // 点击其他地方时清理右键菜单状态
    if (this.isContextMenuActive && !this.isContextMenuRelated(event.target)) {
      this.cleanupContextMenu();
    }
  }

  handleKeyDown(event) {
    // ESC键关闭右键菜单
    if (event.key === 'Escape' && this.isContextMenuActive) {
      this.cleanupContextMenu();
    }
  }

  addContextMenuFeedback(target) {
    // 添加右键菜单反馈样式
    target.classList.add('tb-context-menu-active');
    
    // 创建涟漪效果
    const ripple = document.createElement('div');
    ripple.className = 'tb-context-ripple';
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      transform: scale(0);
      animation: contextRipple 0.6s linear;
      pointer-events: none;
      z-index: ${Z_INDEX.HIGHLIGHT};
    `;
    
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left = (rect.left + rect.width / 2 - size / 2) + 'px';
    ripple.style.top = (rect.top + rect.height / 2 - size / 2) + 'px';
    
    document.body.appendChild(ripple);
    
    // 清理涟漪效果
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  isContextMenuRelated(element) {
    // 检查元素是否与右键菜单相关
    if (!element) return false;
    
    // 检查是否为右键菜单本身或其子元素
    const contextMenus = document.querySelectorAll('[role="menu"], .context-menu, .contextmenu');
    for (const menu of contextMenus) {
      if (menu.contains(element)) return true;
    }
    
    return false;
  }

  cleanupContextMenu() {
    this.isContextMenuActive = false;
    
    if (this.lastContextTarget) {
      this.lastContextTarget.classList.remove('tb-context-menu-active');
      this.lastContextTarget = null;
    }
    
    if (this.contextMenuTimeout) {
      clearTimeout(this.contextMenuTimeout);
      this.contextMenuTimeout = null;
    }
  }

  // 公共方法：为特定元素创建自定义右键菜单
  createCustomContextMenu(target, menuItems, x, y) {
    const menu = document.createElement('div');
    menu.className = 'tb-custom-context-menu';
    menu.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: ${Z_INDEX.SUPER_MENU};
      min-width: 150px;
      padding: 4px 0;
      font-size: 14px;
      left: ${x}px;
      top: ${y}px;
      animation: tbFadeIn 0.2s ease;
    `;
    
    menuItems.forEach(item => {
      const menuItem = document.createElement('div');
      menuItem.className = 'tb-context-menu-item';
      menuItem.textContent = item.label;
      menuItem.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        transition: background-color 0.2s;
      `;
      
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#f0f0f0';
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = '';
      });
      
      menuItem.addEventListener('click', () => {
        if (item.action) item.action(target);
        menu.remove();
        this.cleanupContextMenu();
      });
      
      menu.appendChild(menuItem);
    });
    
    document.body.appendChild(menu);
    
    // 调整菜单位置，确保不超出视口
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (y - rect.height) + 'px';
    }
    
    // 点击外部关闭菜单
    const closeMenu = (event) => {
      if (!menu.contains(event.target)) {
        menu.remove();
        document.removeEventListener('click', closeMenu);
        this.cleanupContextMenu();
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
    
    return menu;
  }
}

// 添加相关CSS动画
addStyles(`
@keyframes contextRipple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

.tb-context-menu-active {
  background-color: rgba(0, 123, 255, 0.1) !important;
  outline: 2px solid rgba(0, 123, 255, 0.3) !important;
  outline-offset: 1px !important;
}

.tb-custom-context-menu {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.tb-context-menu-item:hover {
  background-color: #f0f0f0 !important;
}
`);

// 全局右键菜单处理器实例
window.tabletBrowseContextMenuHandler = null;
