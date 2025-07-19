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
    isTestMode: window.location.protocol === 'file:' || window.location.hostname === 'localhost'
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
      console.warn('Chrome runtime available but extension APIs not accessible:', error);
    }
  }
  
  return env;
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
          console.warn('Mock chrome.runtime.sendMessage called:', message);
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
            console.warn('Mock chrome.runtime.onMessage.addListener called');
            // 存储监听器，但在测试环境中不会收到真实消息
          }
        },
        openOptionsPage: () => {
          console.warn('Mock chrome.runtime.openOptionsPage called');
          alert('设置功能仅在浏览器扩展环境中可用');
        },
        lastError: null
      },
      storage: {
        sync: {
          get: (keys, callback) => {
            console.warn('Mock chrome.storage.sync.get called');
            if (callback) {
              setTimeout(() => callback(getDefaultSettings()), 10);
            }
          },
          set: (items, callback) => {
            console.warn('Mock chrome.storage.sync.set called:', items);
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
      console.warn('Message sending not available in test environment:', message);
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
          console.error('Failed to save settings to localStorage:', error);
          resolve();
        }
      }
    });
  }
  
  // 显示环境信息
  showEnvironmentInfo() {
    const info = [
      `Environment: ${this.env.isExtension ? 'Extension' : 'Test Mode'}`,
      `Secure Context: ${this.env.isSecureContext}`,
      `Clipboard API: ${this.env.hasClipboardAPI}`,
      `Chrome Runtime: ${this.env.hasChromeRuntime}`
    ];
    
    if (this.env.isExtension) {
      info.push(`Extension ID: ${this.env.extensionId}`);
      info.push(`Manifest Version: ${this.env.manifest?.manifest_version}`);
    }
    
    console.log('TabletBrowse Pro Environment Info:\n' + info.join('\n'));
    
    // 在测试模式下显示提示
    if (this.env.isTestMode && !this.env.isExtension) {
      this.showTestModeNotice();
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
