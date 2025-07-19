/**
 * TabletBrowse Pro - 悬停模拟器
 * 专门处理悬停效果的模拟和管理
 */

class HoverSimulator {
  constructor() {
    this.activeHovers = new Set();
    this.hoverTimeouts = new Map();
    this.settings = {};
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.bindEvents();
  }

  bindEvents() {
    // 监听长按开始事件
    document.addEventListener(EVENTS.LONG_PRESS_START, this.handleLongPressStart.bind(this));
    
    // 监听长按结束事件
    document.addEventListener(EVENTS.LONG_PRESS_END, this.handleLongPressEnd.bind(this));
    
    // 监听设置更新
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = event.detail.settings;
    });

    // 监听页面变化，清理悬停状态
    const observer = new MutationObserver(() => {
      this.cleanupInvalidHovers();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  handleLongPressStart(event) {
    if (!this.settings.hoverSimulation) return;

    const { target, clientX, clientY } = event.detail;
    
    if (this.shouldSimulateHover(target)) {
      this.startHoverSimulation(target, clientX, clientY);
    }
  }

  handleLongPressEnd(event) {
    const { target } = event.detail;
    this.endHoverSimulation(target);
  }

  shouldSimulateHover(element) {
    if (!element || !element.matches) return false;

    // 检查是否为下拉菜单触发器
    if (this.isDropdownTrigger(element)) return true;
    
    // 检查是否有tooltip
    if (element.title || element.getAttribute('data-tooltip')) return true;
    
    // 检查是否有悬停相关的CSS类
    if (element.matches('.dropdown, .menu-item, .has-tooltip')) return true;
    
    // 检查是否有悬停事件监听器
    if (element.onmouseover || element.onmouseenter) return true;
    
    // 检查CSS伪类
    if (this.hasHoverStyles(element)) return true;
    
    return false;
  }

  isDropdownTrigger(element) {
    // 检查常见的下拉菜单模式
    const dropdownSelectors = [
      '.dropdown-toggle',
      '.dropdown-trigger',
      '[data-toggle="dropdown"]',
      '[aria-haspopup="true"]',
      '.nav-item.dropdown > a',
      '.menu-item.has-submenu'
    ];
    
    return dropdownSelectors.some(selector => element.matches(selector));
  }

  hasHoverStyles(element) {
    try {
      // 创建一个临时元素来检测hover样式
      const tempElement = element.cloneNode(false);
      tempElement.style.display = 'none';
      document.body.appendChild(tempElement);
      
      const normalStyles = getComputedStyle(tempElement);
      
      // 模拟hover状态
      tempElement.classList.add('hover-test');
      const hoverStyles = getComputedStyle(tempElement);
      
      document.body.removeChild(tempElement);
      
      // 比较样式是否有变化
      const properties = ['backgroundColor', 'color', 'borderColor', 'opacity'];
      return properties.some(prop => normalStyles[prop] !== hoverStyles[prop]);
    } catch (error) {
      return false;
    }
  }

  startHoverSimulation(target, clientX, clientY) {
    // 清理之前的悬停状态
    this.endHoverSimulation(target);
    
    // 添加到活跃悬停集合
    this.activeHovers.add(target);
    
    // 添加悬停样式
    target.classList.add(CSS_CLASSES.HOVER_SIMULATED);
    
    // 触发鼠标事件序列
    this.triggerHoverEvents(target, clientX, clientY);
    
    // 处理下拉菜单
    this.handleDropdownMenu(target);
    
    // 处理tooltip
    this.handleTooltip(target, clientX, clientY);
    
    // 设置自动清理定时器
    const timeout = setTimeout(() => {
      this.endHoverSimulation(target);
    }, 3000); // 3秒后自动结束悬停
    
    this.hoverTimeouts.set(target, timeout);
  }

  endHoverSimulation(target) {
    if (!this.activeHovers.has(target)) return;

    // 从活跃集合中移除
    this.activeHovers.delete(target);

    // 移除悬停样式
    target.classList.remove(CSS_CLASSES.HOVER_SIMULATED);

    // 触发鼠标离开事件
    simulateMouseEvent(target, 'mouseleave');
    simulateMouseEvent(target, 'mouseout');

    // 清理定时器
    const timeout = this.hoverTimeouts.get(target);
    if (timeout) {
      clearTimeout(timeout);
      this.hoverTimeouts.delete(target);
    }

    // 隐藏tooltip
    this.hideTooltip(target);

    // 隐藏下拉菜单
    this.hideDropdownMenu(target);
  }

  triggerHoverEvents(target, clientX, clientY) {
    const eventOptions = {
      bubbles: true,
      cancelable: true,
      clientX: clientX || 0,
      clientY: clientY || 0
    };
    
    // 按正确顺序触发鼠标事件
    simulateMouseEvent(target, 'mouseenter', eventOptions);
    simulateMouseEvent(target, 'mouseover', eventOptions);
    
    // 延迟触发mousemove以确保悬停状态稳定
    setTimeout(() => {
      simulateMouseEvent(target, 'mousemove', eventOptions);
    }, 50);
  }

  handleDropdownMenu(target) {
    // 查找相关的下拉菜单 - 扩展搜索范围
    let dropdown = null;

    // 1. 查找子元素中的下拉菜单
    dropdown = target.querySelector('.dropdown-menu, .dropdown-content, .submenu, [role="menu"]');

    if (!dropdown) {
      // 2. 查找兄弟元素中的下拉菜单
      dropdown = target.parentElement?.querySelector('.dropdown-menu, .dropdown-content, .submenu, [role="menu"]');
    }

    if (!dropdown) {
      // 3. 查找通过data属性关联的下拉菜单
      const targetId = target.getAttribute('data-target') ||
                      target.getAttribute('aria-controls') ||
                      target.getAttribute('data-dropdown');
      if (targetId) {
        dropdown = document.getElementById(targetId.replace('#', ''));
      }
    }

    if (!dropdown) {
      // 4. 查找相邻的下拉菜单
      let sibling = target.nextElementSibling;
      while (sibling) {
        if (sibling.matches('.dropdown-menu, .dropdown-content, .submenu, [role="menu"]')) {
          dropdown = sibling;
          break;
        }
        sibling = sibling.nextElementSibling;
      }
    }

    if (dropdown) {
      // 保存原始样式
      const originalDisplay = dropdown.style.display;
      const originalVisibility = dropdown.style.visibility;
      const originalOpacity = dropdown.style.opacity;

      // 显示下拉菜单
      dropdown.style.display = 'block';
      dropdown.style.visibility = 'visible';
      dropdown.style.opacity = '1';
      dropdown.classList.add('show');

      // 存储下拉菜单引用
      target._tbDropdown = dropdown;
      target._tbDropdownOriginalStyles = {
        display: originalDisplay,
        visibility: originalVisibility,
        opacity: originalOpacity
      };

      // 设置定时器自动隐藏
      setTimeout(() => {
        if (!this.activeHovers.has(target)) {
          this.hideDropdownMenu(target);
        }
      }, 2500);
    }
  }

  hideDropdownMenu(target) {
    if (target._tbDropdown) {
      const dropdown = target._tbDropdown;
      const originalStyles = target._tbDropdownOriginalStyles;

      dropdown.style.display = originalStyles.display;
      dropdown.style.visibility = originalStyles.visibility;
      dropdown.style.opacity = originalStyles.opacity;
      dropdown.classList.remove('show');

      delete target._tbDropdown;
      delete target._tbDropdownOriginalStyles;
    }
  }

  handleTooltip(target, clientX, clientY) {
    const tooltipText = target.title || target.getAttribute('data-tooltip');
    if (!tooltipText) return;
    
    // 创建tooltip元素
    const tooltip = document.createElement('div');
    tooltip.className = 'tb-tooltip';
    tooltip.textContent = tooltipText;
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 12px;
      z-index: ${Z_INDEX.SUPER_MENU + 1};
      pointer-events: none;
      max-width: 200px;
      word-wrap: break-word;
      animation: tbFadeIn 0.2s ease;
    `;
    
    // 计算tooltip位置
    const rect = target.getBoundingClientRect();
    const tooltipX = rect.left + rect.width / 2;
    const tooltipY = rect.top - 10;
    
    tooltip.style.left = tooltipX + 'px';
    tooltip.style.top = tooltipY + 'px';
    tooltip.style.transform = 'translate(-50%, -100%)';
    
    document.body.appendChild(tooltip);
    
    // 存储tooltip引用
    target._tbTooltip = tooltip;
  }

  hideTooltip(target) {
    if (target._tbTooltip) {
      target._tbTooltip.remove();
      delete target._tbTooltip;
    }
  }

  cleanupInvalidHovers() {
    // 清理已经不在DOM中的元素的悬停状态
    this.activeHovers.forEach(target => {
      if (!document.contains(target)) {
        this.endHoverSimulation(target);
      }
    });
  }

  // 公共方法：手动结束所有悬停
  endAllHovers() {
    this.activeHovers.forEach(target => {
      this.endHoverSimulation(target);
    });
  }
}

// 全局悬停模拟器实例
window.tabletBrowseHoverSimulator = null;
