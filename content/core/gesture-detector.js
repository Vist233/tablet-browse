/**
 * TabletBrowse Pro - 手势检测器
 * 检测和识别各种触摸手势，特别是三指滑动手势
 */

class GestureDetector {
  constructor() {
    this.settings = {};
    this.touches = new Map();
    this.gestureStartTime = 0;
    this.gestureStartPositions = [];
    this.isGestureActive = false;
    this.gestureThreshold = 50; // 最小手势距离
    this.maxGestureTime = 1000; // 最大手势时间 (ms)
    this.threeFingerThreshold = 3;
    
    this.init();
  }

  async init() {
    this.settings = await getSettings();
    this.bindEvents();
  }

  bindEvents() {
    // 触摸事件监听
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    document.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });

    // 设置更新监听
    document.addEventListener('settingsUpdated', (event) => {
      this.settings = event.detail.settings;
    });
  }

  handleTouchStart(event) {
    if (!this.settings.enabled || !this.settings.gestureNavEnabled) return;

    // 记录所有触摸点
    Array.from(event.touches).forEach(touch => {
      this.touches.set(touch.identifier, {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now()
      });
    });

    // 检查是否为三指手势
    if (event.touches.length === this.threeFingerThreshold) {
      this.startThreeFingerGesture(event);
    }
  }

  handleTouchMove(event) {
    if (!this.settings.enabled || !this.settings.gestureNavEnabled) return;

    // 更新触摸点位置
    Array.from(event.touches).forEach(touch => {
      const touchData = this.touches.get(touch.identifier);
      if (touchData) {
        touchData.currentX = touch.clientX;
        touchData.currentY = touch.clientY;
      }
    });

    // 如果是三指手势，检测滑动方向
    if (this.isGestureActive && event.touches.length === this.threeFingerThreshold) {
      this.updateThreeFingerGesture(event);
    }
  }

  handleTouchEnd(event) {
    if (!this.settings.enabled || !this.settings.gestureNavEnabled) return;

    // 移除结束的触摸点
    Array.from(event.changedTouches).forEach(touch => {
      this.touches.delete(touch.identifier);
    });

    // 如果三指手势结束
    if (this.isGestureActive && event.touches.length < this.threeFingerThreshold) {
      this.endThreeFingerGesture();
    }
  }

  handleTouchCancel(event) {
    if (!this.settings.enabled || !this.settings.gestureNavEnabled) return;

    // 清理所有触摸状态
    this.touches.clear();
    this.endThreeFingerGesture();
  }

  startThreeFingerGesture(event) {
    this.isGestureActive = true;
    this.gestureStartTime = Date.now();
    this.gestureStartPositions = [];

    // 记录三个手指的起始位置
    Array.from(event.touches).forEach(touch => {
      this.gestureStartPositions.push({
        x: touch.clientX,
        y: touch.clientY
      });
    });

    // 添加视觉反馈
    this.showGestureIndicator();

    // 阻止默认行为
    event.preventDefault();
  }

  updateThreeFingerGesture(event) {
    if (!this.isGestureActive) return;

    const currentTime = Date.now();
    const gestureTime = currentTime - this.gestureStartTime;

    // 检查手势是否超时
    if (gestureTime > this.maxGestureTime) {
      this.endThreeFingerGesture();
      return;
    }

    // 计算平均移动距离和方向
    const movements = this.calculateAverageMovement(event.touches);
    
    if (movements.distance > this.gestureThreshold) {
      // 确定手势方向
      const direction = this.determineGestureDirection(movements);
      
      if (direction) {
        this.executeGesture(direction);
        this.endThreeFingerGesture();
      }
    }

    // 更新视觉指示器
    this.updateGestureIndicator(movements);
  }

  calculateAverageMovement(touches) {
    let totalDeltaX = 0;
    let totalDeltaY = 0;
    let validTouches = 0;

    Array.from(touches).forEach((touch, index) => {
      if (index < this.gestureStartPositions.length) {
        const startPos = this.gestureStartPositions[index];
        const deltaX = touch.clientX - startPos.x;
        const deltaY = touch.clientY - startPos.y;
        
        totalDeltaX += deltaX;
        totalDeltaY += deltaY;
        validTouches++;
      }
    });

    if (validTouches === 0) return { deltaX: 0, deltaY: 0, distance: 0 };

    const avgDeltaX = totalDeltaX / validTouches;
    const avgDeltaY = totalDeltaY / validTouches;
    const distance = Math.sqrt(avgDeltaX * avgDeltaX + avgDeltaY * avgDeltaY);

    return {
      deltaX: avgDeltaX,
      deltaY: avgDeltaY,
      distance: distance
    };
  }

  determineGestureDirection(movements) {
    const { deltaX, deltaY, distance } = movements;
    
    // 确保有足够的移动距离
    if (distance < this.gestureThreshold) return null;

    // 计算角度
    const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * 180 / Math.PI;
    
    // 主要是水平移动（角度小于30度）
    if (angle < 30) {
      if (deltaX > 0) {
        return GESTURES.THREE_FINGER_SWIPE_RIGHT;
      } else {
        return GESTURES.THREE_FINGER_SWIPE_LEFT;
      }
    }
    
    return null; // 不是有效的水平滑动
  }

  executeGesture(gestureType) {
    // 触发手势事件
    const gestureEvent = createCustomEvent(EVENTS.GESTURE_DETECTED, {
      type: gestureType,
      timestamp: Date.now()
    });
    
    document.dispatchEvent(gestureEvent);

    // 执行对应的动作
    switch (gestureType) {
      case GESTURES.THREE_FINGER_SWIPE_LEFT:
        this.switchTab('left');
        break;
      case GESTURES.THREE_FINGER_SWIPE_RIGHT:
        this.switchTab('right');
        break;
    }

    // 显示手势反馈
    this.showGestureFeedback(gestureType);
  }

  switchTab(direction) {
    // 发送消息给background script执行标签页切换
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'switchTab',
        direction: direction
      });
    } else {
      console.warn('TabletBrowse Pro: Tab switching not available outside extension environment');
      // 在测试环境中显示提示
      this.showTabSwitchFeedback(direction, false);
    }
  }

  showTabSwitchFeedback(direction, success = true) {
    const feedback = document.createElement('div');
    feedback.className = 'tb-gesture-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${success ? 'rgba(0, 200, 0, 0.9)' : 'rgba(255, 165, 0, 0.9)'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      z-index: ${Z_INDEX.SUPER_MENU + 1};
      animation: gestureSuccess 1s ease-out forwards;
      pointer-events: none;
    `;

    const directionText = direction === 'left' ? '上一个' : '下一个';
    feedback.textContent = success ?
      `切换到${directionText}标签页` :
      `手势识别成功：${directionText}标签页（测试模式）`;

    document.body.appendChild(feedback);

    setTimeout(() => {
      feedback.remove();
    }, 1000);
  }

  showGestureIndicator() {
    // 创建手势指示器
    this.gestureIndicator = document.createElement('div');
    this.gestureIndicator.className = 'tb-gesture-indicator';
    this.gestureIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 123, 255, 0.9);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      z-index: ${Z_INDEX.SUPER_MENU};
      animation: tbFadeIn 0.2s ease;
      pointer-events: none;
    `;
    this.gestureIndicator.textContent = '三指滑动切换标签页';
    
    document.body.appendChild(this.gestureIndicator);
  }

  updateGestureIndicator(movements) {
    if (!this.gestureIndicator) return;

    const { deltaX, distance } = movements;
    const progress = Math.min(distance / this.gestureThreshold, 1);
    
    // 更新指示器内容和样式
    if (progress > 0.5) {
      const direction = deltaX > 0 ? '右' : '左';
      this.gestureIndicator.textContent = `向${direction}切换标签页`;
      this.gestureIndicator.style.background = `rgba(0, 200, 0, ${0.7 + progress * 0.3})`;
    } else {
      this.gestureIndicator.textContent = '继续滑动...';
      this.gestureIndicator.style.background = `rgba(0, 123, 255, ${0.7 + progress * 0.3})`;
    }
  }

  showGestureFeedback(gestureType) {
    const feedback = document.createElement('div');
    feedback.className = 'tb-gesture-feedback';
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 200, 0, 0.9);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      z-index: ${Z_INDEX.SUPER_MENU + 1};
      animation: gestureSuccess 1s ease-out forwards;
      pointer-events: none;
    `;
    
    const direction = gestureType === GESTURES.THREE_FINGER_SWIPE_LEFT ? '上一个' : '下一个';
    feedback.textContent = `切换到${direction}标签页`;
    
    document.body.appendChild(feedback);
    
    setTimeout(() => {
      feedback.remove();
    }, 1000);
  }

  endThreeFingerGesture() {
    this.isGestureActive = false;
    this.gestureStartTime = 0;
    this.gestureStartPositions = [];

    // 清理手势指示器
    if (this.gestureIndicator) {
      this.gestureIndicator.remove();
      this.gestureIndicator = null;
    }
  }

  // 公共方法：检查当前是否有活跃的手势
  isGestureInProgress() {
    return this.isGestureActive;
  }

  // 公共方法：强制结束所有手势
  cancelAllGestures() {
    this.touches.clear();
    this.endThreeFingerGesture();
  }
}

// 添加手势相关的CSS动画
addStyles(`
@keyframes gestureSuccess {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0;
  }
  20% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}

.tb-gesture-indicator {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.tb-gesture-feedback {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}
`);

// 全局手势检测器实例
window.tabletBrowseGestureDetector = null;
