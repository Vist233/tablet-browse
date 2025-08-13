/**
 * TabletBrowse Pro - Popup 脚本
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 获取所有控件元素
  const elements = {
    enablePlugin: document.getElementById('enablePlugin'),
    hoverSimulation: document.getElementById('hoverSimulation'),
    gestureNav: document.getElementById('gestureNav'),
    elementHighlight: document.getElementById('elementHighlight'),
    hoverDelay: document.getElementById('hoverDelay'),
    gestureThreshold: document.getElementById('gestureThreshold'),
    blockContextMenu: document.getElementById('blockContextMenu'),
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
      const result = await window.ChromeAPI.storageGet();
      
      elements.enablePlugin.checked = result.enabled !== false;
      elements.hoverSimulation.checked = result.hoverSimulation !== false;
      // 精准点击模式已移除
      elements.gestureNav.checked = result.gestureNavEnabled !== false;
      // 聚焦模式已移除
      elements.elementHighlight.checked = result.highlightEnabled !== false;
      elements.hoverDelay.value = result.hoverDelay || 800;
      elements.gestureThreshold.value = (typeof result.gestureThreshold === 'number') ? result.gestureThreshold : 40;
      elements.blockContextMenu.checked = !!result.preventDefaultContextMenu;
      
      updateHoverDelayDisplay();
      updateGestureThresholdDisplay();
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
        // 精准点击模式已移除
        gestureNavEnabled: elements.gestureNav.checked,
        // 聚焦模式已移除
        highlightEnabled: elements.elementHighlight.checked,
        hoverDelay: parseInt(elements.hoverDelay.value),
        gestureThreshold: parseInt(elements.gestureThreshold.value),
        preventDefaultContextMenu: elements.blockContextMenu.checked
      };

      await window.ChromeAPI.storageSet(settings);
      
      // 通知所有标签页设置已更新
      const tabs = await window.ChromeAPI.tabsQuery({});
      await Promise.all(tabs.map(tab => window.ChromeAPI.tabsSendMessage(tab.id, { action: 'settingsUpdated', settings }).catch(() => {})));

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
        // 精准点击模式已移除
        gestureNavEnabled: true,
        highlightEnabled: true,
        hoverDelay: 800,
        gestureThreshold: 40,
        preventDefaultContextMenu: false
      };

      await window.ChromeAPI.storageSet(defaultSettings);
      await loadSettings();
      
      showNotification('设置已重置');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      showNotification('重置失败', 'error');
    }
  }

  // 更新显示
  function updateHoverDelayDisplay() {
    const span = document.getElementById('hoverDelayValue');
    if (span) span.textContent = elements.hoverDelay.value + 'ms';
  }

  function updateGestureThresholdDisplay() {
    const span = document.getElementById('gestureThresholdValue');
    if (span) span.textContent = elements.gestureThreshold.value + 'px';
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
    
    // 滑块显示更新
    elements.hoverDelay.addEventListener('input', updateHoverDelayDisplay);
    elements.gestureThreshold.addEventListener('input', updateGestureThresholdDisplay);
    
    // 自动保存（checkbox/range）
    const autoSaveTargets = [
      elements.enablePlugin,
      elements.hoverSimulation,
      
      elements.gestureNav,
      elements.elementHighlight,
      elements.blockContextMenu,
      elements.hoverDelay,
      elements.gestureThreshold
    ];
    autoSaveTargets.forEach(element => {
      if (!element) return;
      const eventName = element.type === 'range' ? 'change' : 'change';
      element.addEventListener(eventName, () => {
        clearTimeout(window.autoSaveTimeout);
        window.autoSaveTimeout = setTimeout(saveSettings, 500);
      });
    });
  }
});
