/**
 * TabletBrowse Pro - Popup 脚本
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 获取所有控件元素
  const elements = {
    enablePlugin: document.getElementById('enablePlugin'),
    swipeDisabled: document.getElementById('swipeDisabled'),
    fontSizeEnabled: document.getElementById('fontSizeEnabled'),
    fontSize: document.getElementById('fontSize')
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
      elements.fontSizeEnabled.checked = result.fontSizeEnabled || false;
      elements.fontSize.value = result.fontSize || 100;
      
      updateFontSizeDisplay();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  // 实时保存设置
  async function saveSettingsImmediately() {
    try {
      const settings = {
        enabled: elements.enablePlugin.checked,
        swipeDisabled: elements.swipeDisabled.checked,
        fontSizeEnabled: elements.fontSizeEnabled.checked,
        fontSize: parseInt(elements.fontSize.value)
      };

      await window.ChromeAPI.storageSet(settings);
      
      // 通知所有标签页设置已更新
      const tabs = await window.ChromeAPI.tabsQuery({});
      await Promise.all(tabs.map(tab => window.ChromeAPI.tabsSendMessage(tab.id, { action: 'settingsUpdated', settings }).catch(() => {})));
      
      // 显示保存成功指示
      showSaveIndicator();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
  
  // 显示保存指示器
  function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    if (indicator) {
      indicator.classList.add('visible');
      setTimeout(() => {
        indicator.classList.remove('visible');
      }, 1500);
    }
  }

  // 更新显示
  function updateFontSizeDisplay() {
    const span = document.getElementById('fontSizeValue');
    if (span) span.textContent = elements.fontSize.value + '%';
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
    // 滑块显示更新
    elements.fontSize.addEventListener('input', updateFontSizeDisplay);
    
    // 实时保存所有设置更改
    const settingsTargets = [
      elements.enablePlugin,
      elements.swipeDisabled,
      elements.fontSizeEnabled,
      elements.fontSize
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
