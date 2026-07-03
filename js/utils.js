// js/utils.js
import { t } from './i18n.js';

// ========== Dates ==========
export function formatDate(date, format = 'DD/MM/YYYY') {
  const d = new Date(date);
  if (isNaN(d)) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year)
    .replace('HH', hours)
    .replace('mm', minutes);
}

export function getToday() {
  return new Date().toISOString().split('T')[0];
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isWeekend(date) {
  const day = new Date(date).getDay();
  return day === 5 || day === 6; // Friday and Saturday in Algeria
}

// ========== Currency ==========
export function formatCurrency(amount, currency = 'DZD') {
  return new Intl.NumberFormat('ar-DZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(num) {
  return new Intl.NumberFormat('ar-DZ').format(num);
}

// ========== Local Storage ==========
export const storage = {
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },
  
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },
  
  remove(key) {
    localStorage.removeItem(key);
  },
  
  clear() {
    localStorage.clear();
  }
};

// ========== Notifications ==========
export function showToast(message, type = 'info', duration = 3000) {
  const existing = document.querySelector('.toast-container');
  if (!existing) {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const container = document.querySelector('.toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${getToastIcon(type)}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  requestAnimationFrame(() => toast.classList.add('show'));
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function getToastIcon(type) {
  const icons = {
    'success': '✓',
    'error': '✕',
    'warning': '!',
    'info': 'ℹ'
  };
  return icons[type] || 'ℹ';
}

export function showConfirm(message, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  overlay.innerHTML = `
    <div class="confirm-modal">
      <p>${message}</p>
      <div class="confirm-actions">
        <button class="btn btn-secondary">${t('common.cancel')}</button>
        <button class="btn btn-danger">${t('common.confirm')}</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const buttons = overlay.querySelectorAll('.btn');
  
  buttons[0].onclick = () => {
    overlay.remove();
    onCancel?.();
  };
  
  buttons[1].onclick = () => {
    overlay.remove();
    onConfirm?.();
  };
  
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onCancel?.();
    }
  };
}

// ========== Loading ==========
export function showLoading() {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="spinner"></div><span>' + t('common.loading') + '</span>';
  document.body.appendChild(overlay);
}

export function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
}

// ========== PWA ==========
export function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW registration failed:', err));
  }
  
  // Install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    deferredPrompt = e;
    // Can show install button here
  });
  
  return {
    install: async () => {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return outcome === 'accepted';
    }
  };
}

// ========== Offline Detection ==========
export function initOfflineDetection() {
  const updateStatus = () => {
    const isOnline = navigator.onLine;
    document.body.classList.toggle('offline', !isOnline);
    
    if (!isOnline) {
      showToast(t('common.offline'), 'warning', 5000);
    }
  };
  
  window.addEventListener('online', () => {
    showToast(t('common.online'), 'success');
    document.body.classList.remove('offline');
  });
  
  window.addEventListener('offline', updateStatus);
  updateStatus();
}

// ========== Audio ==========
export function speak(text, lang = 'ar-SA', rate = 0.9, pitch = 1) {
  if (!window.speechSynthesis) return;
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;
  
  window.speechSynthesis.speak(utterance);
}

export function playBeep() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

// ========== QR Code Generation ==========
export function generateQRCode(text, size = 200) {
  // Using QR Server API (free, no library needed)
  const encodedText = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}`;
}

// ========== Copy to Clipboard ==========
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('تم النسخ', 'success');
    return true;
  } catch (err) {
    console.error('Copy failed:', err);
    showToast('فشل النسخ', 'error');
    return false;
  }
}

// ========== UUID Generator ==========
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ========== Phone Number Validation ==========
export function validateAlgerianPhone(phone) {
  const pattern = /^(\+213|0)[5-7]\d{8}$/;
  return pattern.test(phone);
}

// ========== Email Validation ==========
export function validateEmail(email) {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

// ========== Debounce ==========
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========== Throttle ==========
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
