/**
 * TabletBrowse Pro - 环境检测和兼容性处理
 */

// 检测当前运行环境
function detectEnvironment() {
  const env = {
    isExtension: false,
    isSecureContext: window.isSecureContext || false,
    hasClipboardAPI: !!(navigator.clipboard && navigator.clipboard.writeText),
    hasChromeRuntime: !!(typeof chrome !== 'undefined' && chrome.runtime),
    isTestMode: window.location.protocol === 'file:' || window.location.hostname === 'localhost',
    // 平板设备检测
    isTablet: detectTabletDevice(),
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    screenSize: getScreenSizeCategory(),
    devicePixelRatio: window.devicePixelRatio || 1,
    orientation: getOrientation()
  };
  
  // 检测是否在扩展环境中
  if (env.hasChromeRuntime) {
    try {
      // 尝试访问扩展API
      if (chrome.runtime.getManifest) {
        env.isExtension = true;
        env.extensionId = chrome.runtime.id;
        env.manifest = chrome.runtime.getManifest();
      }
    } catch (error) {
      logWarn('Chrome runtime available but extension APIs not accessible:', error);
    }
  }
  
  return env;
}

// 检测平板设备
function detectTabletDevice() {
  const userAgent = navigator.userAgent.toLowerCase();
  const screen = window.screen;
  
  // 检查用户代理字符串
  const tabletKeywords = ['ipad', 'tablet', 'android', 'kindle', 'silk', 'gt-p', 'sm-t'];
  const isTabletUA = tabletKeywords.some(keyword => userAgent.includes(keyword));
  
  // 检查屏幕尺寸 (平板通常在7-13英寸之间)
  const screenDiagonal = Math.sqrt(Math.pow(screen.width, 2) + Math.pow(screen.height, 2)) / (window.devicePixelRatio || 1);
  const isTabletSize = screenDiagonal >= 600 && screenDiagonal <= 1400; // 大概7-13英寸
  
  // 检查触摸支持
  const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // 检查设备方向支持
  const hasOrientationSupport = 'orientation' in window || 'screen' in window && 'orientation' in window.screen;
  
  return {
    isTablet: isTabletUA || (isTabletSize && hasTouchSupport),
    userAgent: isTabletUA,
    screenSize: isTabletSize,
    touchSupport: hasTouchSupport,
    orientationSupport: hasOrientationSupport,
    diagonal: screenDiagonal
  };
}

// 获取屏幕尺寸类别
function getScreenSizeCategory() {
  const width = Math.max(window.screen.width, window.screen.height);
  const height = Math.min(window.screen.width, window.screen.height);
  
  if (width <= 768) return 'small'; // 小平板 (7-8英寸)
  if (width <= 1024) return 'medium'; // 中等平板 (9-10英寸)
  if (width <= 1366) return 'large'; // 大平板 (11-13英寸)
  return 'xlarge'; // 超大平板
}

// 获取设备方向
function getOrientation() {
  if (window.screen && window.screen.orientation) {
    return window.screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
  }
  return window.innerWidth < window.innerHeight ? 'portrait' : 'landscape';
}

// 全局环境信息
window.TABLET_BROWSE_ENV = detectEnvironment();

// 环境兼容性处理
class EnvironmentAdapter {
  constructor() {
    this.env = window.TABLET_BROWSE_ENV;
    this.setupCompatibilityLayer();
  }
  
  setupCompatibilityLayer() {
    // 如果不在扩展环境中，创建模拟的chrome对象
    if (!this.env.isExtension && typeof chrome === 'undefined') {
      window.chrome = this.createMockChromeAPI();
    }
  }
  
  createMockChromeAPI() {
    return {
      runtime: {
        sendMessage: (message, callback) => {
          logWarn('Mock chrome.runtime.sendMessage called:', message);
          if (callback) {
            // 模拟异步响应
            setTimeout(() => {
              if (message.action === 'getSettings') {
                callback({ success: true, settings: getDefaultSettings() });
              } else {
                callback({ success: false, error: 'Mock API' });
              }
            }, 10);
          }
        },
        onMessage: {
          addListener: (listener) => {
            logWarn('Mock chrome.runtime.onMessage.addListener called');
            // 存储监听器，但在测试环境中不会收到真实消息
          }
        },
        openOptionsPage: () => {
          logWarn('Mock chrome.runtime.openOptionsPage called');
          alert('设置功能仅在浏览器扩展环境中可用');
        },
        lastError: null
      },
      storage: {
        sync: {
          get: (keys, callback) => {
            logWarn('Mock chrome.storage.sync.get called');
            if (callback) {
              setTimeout(() => callback(getDefaultSettings()), 10);
            }
          },
          set: (items, callback) => {
            logWarn('Mock chrome.storage.sync.set called:', items);
            if (callback) {
              setTimeout(() => callback(), 10);
            }
          }
        }
      }
    };
  }
  
  // 安全的消息发送
  sendMessage(message, callback) {
    if (this.env.isExtension) {
      chrome.runtime.sendMessage(message, callback);
    } else {
      logWarn('Message sending not available in test environment:', message);
      if (callback) {
        setTimeout(() => {
          callback({ success: false, error: 'Not in extension environment' });
        }, 10);
      }
    }
  }
  
  // 安全的存储操作
  getStorage(keys) {
    return new Promise((resolve) => {
      if (this.env.isExtension) {
        chrome.storage.sync.get(keys, resolve);
      } else {
        // 使用localStorage作为备用
        try {
          const stored = localStorage.getItem('tabletBrowseSettings');
          const settings = stored ? JSON.parse(stored) : getDefaultSettings();
          resolve(settings);
        } catch (error) {
          resolve(getDefaultSettings());
        }
      }
    });
  }
  
  setStorage(items) {
    return new Promise((resolve) => {
      if (this.env.isExtension) {
        chrome.storage.sync.set(items, resolve);
      } else {
        // 使用localStorage作为备用
        try {
          localStorage.setItem('tabletBrowseSettings', JSON.stringify(items));
          resolve();
        } catch (error) {
          logError('Failed to save settings to localStorage:', error);
          resolve();
        }
      }
    });
  }
  
  // 显示环境信息
  showEnvironmentInfo() {
    const info = [
      `Environment: ${this.env.isExtension ? 'Extension' : 'Test Mode'}`,
      `Device Type: ${this.env.isTablet.isTablet ? 'Tablet' : 'Desktop/Mobile'}`,
      `Touch Support: ${this.env.isTouchDevice}`,
      `Screen Size: ${this.env.screenSize} (${window.screen.width}x${window.screen.height})`,
      `Orientation: ${this.env.orientation}`,
      `Pixel Ratio: ${this.env.devicePixelRatio}`,
      `Secure Context: ${this.env.isSecureContext}`,
      `Clipboard API: ${this.env.hasClipboardAPI}`,
      `Chrome Runtime: ${this.env.hasChromeRuntime}`
    ];
    
    if (this.env.isExtension) {
      info.push(`Extension ID: ${this.env.extensionId}`);
      info.push(`Manifest Version: ${this.env.manifest?.manifest_version}`);
    }
    
    if (this.env.isTablet.isTablet) {
      info.push(`Tablet Details: Screen ${this.env.isTablet.diagonal.toFixed(0)}px diagonal`);
      info.push(`Tablet Features: UA=${this.env.isTablet.userAgent}, Size=${this.env.isTablet.screenSize}, Orientation=${this.env.isTablet.orientationSupport}`);
    }
    
    logDebug('TabletBrowse Pro Environment Info:\n' + info.join('\n'));
    
    // 在测试模式下显示提示
    if (this.env.isTestMode && !this.env.isExtension) {
      this.showTestModeNotice();
    }
    
    // 在平板设备上显示优化提示
    if (this.env.isTablet.isTablet) {
      this.showTabletOptimizationNotice();
    }
  }
  
  showTestModeNotice() {
    // 创建测试模式提示
    const notice = document.createElement('div');
    notice.id = 'tb-test-mode-notice';
    notice.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(255, 193, 7, 0.9);
      color: #333;
      padding: 10px 15px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 10000;
      max-width: 250px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      border-left: 4px solid #ffc107;
    `;
    
    notice.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">🧪 测试模式</div>
      <div>当前在测试环境中运行，部分功能（如标签页切换、设置保存）可能不可用。</div>
      <div style="margin-top: 5px; font-size: 11px; opacity: 0.8;">
        要体验完整功能，请将插件安装到浏览器中。
      </div>
    `;
    
    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 5px;
      right: 8px;
      background: none;
      border: none;
      font-size: 16px;
      cursor: pointer;
      color: #333;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeBtn.onclick = () => notice.remove();
    notice.appendChild(closeBtn);
    
    document.body.appendChild(notice);
    
    // 10秒后自动隐藏
    setTimeout(() => {
      if (notice.parentNode) {
        notice.style.opacity = '0';
        notice.style.transition = 'opacity 0.5s';
        setTimeout(() => notice.remove(), 500);
      }
    }, 10000);
  }
  
  showTabletOptimizationNotice() {
    // 创建平板优化提示
    const notice = document.createElement('div');
    notice.id = 'tb-tablet-notice';
    notice.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(40, 167, 69, 0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 10001;
      max-width: 280px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      border-left: 4px solid #28a745;
    `;
    
    const deviceInfo = this.env.isTablet;
    notice.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 6px;">📱 平板优化已启用</div>
      <div style="font-size: 12px; margin-bottom: 4px;">
        设备: ${this.env.screenSize} 屏幕 (${this.env.orientation})
      </div>
      <div style="font-size: 11px; opacity: 0.9;">
        • 触摸延迟已优化 (600ms)<br>
        • 手势识别已调整<br>
        • 触摸目标已增大
      </div>
    `;
    
    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 6px;
      right: 10px;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: white;
      padding: 0;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    closeBtn.onclick = () => notice.remove();
    notice.appendChild(closeBtn);
    
    document.body.appendChild(notice);
    
    // 8秒后自动隐藏
    setTimeout(() => {
      if (notice.parentNode) {
        notice.style.opacity = '0';
        notice.style.transition = 'opacity 0.5s';
        setTimeout(() => notice.remove(), 500);
      }
    }, 8000);
  }
}

// 创建全局环境适配器
window.TABLET_BROWSE_ADAPTER = new EnvironmentAdapter();

// 在页面加载完成后显示环境信息
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.TABLET_BROWSE_ADAPTER.showEnvironmentInfo();
  });
} else {
  window.TABLET_BROWSE_ADAPTER.showEnvironmentInfo();
}
