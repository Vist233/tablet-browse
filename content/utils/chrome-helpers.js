/**
 * ChromeAPI - 统一 Promise 封装与安全降级
 * 可在扩展页面与内容脚本中使用
 */
(function () {
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime;

  function withCallback(fn) {
    return new Promise((resolve, reject) => {
      try {
        fn((result) => {
          const err = chrome?.runtime?.lastError;
          if (err) return reject(err);
          resolve(result);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  const ChromeAPI = {
    // storage
    storageGet(keys = null) {
      if (!isExtension) {
        try {
          const raw = localStorage.getItem('tabletBrowseSettings');
          return Promise.resolve(raw ? JSON.parse(raw) : {});
        } catch (_) {
          return Promise.resolve({});
        }
      }
      return withCallback((cb) => chrome.storage.sync.get(keys || null, cb));
    },

    storageSet(items) {
      if (!isExtension) {
        try {
          localStorage.setItem('tabletBrowseSettings', JSON.stringify(items));
        } catch (_) {}
        return Promise.resolve();
      }
      return withCallback((cb) => chrome.storage.sync.set(items, cb));
    },

    // tabs
    tabsQuery(queryInfo = {}) {
      if (!isExtension || !chrome.tabs?.query) {
        return Promise.resolve([]);
      }
      return withCallback((cb) => chrome.tabs.query(queryInfo, cb));
    },

    tabsSendMessage(tabId, message) {
      if (!isExtension || !chrome.tabs?.sendMessage) {
        return Promise.reject(new Error('tabs.sendMessage not available'));
      }
      return withCallback((cb) => chrome.tabs.sendMessage(tabId, message, cb));
    },

    // runtime
    runtimeSendMessage(message) {
      if (!isExtension || !chrome.runtime?.sendMessage) {
        return Promise.reject(new Error('runtime.sendMessage not available'));
      }
      return withCallback((cb) => chrome.runtime.sendMessage(message, cb));
    },

    openOptionsPage() {
      if (!isExtension || !chrome.runtime?.openOptionsPage) {
        return Promise.reject(new Error('openOptionsPage not available'));
      }
      return withCallback((cb) => chrome.runtime.openOptionsPage(cb));
    },
  };

  window.ChromeAPI = ChromeAPI;
})();
