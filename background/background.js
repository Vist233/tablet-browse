/**
 * TabletBrowse Pro - Background Service Worker
 * 处理插件的后台逻辑，包括标签页管理、手势导航等
 */

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('TabletBrowse Pro installed');
  
  // 初始化存储设置
  chrome.storage.sync.set({
    enabled: true,
    hoverDelay: 800,
    precisionClickEnabled: true,
    gestureNavEnabled: true,
    focusModeEnabled: true,
    highlightEnabled: true
  });
});

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'switchTab':
      handleTabSwitch(request.direction, sender.tab.id);
      break;
    case 'getSettings':
      getSettings(sendResponse);
      return true; // 保持消息通道开放
    case 'updateSettings':
      updateSettings(request.settings, sendResponse);
      return true;
    default:
      console.log('Unknown action:', request.action);
  }
});

// 处理标签页切换
async function handleTabSwitch(direction, currentTabId) {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const currentIndex = tabs.findIndex(tab => tab.id === currentTabId);
    
    if (currentIndex === -1) return;
    
    let targetIndex;
    if (direction === 'left') {
      targetIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
    } else {
      targetIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
    }
    
    await chrome.tabs.update(tabs[targetIndex].id, { active: true });
  } catch (error) {
    console.error('Tab switch error:', error);
  }
}

// 获取设置
async function getSettings(sendResponse) {
  try {
    const settings = await chrome.storage.sync.get();
    sendResponse({ success: true, settings });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// 更新设置
async function updateSettings(newSettings, sendResponse) {
  try {
    await chrome.storage.sync.set(newSettings);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
