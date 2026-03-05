/**
 * Favorites Module
 * Manages favorite items UI and interactions
 */

import { getFavorites, addToFavorites, removeFromFavorites, isFavorite } from '../utils/storage.js';
import { escapeHTML } from '../utils/sanitizer.js';

/**
 * Creates favorites panel UI
 * @param {Function} onItemClick - Callback when favorite item is clicked
 * @returns {HTMLElement} Favorites panel
 */
export function createFavoritesPanel(onItemClick) {
  const panel = document.createElement('div');
  panel.className = 'favorites-panel mb-3';
  panel.innerHTML = `
    <div class="card shadow-sm border-0">
      <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h6 class="mb-0">
          <i class="bi bi-star-fill text-warning me-2"></i>
          প্রিয় আইটেম
        </h6>
        <button class="btn btn-sm btn-link text-decoration-none p-0" id="toggleFavorites">
          <i class="bi bi-chevron-down"></i>
        </button>
      </div>
      <div class="card-body p-0" id="favoritesContent" style="display: none;">
        <div id="favoritesList" class="list-group list-group-flush"></div>
      </div>
    </div>
  `;

  const toggleBtn = panel.querySelector('#toggleFavorites');
  const content = panel.querySelector('#favoritesContent');
  const icon = toggleBtn.querySelector('i');

  toggleBtn.addEventListener('click', () => {
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';

    if (isHidden) {
      renderFavorites(panel, onItemClick);
    }
  });

  return panel;
}

/**
 * Renders favorites list
 * @param {HTMLElement} panel - Favorites panel element
 * @param {Function} onItemClick - Callback when item is clicked
 */
export function renderFavorites(panel, onItemClick) {
  const listContainer = panel.querySelector('#favoritesList');
  if (!listContainer) return;

  const favorites = getFavorites();

  if (favorites.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center text-muted p-3">
        <i class="bi bi-star d-block mb-2" style="font-size: 2rem;"></i>
        <small>এখনো কোনো প্রিয় আইটেম যোগ করা হয়নি।</small>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = '';

  favorites.forEach(item => {
    const listItem = document.createElement('div');
    listItem.className = 'list-group-item d-flex justify-content-between align-items-start';

    const sizeText = item.size ? `${(item.size / (1024 * 1024)).toFixed(2)} MB` : '';

    listItem.innerHTML = `
      <div class="flex-grow-1 cursor-pointer" data-id="${item.id}">
        <div class="d-flex align-items-center mb-1">
          <i class="bi bi-file-earmark-text me-2 text-primary"></i>
          <strong class="text-truncate">${escapeHTML(item.name)}</strong>
        </div>
        <small class="text-muted d-block text-truncate">${escapeHTML(item.path || '')}</small>
        ${sizeText ? `<small class="text-muted">${sizeText}</small>` : ''}
      </div>
      <button class="btn btn-sm btn-link text-danger remove-favorite" data-id="${item.id}" title="প্রিয় থেকে সরান">
        <i class="bi bi-x-lg"></i>
      </button>
    `;

    const clickableArea = listItem.querySelector('[data-id]');
    clickableArea.style.cursor = 'pointer';
    clickableArea.addEventListener('click', () => {
      if (onItemClick) onItemClick(item);
    });

    const removeBtn = listItem.querySelector('.remove-favorite');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromFavorites(item.id);
      renderFavorites(panel, onItemClick);
    });

    listContainer.appendChild(listItem);
  });
}

/**
 * Creates favorite toggle button for file items
 * @param {string} fileId - File ID
 * @param {Object} fileData - File data object
 * @param {Function} onToggle - Callback when favorite is toggled
 * @returns {HTMLElement} Favorite button
 */
export function createFavoriteButton(fileId, fileData, onToggle) {
  const isFav = isFavorite(fileId);

  const btn = document.createElement('button');
  btn.className = `btn btn-${isFav ? 'warning' : 'outline-warning'} btn-sm`;
  btn.innerHTML = `<i class="bi bi-star${isFav ? '-fill' : ''}"></i>`;
  btn.title = isFav ? 'প্রিয় থেকে সরান' : 'প্রিয়তে যোগ করুন';

  btn.addEventListener('click', (e) => {
    e.stopPropagation();

    if (isFavorite(fileId)) {
      removeFromFavorites(fileId);
      btn.className = 'btn btn-outline-warning btn-sm';
      btn.innerHTML = '<i class="bi bi-star"></i>';
      btn.title = 'প্রিয়তে যোগ করুন';
    } else {
      addToFavorites(fileData);
      btn.className = 'btn btn-warning btn-sm';
      btn.innerHTML = '<i class="bi bi-star-fill"></i>';
      btn.title = 'প্রিয় থেকে সরান';
    }

    if (onToggle) onToggle();
  });

  return btn;
}
