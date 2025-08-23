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
      
      // 应用滚动条增强
      this.applyScrollbarEnhancements();
      
      this.isInitialized = true;
      console.log('TabletBrowse Pro: Initialization complete');
      
      // 触发初始化完成事件
      document.dispatchEvent(createCustomEvent('tb-initialized', {
        version: '1.1.0',
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
      { name: 'swipeDisabler', class: SwipeDisabler },
      { name: 'fontSizeAdjuster', class: FontSizeAdjuster }
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

  applyScrollbarEnhancements() {
    // 添加滚动条增强CSS
    const scrollbarCSS = `
      /* 为所有可滚动元素添加自定义滚动条样式 */
      * {
        /* 检查元素是否可滚动 */
        scrollbar-width: thin;
        scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
      }
      
      /* Webkit浏览器的滚动条样式 */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      
      ::-webkit-scrollbar-thumb {
        background-color: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        border: 2px solid transparent;
        background-clip: padding-box;
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background-color: rgba(0, 0, 0, 0.5);
      }
      
      ::-webkit-scrollbar-corner {
        background: transparent;
      }
    `;
    
    addStyles(scrollbarCSS);
    console.log('TabletBrowse Pro: Scrollbar enhancements applied');
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
    // 滑动禁用器不需要处理DOM变化
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
    return '1.2.0';
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
