/**
 * TabletBrowse Pro - 字体大小调节器
 * 提供网页字体大小调节功能
 */

class FontSizeAdjuster {
  constructor() {
    this.settings = {};
    this.isActive = false;
    this.fontSizeStyle = null;
    this.currentFontSize = 100; // 百分比基准
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.currentFontSize = this.settings.fontSize || 100;
    this.bindEvents();
    
    if (this.settings.fontSizeEnabled) {
      this.applyFontSize();
    }
  }

  bindEvents() {
    // 设置更新监听
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = event.detail.settings;
      
      if (this.settings.fontSizeEnabled && this.settings.fontSize !== this.currentFontSize) {
        this.currentFontSize = this.settings.fontSize;
        this.applyFontSize();
      } else if (!this.settings.fontSizeEnabled) {
        this.removeFontSize();
      }
    });

    // 页面加载完成后应用字体大小
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (this.settings.fontSizeEnabled) {
          this.applyFontSize();
        }
      });
    } else {
      if (this.settings.fontSizeEnabled) {
        this.applyFontSize();
      }
    }
  }

  applyFontSize() {
    // 移除旧的样式
    this.removeFontSize();
    
    // 创建新的字体大小样式
    const fontSizePercent = this.currentFontSize / 100;
    const css = `
      .tablet-browse-active body {
        font-size: ${fontSizePercent}rem !important;
      }
      
      .tablet-browse-active h1 {
        font-size: ${fontSizePercent * 2}rem !important;
      }
      
      .tablet-browse-active h2 {
        font-size: ${fontSizePercent * 1.8}rem !important;
      }
      
      .tablet-browse-active h3 {
        font-size: ${fontSizePercent * 1.6}rem !important;
      }
      
      .tablet-browse-active h4 {
        font-size: ${fontSizePercent * 1.4}rem !important;
      }
      
      .tablet-browse-active h5 {
        font-size: ${fontSizePercent * 1.2}rem !important;
      }
      
      .tablet-browse-active h6 {
        font-size: ${fontSizePercent * 1.1}rem !important;
      }
      
      .tablet-browse-active p, 
      .tablet-browse-active li, 
      .tablet-browse-active span {
        font-size: ${fontSizePercent}rem !important;
        line-height: ${1.4 * fontSizePercent} !important;
      }
      
      /* 保持按钮和输入框的合理大小 */
      .tablet-browse-active button,
      .tablet-browse-active input,
      .tablet-browse-active select,
      .tablet-browse-active textarea {
        font-size: max(${fontSizePercent}rem, 14px) !important;
        min-height: ${Math.max(36 * fontSizePercent, 32)}px !important;
        padding: ${8 * fontSizePercent}px ${12 * fontSizePercent}px !important;
      }
    `;
    
    this.fontSizeStyle = addStyles(css);
    this.isActive = true;
    
    console.log(`TabletBrowse Pro: Font size adjusted to ${this.currentFontSize}%`);
    
    // 触发字体大小改变事件
    document.dispatchEvent(createCustomEvent('fontSizeChanged', {
      fontSize: this.currentFontSize,
      enabled: true
    }));
  }

  removeFontSize() {
    if (this.fontSizeStyle && this.fontSizeStyle.parentNode) {
      this.fontSizeStyle.parentNode.removeChild(this.fontSizeStyle);
      this.fontSizeStyle = null;
    }
    this.isActive = false;
    
    // 触发字体大小重置事件
    document.dispatchEvent(createCustomEvent('fontSizeChanged', {
      fontSize: 100,
      enabled: false
    }));
  }

  // 公共方法：设置字体大小
  setFontSize(percentage) {
    const newSize = Math.max(50, Math.min(200, percentage)); // 限制在50%-200%之间
    this.currentFontSize = newSize;
    
    if (this.settings.fontSizeEnabled) {
      this.applyFontSize();
    }
    
    return newSize;
  }

  // 公共方法：启用字体大小调节
  enable() {
    this.applyFontSize();
    console.log('TabletBrowse Pro: Font size adjuster enabled');
  }

  // 公共方法：禁用字体大小调节
  disable() {
    this.removeFontSize();
    console.log('TabletBrowse Pro: Font size adjuster disabled');
  }

  // 公共方法：获取当前状态
  getStatus() {
    return {
      isActive: this.isActive,
      fontSize: this.currentFontSize,
      settings: { ...this.settings }
    };
  }

  // 公共方法：清理
  cleanup() {
    this.removeFontSize();
  }
}

// 全局字体大小调节器实例
window.tabletBrowseFontSizeAdjuster = null;