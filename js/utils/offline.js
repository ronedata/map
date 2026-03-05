/**
 * Offline Detection Utility Module
 * Monitors network connectivity and notifies users
 */

/**
 * Checks if the browser is currently online
 * @returns {boolean} True if online
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Shows offline notification to user
 * @param {HTMLElement} container - Container element for notification
 */
export function showOfflineNotification(container) {
  if (!container) return;

  const notification = document.createElement('div');
  notification.id = 'offline-notification';
  notification.className = 'alert alert-warning alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg';
  notification.style.zIndex = '9999';
  notification.innerHTML = `
    <i class="bi bi-wifi-off me-2"></i>
    <strong>ইন্টারনেট সংযোগ নেই</strong>
    <p class="mb-0 small mt-1">অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন।</p>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  // Remove existing notification if any
  const existing = document.getElementById('offline-notification');
  if (existing) existing.remove();

  document.body.appendChild(notification);
}

/**
 * Shows online notification to user
 * @param {HTMLElement} container - Container element for notification
 */
export function showOnlineNotification(container) {
  const offlineNotification = document.getElementById('offline-notification');
  if (offlineNotification) {
    offlineNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow-lg';
  notification.style.zIndex = '9999';
  notification.innerHTML = `
    <i class="bi bi-wifi me-2"></i>
    <strong>ইন্টারনেট সংযোগ পুনরুদ্ধার হয়েছে</strong>
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.appendChild(notification);

  // Auto-dismiss after 3 seconds
  setTimeout(() => notification.remove(), 3000);
}

/**
 * Initializes offline/online event listeners
 * @param {Function} onOffline - Callback when going offline
 * @param {Function} onOnline - Callback when going online
 */
export function initOfflineDetection(onOffline, onOnline) {
  window.addEventListener('offline', () => {
    showOfflineNotification();
    if (onOffline) onOffline();
  });

  window.addEventListener('online', () => {
    showOnlineNotification();
    if (onOnline) onOnline();
  });

  // Check initial state
  if (!isOnline() && onOffline) {
    onOffline();
  }
}
