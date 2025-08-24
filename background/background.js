/**
 * TabletBrowse Pro - Background Service Worker
 * 处理插件的后台逻辑，包括标签页管理、手势导航等
 */

// 统一 Promise 封装（后台专用）
const ChromeAPI = {
  storageGet: (keys = null) => new Promise((resolve, reject) => {
    try { chrome.storage.sync.get(keys, (res) => { const err = chrome.runtime?.lastError; if (err) reject(err); else resolve(res||{}); }); } catch (e) { reject(e); }
  }),
  storageSet: (items) => new Promise((resolve, reject) => {
    try { chrome.storage.sync.set(items, () => { const err = chrome.runtime?.lastError; if (err) reject(err); else resolve(); }); } catch (e) { reject(e); }
  }),
  tabsQuery: (queryInfo = {}) => new Promise((resolve, reject) => {
    try { chrome.tabs.query(queryInfo, (tabs) => { const err = chrome.runtime?.lastError; if (err) reject(err); else resolve(tabs||[]); }); } catch (e) { reject(e); }
  }),
  tabsUpdate: (tabId, updateProps) => new Promise((resolve, reject) => {
    try { chrome.tabs.update(tabId, updateProps, (tab) => { const err = chrome.runtime?.lastError; if (err) reject(err); else resolve(tab); }); } catch (e) { reject(e); }
  })
};

// 插件安装时的初始化
chrome.runtime.onInstalled.addListener(async () => {
  console.log('TabletBrowse Pro installed');
  // 初始化存储设置
  await ChromeAPI.storageSet({
    enabled: true,
    swipeDisabled: true,
    videoOptimization: { enabled: true },
    touchGuard: { enabled: true },
    renderOptimization: { enabled: true }
  });
});

// 处理来自 content script 的消息（统一 async/await）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getSettings': {
          const settings = await ChromeAPI.storageGet();
          sendResponse({ success: true, settings });
          break;
        }
        case 'updateSettings':
          await ChromeAPI.storageSet(request.settings || {});
          sendResponse({ success: true });
          break;
        default:
          console.log('Unknown action:', request.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error?.message || String(error) });
    }
  })();
  return true; // 保持消息通道开放直到 async 完成
});

// 处理标签页切换（保留基本功能）
async function handleTabSwitch(direction, currentTabId) {
  try {
    const tabs = await ChromeAPI.tabsQuery({ currentWindow: true });
    const currentIndex = tabs.findIndex(tab => tab.id === currentTabId);
    
    if (currentIndex === -1) return;
    
    let targetIndex;
    if (direction === 'left') {
      targetIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
    } else {
      targetIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
    }
    
    await ChromeAPI.tabsUpdate(tabs[targetIndex].id, { active: true });
  } catch (error) {
    console.error('Tab switch error:', error);
  }
}

// 获取设置（简化版本）
async function getSettings(sendResponse) {
  try {
    const settings = await ChromeAPI.storageGet();
    sendResponse({ success: true, settings });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
