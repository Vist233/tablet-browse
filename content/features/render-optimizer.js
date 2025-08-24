/**
 * Render Optimizer - 轻量化渲染优化模块
 * 自动懒加载，优化图片，减少动画开销
 */

class RenderOptimizer {
  constructor() {
    this.settings = {};
    this.isEnabled = false;
    this.observer = null;
    this.optimizedElements = new Set();
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.isEnabled = this.settings.renderOptimization?.enabled ?? true;
    
    if (!this.isEnabled) {
      console.log('RenderOptimizer: Disabled');
      return;
    }

    console.log('RenderOptimizer: Initializing...');

    // 默认设置
    this.defaultSettings = {
      lazyLoading: true,
      optimizeImages: true,
      reduceAnimations: true,
      targetDensity: 2, // 目标设备像素比
      maxImageWidth: 1920, // 最大图片宽度
      animationFrameLimit: 30 // 动画帧率限制
    };

    // 合并设置
    this.settings.renderOptimization = {
      ...this.defaultSettings,
      ...(this.settings.renderOptimization || {})
    };

    this.setupMutationObserver();
    this.optimizeExistingContent();
    
    console.log('RenderOptimizer: Initialized with settings', this.settings.renderOptimization);
  }

  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.optimizeNode(node);
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

  optimizeExistingContent() {
    // 优化现有图片
    if (this.settings.renderOptimization.optimizeImages) {
      this.optimizeAllImages();
    }

    // 添加懒加载
    if (this.settings.renderOptimization.lazyLoading) {
      this.addLazyLoading();
    }

    // 减少动画开销
    if (this.settings.renderOptimization.reduceAnimations) {
      this.reduceAnimationOverhead();
    }
  }

  optimizeNode(node) {
    if (this.optimizedElements.has(node)) return;

    // 优化图片
    if (node.tagName === 'IMG') {
      this.optimizeImage(node);
    }
    
    // 优化包含图片的元素
    if (node.querySelector && node.querySelector('img')) {
      const images = node.querySelectorAll('img');
      images.forEach(img => this.optimizeImage(img));
    }

    // 优化动画元素
    if (this.hasExpensiveAnimations(node)) {
      this.optimizeAnimations(node);
    }

    this.optimizedElements.add(node);
  }

  optimizeAllImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => this.optimizeImage(img));
    console.log(`RenderOptimizer: Optimized ${images.length} images`);
  }

  optimizeImage(img) {
    if (this.optimizedElements.has(img)) return;

    // 添加懒加载
    if (this.settings.renderOptimization.lazyLoading && !img.loading) {
      img.loading = 'lazy';
    }

    // 优化 srcset
    if (img.srcset && this.settings.renderOptimization.optimizeImages) {
      this.optimizeSrcset(img);
    }

    // 限制大图片
    this.limitImageSize(img);

    this.optimizedElements.add(img);
  }

  optimizeSrcset(img) {
    const targetDensity = this.settings.renderOptimization.targetDensity;
    const maxWidth = this.settings.renderOptimization.maxImageWidth;
    
    try {
      const srcset = img.srcset;
      const descriptors = srcset.split(',').map(part => part.trim());
      
      // 过滤保留合适密度的图片
      const optimizedDescriptors = descriptors.filter(descriptor => {
        // 解析宽度描述符 (例如: 800w)
        const widthMatch = descriptor.match(/(\d+)w$/);
        if (widthMatch) {
          const width = parseInt(widthMatch[1]);
          return width <= maxWidth;
        }

        // 解析像素密度描述符 (例如: 2x)
        const densityMatch = descriptor.match(/(\d+(?:\.\d+)?)x$/);
        if (densityMatch) {
          const density = parseFloat(densityMatch[1]);
          return density <= targetDensity;
        }

        return true; // 保留没有描述符的项
      });

      if (optimizedDescriptors.length > 0) {
        img.srcset = optimizedDescriptors.join(', ');
      }
    } catch (error) {
      console.warn('RenderOptimizer: Failed to optimize srcset', error);
    }
  }

  limitImageSize(img) {
    const maxWidth = this.settings.renderOptimization.maxImageWidth;
    
    // 监听图片加载
    if (!img.complete) {
      img.addEventListener('load', () => {
        this.enforceSizeLimit(img, maxWidth);
      });
    } else {
      this.enforceSizeLimit(img, maxWidth);
    }
  }

  enforceSizeLimit(img, maxWidth) {
    if (img.naturalWidth > maxWidth) {
      // 设置最大宽度
      img.style.maxWidth = `${maxWidth}px`;
      img.style.height = 'auto';
      
      // 对于响应式图片，确保不会拉伸
      if (!img.hasAttribute('width') && !img.hasAttribute('height')) {
        const ratio = img.naturalHeight / img.naturalWidth;
        img.setAttribute('width', maxWidth);
        img.setAttribute('height', Math.round(maxWidth * ratio));
      }
    }
  }

  addLazyLoading() {
    // 为所有图片添加懒加载
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
      img.loading = 'lazy';
    });

    // 为iframe添加懒加载
    const iframes = document.querySelectorAll('iframe:not([loading])');
    iframes.forEach(iframe => {
      iframe.loading = 'lazy';
    });

    console.log(`RenderOptimizer: Added lazy loading to ${images.length} images and ${iframes.length} iframes`);
  }

  reduceAnimationOverhead() {
    const reduceMotionCSS = `
      /* 减少动画开销 */
      .render-optimizer-reduced-motion * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }

      /* 针对高开销动画的特殊处理 */
      .render-optimizer-reduced-motion [style*="transform"],
      .render-optimizer-reduced-motion [style*="filter"],
      .render-optimizer-reduced-motion [class*="animate"],
      .render-optimizer-reduced-motion [class*="transition"] {
        transform: none !important;
        filter: none !important;
        animation: none !important;
        transition: none !important;
      }

      /* 限制帧率 */
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* 优化模糊和变换动画 */
      .render-optimizer-reduced-motion [style*="blur"],
      .render-optimizer-reduced-motion [style*="scale"],
      .render-optimizer-reduced-motion [style*="rotate"] {
        filter: none !important;
        transform: none !important;
      }
    `;

    const style = document.createElement('style');
    style.textContent = reduceMotionCSS;
    document.head.appendChild(style);

    // 检查用户是否偏好减少动画
    this.checkReducedMotionPreference();
  }

  checkReducedMotionPreference() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    if (mediaQuery.matches) {
      document.body.classList.add('render-optimizer-reduced-motion');
    }

    // 监听偏好变化
    mediaQuery.addEventListener('change', (event) => {
      if (event.matches) {
        document.body.classList.add('render-optimizer-reduced-motion');
      } else {
        document.body.classList.remove('render-optimizer-reduced-motion');
      }
    });
  }

  hasExpensiveAnimations(element) {
    // 检测高开销动画
    const style = window.getComputedStyle(element);
    const hasTransform = style.transform !== 'none';
    const hasFilter = style.filter !== 'none';
    const hasAnimation = style.animationName !== 'none';
    const hasTransition = style.transitionProperty !== 'none';

    // 检查是否包含昂贵操作
    const expensiveProperties = [
      'blur', 'scale', 'rotate', 'translate3d', 'matrix3d'
    ];

    const hasExpensiveTransform = expensiveProperties.some(prop => 
      style.transform.includes(prop)
    );

    const hasExpensiveFilter = style.filter.includes('blur') || 
                              style.filter.includes('drop-shadow');

    return (hasTransform && hasExpensiveTransform) ||
           (hasFilter && hasExpensiveFilter) ||
           hasAnimation ||
           hasTransition;
  }

  optimizeAnimations(element) {
    // 优化单个元素的动画
    const style = element.style;
    
    // 限制动画帧率
    if (style.animation) {
      const animationStyle = style.animation;
      if (animationStyle.includes('infinite') || animationStyle.includes('alternate')) {
        style.animation = animationStyle
          .replace('infinite', '1')
          .replace('alternate', 'normal');
      }
    }

    // 简化变换动画
    if (style.transform && this.isExpensiveTransform(style.transform)) {
      style.transform = this.simplifyTransform(style.transform);
    }

    // 简化滤镜动画
    if (style.filter && this.isExpensiveFilter(style.filter)) {
      style.filter = this.simplifyFilter(style.filter);
    }
  }

  isExpensiveTransform(transform) {
    const expensivePatterns = [
      /matrix3d/, /translate3d/, /scale3d/, /rotate3d/, /perspective/
    ];
    return expensivePatterns.some(pattern => pattern.test(transform));
  }

  isExpensiveFilter(filter) {
    return filter.includes('blur(') || 
           filter.includes('drop-shadow(') ||
           filter.split(' ').length > 2;
  }

  simplifyTransform(transform) {
    // 简化3D变换为2D
    return transform
      .replace(/matrix3d\([^)]+\)/g, 'none')
      .replace(/translate3d\([^)]+\)/g, (match) => {
        const values = match.match(/translate3d\(([^)]+)\)/)[1].split(',');
        return `translate(${values[0]}, ${values[1]})`;
      })
      .replace(/scale3d\([^)]+\)/g, (match) => {
        const values = match.match(/scale3d\(([^)]+)\)/)[1].split(',');
        return `scale(${values[0]})`;
      });
  }

  simplifyFilter(filter) {
    // 移除或简化昂贵滤镜
    return filter
      .replace(/blur\([^)]+\)/g, '')
      .replace(/drop-shadow\([^)]+\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  enable() {
    this.isEnabled = true;
    this.optimizeExistingContent();
    console.log('RenderOptimizer: Enabled');
  }

  disable() {
    this.isEnabled = false;
    
    // 移除添加的样式
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent.includes('render-optimizer-reduced-motion')) {
        style.remove();
      }
    });

    // 移除CSS类
    document.body.classList.remove('render-optimizer-reduced-motion');

    // 停止观察
    if (this.observer) {
      this.observer.disconnect();
    }

    console.log('RenderOptimizer: Disabled');
  }

  cleanup() {
    this.disable();
    this.optimizedElements.clear();
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.isEnabled = this.settings.renderOptimization?.enabled ?? true;
    
    if (this.isEnabled) {
      this.disable();
      this.enable();
    }
  }
}