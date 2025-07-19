/**
 * TabletBrowse Pro - Popup 脚本
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 获取所有控件元素
  const elements = {
    enablePlugin: document.getElementById('enablePlugin'),
    hoverSimulation: document.getElementById('hoverSimulation'),
    precisionClick: document.getElementById('precisionClick'),
    gestureNav: document.getElementById('gestureNav'),
    focusMode: document.getElementById('focusMode'),
    elementHighlight: document.getElementById('elementHighlight'),
    hoverDelay: document.getElementById('hoverDelay'),
    resetSettings: document.getElementById('resetSettings'),
    saveSettings: document.getElementById('saveSettings')
  };

  // 加载当前设置
  await loadSettings();

  // 绑定事件监听器
  bindEventListeners();

  // 加载设置
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get();
      
      elements.enablePlugin.checked = result.enabled !== false;
      elements.hoverSimulation.checked = result.hoverSimulation !== false;
      elements.precisionClick.checked = result.precisionClickEnabled !== false;
      elements.gestureNav.checked = result.gestureNavEnabled !== false;
      elements.focusMode.checked = result.focusModeEnabled !== false;
      elements.elementHighlight.checked = result.highlightEnabled !== false;
      elements.hoverDelay.value = result.hoverDelay || 800;
      
      updateDelayDisplay();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  // 保存设置
  async function saveSettings() {
    try {
      const settings = {
        enabled: elements.enablePlugin.checked,
        hoverSimulation: elements.hoverSimulation.checked,
        precisionClickEnabled: elements.precisionClick.checked,
        gestureNavEnabled: elements.gestureNav.checked,
        focusModeEnabled: elements.focusMode.checked,
        highlightEnabled: elements.elementHighlight.checked,
        hoverDelay: parseInt(elements.hoverDelay.value)
      };

      await chrome.storage.sync.set(settings);
      
      // 通知所有标签页设置已更新
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'settingsUpdated',
          settings
        }).catch(() => {
          // 忽略无法发送消息的标签页
        });
      });

      // 显示保存成功提示
      showNotification('设置已保存');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showNotification('保存失败', 'error');
    }
  }

  // 重置设置
  async function resetSettings() {
    try {
      const defaultSettings = {
        enabled: true,
        hoverSimulation: true,
        precisionClickEnabled: true,
        gestureNavEnabled: true,
        focusModeEnabled: true,
        highlightEnabled: true,
        hoverDelay: 800
      };

      await chrome.storage.sync.set(defaultSettings);
      await loadSettings();
      
      showNotification('设置已重置');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showNotification('重置失败', 'error');
    }
  }

  // 更新延迟显示
  function updateDelayDisplay() {
    const valueSpan = document.querySelector('.setting-value');
    if (valueSpan) {
      valueSpan.textContent = elements.hoverDelay.value + 'ms';
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
    // 保存按钮
    elements.saveSettings.addEventListener('click', saveSettings);
    
    // 重置按钮
    elements.resetSettings.addEventListener('click', resetSettings);
    
    // 延迟滑块
    elements.hoverDelay.addEventListener('input', updateDelayDisplay);
    
    // 自动保存开关状态
    Object.values(elements).forEach(element => {
      if (element.type === 'checkbox') {
        element.addEventListener('change', () => {
          // 延迟保存，避免频繁操作
          clearTimeout(window.autoSaveTimeout);
          window.autoSaveTimeout = setTimeout(saveSettings, 500);
        });
      }
    });
  }
});
