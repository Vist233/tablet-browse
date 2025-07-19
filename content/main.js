/**
 * TabletBrowse Pro - 主入口文件
 * 初始化所有功能模块并协调它们的工作
 */

class TabletBrowseMain {
  constructor() {
    this.settings = {};
    this.modules = {};
    this.isInitialized = false;
    this.initPromise = null;
    
    // 确保只初始化一次
    if (window.tabletBrowseMain) {
      return window.tabletBrowseMain;
    }
    
    window.tabletBrowseMain = this;
    this.init();
  }

  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }
    
    this.initPromise = this.doInit();
    return this.initPromise;
  }

  async doInit() {
    try {
      console.log('TabletBrowse Pro: Initializing...');
      
      // 加载设置
      await this.loadSettings();
      
      // 检查是否启用
      if (!this.settings.enabled) {
        console.log('TabletBrowse Pro: Plugin is disabled');
        return;
      }
      
      // 添加主要CSS类到body
      document.body.classList.add(CSS_CLASSES.TABLET_BROWSE_ACTIVE);
      
      // 初始化所有模块
      await this.initializeModules();
      
      // 绑定全局事件
      this.bindGlobalEvents();
      
      // 设置模块间通信
      this.setupModuleCommunication();
      
      this.isInitialized = true;
      console.log('TabletBrowse Pro: Initialization complete');
      
      // 触发初始化完成事件
      document.dispatchEvent(createCustomEvent('tb-initialized', {
        version: '1.0.0',
        modules: Object.keys(this.modules)
      }));
      
    } catch (error) {
      console.error('TabletBrowse Pro: Initialization failed', error);
    }
  }

  async loadSettings() {
    try {
      this.settings = await getSettings();
      console.log('TabletBrowse Pro: Settings loaded', this.settings);
    } catch (error) {
      console.error('TabletBrowse Pro: Failed to load settings', error);
      // 使用默认设置
      this.settings = getDefaultSettings();
    }
  }

  async initializeModules() {
    const moduleInitializers = [
      { name: 'touchHandler', class: TouchHandler },
      { name: 'gestureDetector', class: GestureDetector },
      { name: 'hoverSimulator', class: HoverSimulator },
      { name: 'contextMenuHandler', class: ContextMenuHandler },
      { name: 'precisionClickHandler', class: PrecisionClickHandler },
      { name: 'focusModeHandler', class: FocusModeHandler },
      { name: 'superMenuHandler', class: SuperMenuHandler },
      { name: 'elementHighlighter', class: ElementHighlighter }
    ];

    let successCount = 0;
    for (const { name, class: ModuleClass } of moduleInitializers) {
      try {
        console.log(`TabletBrowse Pro: Initializing ${name}...`);

        // 检查类是否存在
        if (typeof ModuleClass !== 'function') {
          throw new Error(`${name} class not found`);
        }

        this.modules[name] = new ModuleClass();

        // 设置全局引用
        window[`tabletBrowse${name.charAt(0).toUpperCase() + name.slice(1)}`] = this.modules[name];

        console.log(`TabletBrowse Pro: ${name} initialized successfully`);
        successCount++;
      } catch (error) {
        console.error(`TabletBrowse Pro: Failed to initialize ${name}`, error);
        // 继续初始化其他模块
      }
    }

    console.log(`TabletBrowse Pro: ${successCount}/${moduleInitializers.length} modules initialized`);

    if (successCount === 0) {
      throw new Error('No modules were successfully initialized');
    }
  }

  bindGlobalEvents() {
    // 监听设置更新（仅在扩展环境中）
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'settingsUpdated') {
          this.handleSettingsUpdate(request.settings);
        }
      });
    }

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handlePageHidden();
      } else {
        this.handlePageVisible();
      }
    });

    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // 监听DOM变化
    this.setupMutationObserver();
  }

  setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      let hasSignificantChanges = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // 检查是否有新的可交互元素
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.matches && node.matches(SELECTORS.INTERACTIVE)) {
                hasSignificantChanges = true;
              }
            }
          });
        }
      });
      
      if (hasSignificantChanges) {
        this.handleDOMChanges();
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });
  }

  setupModuleCommunication() {
    // 设置模块间的事件通信
    
    // 长按事件协调
    document.addEventListener(EVENTS.LONG_PRESS_START, (event) => {
      const { target } = event.detail;
      
      // 根据目标元素类型决定优先级
      if (this.modules.contextMenuHandler?.shouldShowContextMenu(target)) {
        // 优先显示右键菜单
        return;
      }
      
      if (this.modules.hoverSimulator?.shouldSimulateHover(target)) {
        // 其次是悬停模拟
        return;
      }
      
      if (this.modules.precisionClickHandler?.shouldActivatePrecisionMode(target)) {
        // 最后是精准点击模式
        return;
      }
    });

    // 手势事件协调
    document.addEventListener(EVENTS.GESTURE_DETECTED, (event) => {
      const { type } = event.detail;
      
      // 确保手势不会与其他功能冲突
      if (this.modules.precisionClickHandler?.isActive) {
        this.modules.precisionClickHandler.deactivatePrecisionMode();
      }
      
      if (this.modules.focusModeHandler?.isActive) {
        // 在聚焦模式下禁用某些手势
        if (type === GESTURES.THREE_FINGER_SWIPE_LEFT || type === GESTURES.THREE_FINGER_SWIPE_RIGHT) {
          event.preventDefault();
          return;
        }
      }
    });

    // 精准模式与其他功能的协调
    document.addEventListener(EVENTS.PRECISION_MODE_TOGGLE, (event) => {
      const { active } = event.detail;
      
      if (active) {
        // 激活精准模式时，暂停其他功能
        this.modules.elementHighlighter?.clearAllHighlights();
        this.modules.superMenuHandler?.hideSuperMenu();
      }
    });

    // 聚焦模式与其他功能的协调
    document.addEventListener(EVENTS.FOCUS_MODE_TOGGLE, (event) => {
      const { active } = event.detail;
      
      if (active) {
        // 激活聚焦模式时，清理其他UI
        this.modules.superMenuHandler?.hideSuperMenu();
        this.modules.precisionClickHandler?.deactivatePrecisionMode();
      }
    });
  }

  handleSettingsUpdate(newSettings) {
    console.log('TabletBrowse Pro: Settings updated', newSettings);
    this.settings = { ...this.settings, ...newSettings };
    
    // 通知所有模块设置已更新
    document.dispatchEvent(createCustomEvent('settingsUpdated', {
      settings: this.settings
    }));
    
    // 根据设置启用/禁用功能
    if (!this.settings.enabled) {
      this.disable();
    } else if (!this.isInitialized) {
      this.init();
    } else {
      this.enable();
    }
  }

  handlePageHidden() {
    // 页面隐藏时清理状态
    Object.values(this.modules).forEach(module => {
      if (module.cleanup) {
        module.cleanup();
      }
    });
  }

  handlePageVisible() {
    // 页面重新可见时恢复功能
    if (this.settings.enabled && this.isInitialized) {
      // 重新初始化需要的模块
    }
  }

  handleDOMChanges() {
    // DOM变化时通知相关模块
    if (this.modules.elementHighlighter) {
      // 刷新高亮系统
      this.modules.elementHighlighter.refreshHighlights?.();
    }
    
    if (this.modules.focusModeHandler?.isActive) {
      // 刷新聚焦模式
      this.modules.focusModeHandler.refreshFocusMode?.();
    }
  }

  enable() {
    if (!this.isInitialized) return;
    
    document.body.classList.add(CSS_CLASSES.TABLET_BROWSE_ACTIVE);
    
    // 启用所有模块
    Object.values(this.modules).forEach(module => {
      if (module.enable) {
        module.enable();
      }
    });
    
    console.log('TabletBrowse Pro: Enabled');
  }

  disable() {
    document.body.classList.remove(CSS_CLASSES.TABLET_BROWSE_ACTIVE);
    
    // 禁用所有模块
    Object.values(this.modules).forEach(module => {
      if (module.disable) {
        module.disable();
      }
    });
    
    // 清理所有UI状态
    this.cleanup();
    
    console.log('TabletBrowse Pro: Disabled');
  }

  cleanup() {
    // 清理所有模块状态
    Object.values(this.modules).forEach(module => {
      if (module.cleanup) {
        module.cleanup();
      }
    });
    
    // 清理观察器
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    // 移除CSS类
    document.body.classList.remove(CSS_CLASSES.TABLET_BROWSE_ACTIVE);
  }

  // 公共API方法
  getModule(name) {
    return this.modules[name];
  }

  getSettings() {
    return { ...this.settings };
  }

  isEnabled() {
    return this.settings.enabled && this.isInitialized;
  }

  getVersion() {
    return '1.0.0';
  }
}

// 等待DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TabletBrowseMain();
  });
} else {
  new TabletBrowseMain();
}
