/**
 * Video Optimizer - 视频播放优化模块
 * 强制 H.264 编码，限制分辨率和帧率
 */

class VideoOptimizer {
  constructor() {
    this.settings = {};
    this.observer = null;
    this.videoElements = new Set();
    this.isEnabled = false;

    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.isEnabled = this.settings.videoOptimization?.enabled ?? true;
    
    if (!this.isEnabled) {
      logDebug('VideoOptimizer: Disabled');
      return;
    }

    logDebug('VideoOptimizer: Initializing...');
    
    // 默认设置
    this.defaultSettings = {
      maxResolution: '720p',
      maxFramerate: 30,
      forceH264: true,
      blockAV1: true,
      blockVP9: true
    };

    // 合并设置
    this.settings.videoOptimization = {
      ...this.defaultSettings,
      ...(this.settings.videoOptimization || {})
    };

    this.patchMediaSource();
    this.setupMutationObserver();
    this.processExistingVideos();
    
    logDebug('VideoOptimizer: Initialized with settings', this.settings.videoOptimization);
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'VIDEO') {
                this.optimizeVideo(node);
              } else if (node.querySelector) {
                const videos = node.querySelectorAll('video');
                videos.forEach(video => this.optimizeVideo(video));
              }
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  processExistingVideos() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => this.optimizeVideo(video));
  }

  optimizeVideo(video) {
    if (this.videoElements.has(video) || !this.isEnabled) return;

    this.videoElements.add(video);
    
    // 监听视频源变化
    const originalSrcSetter = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')?.set;
    if (originalSrcSetter) {
      Object.defineProperty(video, 'src', {
        set: (value) => {
          const optimizedSrc = this.processVideoSource(value);
          originalSrcSetter.call(video, optimizedSrc);
        },
        get: () => video.currentSrc
      });
    }

    // 处理现有的源
    if (video.src) {
      video.src = this.processVideoSource(video.src);
    }

    // 处理 source 元素
    const sources = video.querySelectorAll('source');
    sources.forEach(source => {
      if (source.src) {
        source.src = this.processVideoSource(source.src);
      }
    });

    // 应用分辨率限制
    this.applyResolutionLimits(video);

    logDebug('VideoOptimizer: Video optimized', video.src);
  }

  processVideoSource(src) {
    if (!src) return src;

    let url = new URL(src, window.location.href);

    // 强制 H.264
    if (this.settings.videoOptimization.forceH264) {
      this.forceH264Codec(url);
    }

    // 拦截 AV1/VP9
    if (this.settings.videoOptimization.blockAV1 || this.settings.videoOptimization.blockVP9) {
      url = this.blockUnwantedCodecs(url);
    }

    // 添加分辨率参数
    this.addResolutionParams(url);

    return url.toString();
  }

  forceH264Codec(url) {
    // 移除现有的编解码器参数
    url.searchParams.delete('codec');
    url.searchParams.delete('vcodec');
    
    // 添加 H.264 编解码器
    url.searchParams.set('codec', 'h264');
    
    // 对于某些平台特定的参数
    if (url.hostname.includes('youtube')) {
      url.searchParams.set('vcodec', 'h264');
    }
  }

  blockUnwantedCodecs(url) {
    const pathname = url.pathname.toLowerCase();
    
    // 检查并拦截 AV1
    if (this.settings.videoOptimization.blockAV1 && 
        (pathname.includes('av1') || url.search.includes('av1') || 
         url.search.includes('codec=av01') || url.search.includes('vcodec=av1'))) {
      logDebug('VideoOptimizer: Blocking AV1 stream');
      return this.createFallbackUrl(url);
    }

    // 检查并拦截 VP9
    if (this.settings.videoOptimization.blockVP9 && 
        (pathname.includes('vp9') || url.search.includes('vp9') || 
         url.search.includes('codec=vp9') || url.search.includes('vcodec=vp9'))) {
      logDebug('VideoOptimizer: Blocking VP9 stream');
      return this.createFallbackUrl(url);
    }

    return url;
  }

  createFallbackUrl(originalUrl) {
    // 创建回退 URL，强制使用 H.264
    const fallbackUrl = new URL(originalUrl);
    fallbackUrl.searchParams.set('codec', 'h264');
    fallbackUrl.searchParams.set('vcodec', 'h264');
    
    // 移除可能的质量参数以便重新选择
    fallbackUrl.searchParams.delete('quality');
    fallbackUrl.searchParams.delete('q');
    
    return fallbackUrl;
  }

  addResolutionParams(url) {
    const maxRes = this.settings.videoOptimization.maxResolution;
    const maxFps = this.settings.videoOptimization.maxFramerate;

    if (maxRes) {
      switch(maxRes) {
        case '480p':
          url.searchParams.set('maxres', '480');
          url.searchParams.set('height', '480');
          break;
        case '720p':
          url.searchParams.set('maxres', '720');
          url.searchParams.set('height', '720');
          break;
        case '1080p':
          url.searchParams.set('maxres', '1080');
          url.searchParams.set('height', '1080');
          break;
      }
    }

    if (maxFps) {
      url.searchParams.set('maxfps', maxFps.toString());
      url.searchParams.set('fps', maxFps.toString());
    }
  }

  applyResolutionLimits(video) {
    const maxRes = this.settings.videoOptimization.maxResolution;
    const maxFps = this.settings.videoOptimization.maxFramerate;

    // 监听视频元数据加载
    video.addEventListener('loadedmetadata', () => {
      this.enforceResolutionLimits(video, maxRes, maxFps);
    });

    // 也立即检查
    if (video.readyState >= 1) {
      this.enforceResolutionLimits(video, maxRes, maxFps);
    }
  }

  shouldBlockMimeType(mimeType) {
    if (!mimeType || !this.isEnabled) return false;
    const lowered = mimeType.toLowerCase();

    if (this.settings.videoOptimization.blockAV1 && lowered.includes('av01')) {
      logDebug('VideoOptimizer: Blocking AV1 adaptive stream', mimeType);
      return true;
    }

    if (this.settings.videoOptimization.blockVP9 && (lowered.includes('vp9') || lowered.includes('vp09'))) {
      logDebug('VideoOptimizer: Blocking VP9 adaptive stream', mimeType);
      return true;
    }

    return false;
  }

  patchMediaSource() {
    if (window.__tabletBrowseMediaSourcePatched || typeof MediaSource === 'undefined') {
      return;
    }

    const originalAddSourceBuffer = MediaSource.prototype.addSourceBuffer;
    if (typeof originalAddSourceBuffer !== 'function') {
      return;
    }

    MediaSource.prototype.addSourceBuffer = function(mimeType, ...args) {
      try {
        const optimizer = window.tabletBrowseVideoOptimizer;
        if (optimizer && optimizer.shouldBlockMimeType && optimizer.shouldBlockMimeType(mimeType)) {
          throw new DOMException('NotSupportedError', 'NotSupportedError');
        }
      } catch (error) {
        if (error?.name === 'NotSupportedError') {
          throw error;
        }
        throw error;
      }

      return originalAddSourceBuffer.call(this, mimeType, ...args);
    };

    window.__tabletBrowseMediaSourcePatched = true;
  }

  enforceResolutionLimits(video, maxRes, maxFps) {
    if (!video.videoWidth) return;

    const currentHeight = video.videoHeight;
    let targetHeight = currentHeight;

    // 限制分辨率
    if (maxRes) {
      switch(maxRes) {
        case '480p':
          targetHeight = Math.min(currentHeight, 480);
          break;
        case '720p':
          targetHeight = Math.min(currentHeight, 720);
          break;
        case '1080p':
          targetHeight = Math.min(currentHeight, 1080);
          break;
      }
    }

    // 限制帧率（通过调整播放速率）
    if (maxFps && video.playbackRate > 1) {
      const currentFps = video.getVideoPlaybackQuality()?.totalVideoFrames || 30;
      if (currentFps > maxFps) {
        video.playbackRate = Math.min(video.playbackRate, maxFps / 30);
      }
    }

    // 如果分辨率需要调整，尝试选择更低的码率
    if (targetHeight < currentHeight && video.textTracks) {
      this.selectLowerBitrate(video);
    }
  }

  selectLowerBitrate(video) {
    // 尝试选择更低码率的版本
    if (video.networkState === HTMLMediaElement.NETWORK_LOADING) {
      video.playbackRate = 0.9; // 轻微降低播放速率
      setTimeout(() => {
        video.playbackRate = 1;
      }, 1000);
    }
  }

  enable() {
    this.isEnabled = true;
    this.processExistingVideos();
    logDebug('VideoOptimizer: Enabled');
  }

  disable() {
    this.isEnabled = false;
    logDebug('VideoOptimizer: Disabled');
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.videoElements.clear();
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.isEnabled = this.settings.videoOptimization?.enabled ?? true;
    
    if (this.isEnabled) {
      this.processExistingVideos();
    }
  }
}
