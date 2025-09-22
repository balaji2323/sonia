/**
 * Modern Chat Application - UI Enhancements
 * This file adds interactive animations and visual enhancements to the chat application
 * Import this file in your App.js or main component file
 */

class ChatUIEnhancer {
  constructor() {
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEnhancements());
    } else {
      this.setupEnhancements();
    }
  }

  setupEnhancements() {
    this.setupScrollAnimations();
    this.setupHoverEffects();
    this.setupTypingAnimations();
    this.setupParticleEffects();
    this.setupThemeToggle();
    this.setupKeyboardShortcuts();
    this.setupLoadingStates();
    this.setupSoundEffects();
    this.setupGestureSupport();
  }

  // ===== SCROLL ANIMATIONS =====
  setupScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animation = 'slideInUp 0.6s ease-out';
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    // Observe message bubbles
    const observeMessages = () => {
      document.querySelectorAll('.message-bubble').forEach(bubble => {
        if (!bubble.hasAttribute('data-animated')) {
          bubble.style.opacity = '0';
          bubble.style.transform = 'translateY(20px)';
          bubble.setAttribute('data-animated', 'true');
          observer.observe(bubble);
        }
      });
    };

    // Initial observation and periodic checks for new messages
    observeMessages();
    setInterval(observeMessages, 1000);

    // Add CSS for animations
    this.addCSS(`
      @keyframes slideInUp {
        0% {
          opacity: 0;
          transform: translateY(30px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideInRight {
        0% {
          opacity: 0;
          transform: translateX(30px);
        }
        100% {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes bounceIn {
        0%, 20%, 40%, 60%, 80% {
          animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
        }
        0% {
          opacity: 0;
          transform: scale3d(0.3, 0.3, 0.3);
        }
        20% {
          transform: scale3d(1.1, 1.1, 1.1);
        }
        40% {
          transform: scale3d(0.9, 0.9, 0.9);
        }
        60% {
          opacity: 1;
          transform: scale3d(1.03, 1.03, 1.03);
        }
        80% {
          transform: scale3d(0.97, 0.97, 0.97);
        }
        100% {
          opacity: 1;
          transform: scale3d(1, 1, 1);
        }
      }

      .conversation-item {
        animation: slideInRight 0.3s ease-out;
      }

      .message-bubble.new {
        animation: bounceIn 0.6s ease-out;
      }
    `);
  }

  // ===== HOVER EFFECTS =====
  setupHoverEffects() {
    // Add ripple effect to buttons
    const addRippleEffect = (element) => {
      element.addEventListener('click', (e) => {
        const ripple = document.createElement('div');
        ripple.classList.add('ripple');
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          left: ${x}px;
          top: ${y}px;
        `;
        
        element.appendChild(ripple);
        
        setTimeout(() => {
          ripple.remove();
        }, 600);
      });
    };

    // Apply ripple effect to buttons
    const buttons = [
      '.send-button',
      '.new-chat-button',
      '.upload-button',
      '.submit-button',
      '.start-chat-button'
    ];

    buttons.forEach(selector => {
      document.querySelectorAll(selector).forEach(addRippleEffect);
    });

    // Add hover glow effect to conversation items
    const addHoverGlow = () => {
      document.querySelectorAll('.conversation-item').forEach(item => {
        if (!item.hasAttribute('data-hover-enhanced')) {
          item.setAttribute('data-hover-enhanced', 'true');
          
          item.addEventListener('mouseenter', () => {
            item.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.15)';
            item.style.transform = 'translateX(4px) translateY(-2px)';
          });
          
          item.addEventListener('mouseleave', () => {
            item.style.boxShadow = '';
            item.style.transform = '';
          });
        }
      });
    };

    addHoverGlow();
    setInterval(addHoverGlow, 2000);

    this.addCSS(`
      .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      }

      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }

      button {
        position: relative;
        overflow: hidden;
      }

      .conversation-item {
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .message-bubble {
        transition: transform 0.3s ease;
      }

      .message-bubble:hover {
        transform: scale(1.02);
      }
    `);
  }

  // ===== TYPING ANIMATIONS =====
  setupTypingAnimations() {
    // Enhanced typing indicator
    const enhanceTypingIndicator = () => {
      const typingBubbles = document.querySelectorAll('.typing-bubble');
      typingBubbles.forEach(bubble => {
        if (!bubble.hasAttribute('data-enhanced')) {
          bubble.setAttribute('data-enhanced', 'true');
          
          // Add floating animation
          bubble.style.animation = 'float 2s ease-in-out infinite';
        }
      });
    };

    // Monitor for typing indicators
    setInterval(enhanceTypingIndicator, 500);

    this.addCSS(`
      @keyframes float {
        0%, 100% {
          transform: translateY(0px);
        }
        50% {
          transform: translateY(-5px);
        }
      }

      .typing-bubble {
        position: relative;
      }

      .typing-bubble::before {
        content: '';
        position: absolute;
        top: -10px;
        left: 20px;
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-bottom: 8px solid rgba(255, 255, 255, 0.9);
        filter: drop-shadow(0 -2px 4px rgba(0, 0, 0, 0.1));
      }

      .typing-dots span {
        animation: typing 1.4s infinite ease-in-out;
        background: linear-gradient(45deg, #6b7280, #9ca3af);
      }
    `);
  }

  // ===== PARTICLE EFFECTS =====
  setupParticleEffects() {
    // Create floating particles for background
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      
      const size = Math.random() * 4 + 2;
      const left = Math.random() * window.innerWidth;
      const animationDuration = Math.random() * 20 + 10;
      
      particle.style.cssText = `
        position: fixed;
        left: ${left}px;
        bottom: -10px;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.1) 70%, transparent 100%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
        animation: floatUp ${animationDuration}s linear infinite;
      `;
      
      document.body.appendChild(particle);
      
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, animationDuration * 1000);
    };

    // Create particles periodically
    setInterval(createParticle, 3000);

    this.addCSS(`
      @keyframes floatUp {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 0;
        }
        10% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        100% {
          transform: translateY(-100vh) rotate(360deg);
          opacity: 0;
        }
      }
    `);
  }

  // ===== THEME TOGGLE =====
  setupThemeToggle() {
    // Create theme toggle button
    const createThemeToggle = () => {
      const existingToggle = document.querySelector('.theme-toggle');
      if (existingToggle) return;

      const toggle = document.createElement('button');
      toggle.className = 'theme-toggle';
      toggle.innerHTML = '🌙';
      toggle.title = 'Toggle theme';
      
      toggle.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        border: none;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-size: 20px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
        z-index: 1000;
      `;

      let isDark = localStorage.getItem('theme') === 'dark';
      
      const updateTheme = () => {
        if (isDark) {
          document.body.classList.add('dark-theme');
          toggle.innerHTML = '☀️';
          toggle.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)';
        } else {
          document.body.classList.remove('dark-theme');
          toggle.innerHTML = '🌙';
          toggle.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
      };

      toggle.addEventListener('click', () => {
        isDark = !isDark;
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateTheme();
        
        // Add click animation
        toggle.style.transform = 'scale(0.9)';
        setTimeout(() => {
          toggle.style.transform = 'scale(1)';
        }, 150);
      });

      toggle.addEventListener('mouseenter', () => {
        toggle.style.transform = 'scale(1.1)';
        toggle.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
      });

      toggle.addEventListener('mouseleave', () => {
        toggle.style.transform = 'scale(1)';
        toggle.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
      });

      document.body.appendChild(toggle);
      updateTheme();
    };

    setTimeout(createThemeToggle, 1000);

    // Dark theme styles
    this.addCSS(`
      .dark-theme {
        --gray-50: #1f2937;
        --gray-100: #374151;
        --gray-200: #4b5563;
        --gray-800: #f9fafb;
        --gray-900: #ffffff;
      }

      .dark-theme .chat-main {
        background: #111827;
        color: #f9fafb;
      }

      .dark-theme .messages-container {
        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
      }

      .dark-theme .message-text {
        background: #374151;
        color: #f9fafb;
        border-color: #4b5563;
      }

      .dark-theme .message-bubble.user .message-text {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
      }
    `);
  }

  // ===== KEYBOARD SHORTCUTS =====
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter to send message
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const sendButton = document.querySelector('.send-button');
        if (sendButton && !sendButton.disabled) {
          sendButton.click();
        }
      }

      // Escape to close modals
      if (e.key === 'Escape') {
        const closeButtons = document.querySelectorAll('.close-button');
        closeButtons.forEach(button => button.click());
      }

      // Ctrl/Cmd + N for new chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        const newChatButton = document.querySelector('.new-chat-button');
        if (newChatButton) {
          newChatButton.click();
        }
      }
    });

    // Show keyboard shortcuts tooltip
    const showShortcuts = () => {
      if (document.querySelector('.shortcuts-tooltip')) return;

      const tooltip = document.createElement('div');
      tooltip.className = 'shortcuts-tooltip';
      tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px;">Keyboard Shortcuts:</div>
        <div>Ctrl + Enter - Send message</div>
        <div>Ctrl + N - New chat</div>
        <div>Escape - Close modal</div>
      `;

      tooltip.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.4;
        z-index: 1000;
        animation: slideInLeft 0.3s ease-out;
      `;

      document.body.appendChild(tooltip);

      setTimeout(() => {
        tooltip.style.animation = 'slideOutLeft 0.3s ease-in';
        setTimeout(() => tooltip.remove(), 300);
      }, 5000);
    };

    // Show shortcuts after delay
    setTimeout(showShortcuts, 3000);

    this.addCSS(`
      @keyframes slideInLeft {
        0% {
          opacity: 0;
          transform: translateX(-100%);
        }
        100% {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes slideOutLeft {
        0% {
          opacity: 1;
          transform: translateX(0);
        }
        100% {
          opacity: 0;
          transform: translateX(-100%);
        }
      }
    `);
  }

  // ===== LOADING STATES =====
  setupLoadingStates() {
    // Enhanced loading spinner
    const enhanceLoadingStates = () => {
      document.querySelectorAll('.spinner').forEach(spinner => {
        if (!spinner.hasAttribute('data-enhanced')) {
          spinner.setAttribute('data-enhanced', 'true');
          
          // Add pulsing glow effect
          spinner.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.3)';
          spinner.style.filter = 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))';
        }
      });
    };

    // Check for loading states periodically
    setInterval(enhanceLoadingStates, 1000);

    // Add skeleton loading for conversation items
    this.addCSS(`
      .loading-skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
      }

      @keyframes loading {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      .spinner {
        position: relative;
      }

      .spinner::after {
        content: '';
        position: absolute;
        inset: -10px;
        border-radius: 50%;
        background: conic-gradient(from 0deg, transparent, rgba(59, 130, 246, 0.1), transparent);
        animation: spin 2s linear infinite reverse;
      }
    `);
  }

  // ===== SOUND EFFECTS =====
  setupSoundEffects() {
    // Create audio context for sound effects
    let audioContext;
    
    const createTone = (frequency, duration, type = 'sine') => {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };

    // Add sound effects to actions
    const addSoundEffects = () => {
      // Message send sound
      document.querySelectorAll('.send-button').forEach(button => {
        if (!button.hasAttribute('data-sound-enabled')) {
          button.setAttribute('data-sound-enabled', 'true');
          
          button.addEventListener('click', () => {
            createTone(800, 0.1);
            setTimeout(() => createTone(1000, 0.1), 50);
          });
        }
      });

      // New message receive sound
      const messageObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.classList && node.classList.contains('message-bubble')) {
                if (node.classList.contains('assistant')) {
                  createTone(600, 0.2);
                  setTimeout(() => createTone(800, 0.1), 100);
                }
              }
            });
          }
        });
      });

      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messageObserver.observe(messagesContainer, { childList: true, subtree: true });
      }
    };

    setTimeout(addSoundEffects, 2000);
  }

  // ===== GESTURE SUPPORT =====
  setupGestureSupport() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const deltaTime = touchEndTime - touchStartTime;
      
      // Swipe detection
      if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100 && deltaTime < 500) {
        if (deltaX > 0) {
          // Swipe right - open sidebar on mobile
          const sidebar = document.querySelector('.chat-sidebar');
          if (sidebar && window.innerWidth <= 768) {
            sidebar.style.transform = 'translateX(0)';
          }
        } else {
          // Swipe left - close sidebar on mobile
          const sidebar = document.querySelector('.chat-sidebar');
          if (sidebar && window.innerWidth <= 768) {
            sidebar.style.transform = 'translateX(-100%)';
          }
        }
      }

      // Double tap to scroll to top
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 300) {
        const now = Date.now();
        const lastTap = e.target.getAttribute('data-last-tap') || 0;
        
        if (now - lastTap < 300) {
          const messagesContainer = document.querySelector('.messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }
        }
        
        e.target.setAttribute('data-last-tap', now);
      }
    }, { passive: true });

    // Add mobile-specific styles
    this.addCSS(`
      @media (max-width: 768px) {
        .chat-sidebar {
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }

        .chat-sidebar.open {
          transform: translateX(0);
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 5;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }

        .sidebar-overlay.active {
          opacity: 1;
          pointer-events: all;
        }
      }
    `);
  }

  // ===== UTILITY METHODS =====
  addCSS(css) {
    const existingStyle = document.querySelector('#ui-enhancements-style');
    if (existingStyle) {
      existingStyle.textContent += css;
    } else {
      const style = document.createElement('style');
      style.id = 'ui-enhancements-style';
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  // ===== PUBLIC API =====
  enable() {
    document.body.classList.add('ui-enhanced');
    this.setupEnhancements();
  }

  disable() {
    document.body.classList.remove('ui-enhanced');
    const style = document.querySelector('#ui-enhancements-style');
    if (style) style.remove();
  }

  toggleTheme() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
      themeToggle.click();
    }
  }
}

// Initialize the UI enhancer
const uiEnhancer = new ChatUIEnhancer();

// Export for manual control
if (typeof window !== 'undefined') {
  window.ChatUIEnhancer = uiEnhancer;
}

export default uiEnhancer;