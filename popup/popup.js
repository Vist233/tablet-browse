/**
 * TabletBrowse Pro - Popup 脚本
 */

if (typeof window.tabletBrowseDebug === 'undefined') {
  window.tabletBrowseDebug = false;
}

const popupDebugEnabled = () => Boolean(window.tabletBrowseDebug);
const popupLogError = (...args) => { if (popupDebugEnabled()) console.error('[TabletBrowse]', ...args); };

document.addEventListener('DOMContentLoaded', async () => {
  // 获取所有控件元素
  const elements = {
    enablePlugin: document.getElementById('enablePlugin'),
    swipeDisabled: document.getElementById('swipeDisabled'),
    videoOptimization: document.getElementById('videoOptimization'),
    renderOptimization: document.getElementById('renderOptimization')
  };

  // 加载当前设置
  await loadSettings();

  // 绑定事件监听器
  bindEventListeners();

  // 加载设置
  async function loadSettings() {
    try {
      const result = await window.ChromeAPI.storageGet();
      
      elements.enablePlugin.checked = result.enabled !== false;
      elements.swipeDisabled.checked = result.swipeDisabled !== false;
      elements.videoOptimization.checked = result.videoOptimization?.enabled ?? true;
      elements.renderOptimization.checked = result.renderOptimization?.enabled ?? true;
    } catch (error) {
      popupLogError('Failed to load settings:', error);
    }
  }

  // 实时保存设置
  async function saveSettingsImmediately() {
    try {
      const settings = {
        enabled: elements.enablePlugin.checked,
        swipeDisabled: elements.swipeDisabled.checked,
        videoOptimization: { enabled: elements.videoOptimization.checked },
        renderOptimization: { enabled: elements.renderOptimization.checked }
      };

      await window.ChromeAPI.storageSet(settings);
      
      // 通知所有标签页设置已更新
      const tabs = await window.ChromeAPI.tabsQuery({});
      await Promise.all(tabs.map(tab => window.ChromeAPI.tabsSendMessage(tab.id, { action: 'settingsUpdated', settings }).catch(() => {})));
    } catch (error) {
      popupLogError('Failed to save settings:', error);
    }
  }

  // 显示通知
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 16px;
      background: ${type === 'error' ? '#dc3545' : '#28a745'};
      color: white;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 2000);
  }

  // 绑定事件监听器
  function bindEventListeners() {
    // 实时保存所有设置更改
    const settingsTargets = [
      elements.enablePlugin,
      elements.swipeDisabled,
      elements.videoOptimization,
      elements.renderOptimization
    ];
    
    settingsTargets.forEach(element => {
      if (!element) return;
      const eventName = element.type === 'range' ? 'input' : 'change';
      element.addEventListener(eventName, () => {
        saveSettingsImmediately();
      });
    });
  }
});
