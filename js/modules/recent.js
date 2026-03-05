/**
 * Recent Items Module
 * Manages recent items history UI and interactions
 */

import { getRecentItems, clearRecentItems } from '../utils/storage.js';
import { escapeHTML } from '../utils/sanitizer.js';

/**
 * Creates recent items panel UI
 * @param {Function} onItemClick - Callback when recent item is clicked
 * @returns {HTMLElement} Recent items panel
 */
export function createRecentPanel(onItemClick) {
  const panel = document.createElement('div');
  panel.className = 'recent-panel mb-3';
  panel.innerHTML = `
    <div class="card shadow-sm border-0">
      <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h6 class="mb-0">
          <i class="bi bi-clock-history text-info me-2"></i>
          সাম্প্রতিক আইটেম
        </h6>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-link text-danger text-decoration-none p-0" id="clearRecent" title="সব মুছুন">
            <i class="bi bi-trash"></i>
          </button>
          <button class="btn btn-sm btn-link text-decoration-none p-0" id="toggleRecent">
            <i class="bi bi-chevron-down"></i>
          </button>
        </div>
      </div>
      <div class="card-body p-0" id="recentContent" style="display: none;">
        <div id="recentList" class="list-group list-group-flush"></div>
      </div>
    </div>
  `;

  const toggleBtn = panel.querySelector('#toggleRecent');
  const clearBtn = panel.querySelector('#clearRecent');
  const content = panel.querySelector('#recentContent');
  const icon = toggleBtn.querySelector('i');

  toggleBtn.addEventListener('click', () => {
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';

    if (isHidden) {
      renderRecentItems(panel, onItemClick);
    }
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('সব সাম্প্রতিক আইটেম মুছে ফেলবেন?')) {
      clearRecentItems();
      renderRecentItems(panel, onItemClick);
    }
  });

  return panel;
}

/**
 * Renders recent items list
 * @param {HTMLElement} panel - Recent items panel element
 * @param {Function} onItemClick - Callback when item is clicked
 */
export function renderRecentItems(panel, onItemClick) {
  const listContainer = panel.querySelector('#recentList');
  if (!listContainer) return;

  const recent = getRecentItems();

  if (recent.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center text-muted p-3">
        <i class="bi bi-clock-history d-block mb-2" style="font-size: 2rem;"></i>
        <small>কোনো সাম্প্রতিক আইটেম নেই।</small>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = '';

  recent.forEach(item => {
    const listItem = document.createElement('div');
    listItem.className = 'list-group-item list-group-item-action cursor-pointer';
    listItem.style.cursor = 'pointer';

    const sizeText = item.size ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : '';
    const accessedDate = new Date(item.accessedAt);
    const timeAgo = getTimeAgo(accessedDate);

    listItem.innerHTML = `
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <div class="d-flex align-items-center mb-1">
            <i class="bi bi-file-earmark-text me-2 text-primary"></i>
            <strong class="text-truncate">${escapeHTML(item.name)}</strong>
          </div>
          <small class="text-muted d-block text-truncate">${escapeHTML(item.path || '')}</small>
          <div class="d-flex gap-3 mt-1">
            ${sizeText ? `<small class="text-muted"><i class="bi bi-hdd me-1"></i>${sizeText}</small>` : ''}
            <small class="text-muted"><i class="bi bi-clock me-1"></i>${timeAgo}</small>
          </div>
        </div>
      </div>
    `;

    listItem.addEventListener('click', () => {
      if (onItemClick) onItemClick(item);
    });

    listContainer.appendChild(listItem);
  });
}

/**
 * Converts date to relative time string in Bengali
 * @param {Date} date - Date to convert
 * @returns {string} Relative time string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'এইমাত্র';
  if (diffMins < 60) return `${diffMins} মিনিট আগে`;
  if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
  if (diffDays < 7) return `${diffDays} দিন আগে`;

  return date.toLocaleDateString('bn-BD');
}
