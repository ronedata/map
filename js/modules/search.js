/**
 * Search Module
 * Provides search functionality across loaded data
 */

import { escapeHTML } from '../utils/sanitizer.js';

/**
 * Searches through districts, upazilas, and mouzas
 * @param {Object} divisionData - The loaded division data
 * @param {string} query - Search query
 * @returns {Array} Array of search results
 */
export function searchInData(divisionData, query) {
  if (!divisionData || !query) return [];

  const results = [];
  const normalizedQuery = query.toLowerCase().trim();

  if (!divisionData.districts) return results;

  // Search through districts
  divisionData.districts.forEach(district => {
    // Match district name
    if (district.name.toLowerCase().includes(normalizedQuery)) {
      results.push({
        type: 'district',
        name: district.name,
        path: [district.name],
        data: district
      });
    }

    // Search through upazilas
    if (district.upazilas) {
      district.upazilas.forEach(upazila => {
        if (upazila.name.toLowerCase().includes(normalizedQuery)) {
          results.push({
            type: 'upazila',
            name: upazila.name,
            path: [district.name, upazila.name],
            data: upazila
          });
        }

        // Search through survey types and mouzas
        if (upazila.survey_types) {
          upazila.survey_types.forEach(surveyType => {
            if (surveyType.mouzas) {
              surveyType.mouzas.forEach(mouza => {
                if (mouza.name.toLowerCase().includes(normalizedQuery)) {
                  results.push({
                    type: 'mouza',
                    name: mouza.name,
                    path: [district.name, upazila.name, surveyType.name, mouza.name],
                    mimeType: mouza.mimeType,
                    size: mouza.size,
                    id: mouza.id,
                    data: mouza
                  });
                }
              });
            }
          });
        }
      });
    }
  });

  return results;
}

/**
 * Creates search UI component
 * @param {Function} onSearch - Callback when search is performed
 * @returns {HTMLElement} Search component
 */
export function createSearchUI(onSearch) {
  const wrapper = document.createElement('div');
  wrapper.className = 'search-wrapper mb-3';
  wrapper.innerHTML = `
    <div class="input-group input-group-lg">
      <span class="input-group-text bg-white border-end-0">
        <i class="bi bi-search text-muted"></i>
      </span>
      <input
        type="text"
        class="form-control border-start-0 ps-0"
        id="searchInput"
        placeholder="জেলা, উপজেলা বা মৌজা খুঁজুন..."
        autocomplete="off"
      >
      <button class="btn btn-outline-secondary" type="button" id="clearSearch" style="display: none;">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div id="searchResults" class="search-results mt-2" style="display: none;"></div>
  `;

  const input = wrapper.querySelector('#searchInput');
  const clearBtn = wrapper.querySelector('#clearSearch');
  const resultsContainer = wrapper.querySelector('#searchResults');

  let searchTimeout;

  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    // Show/hide clear button
    clearBtn.style.display = query ? 'block' : 'none';

    // Debounce search
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (query.length >= 2) {
        onSearch(query, resultsContainer);
      } else {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
      }
    }, 300);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    resultsContainer.style.display = 'none';
    resultsContainer.innerHTML = '';
    input.focus();
  });

  return wrapper;
}

/**
 * Renders search results
 * @param {Array} results - Search results
 * @param {HTMLElement} container - Container element
 * @param {Function} onResultClick - Callback when result is clicked
 */
export function renderSearchResults(results, container, onResultClick) {
  if (!container) return;

  if (!results || results.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info mb-0">
        <i class="bi bi-info-circle me-2"></i>
        কোনো ফলাফল পাওয়া যায়নি।
      </div>
    `;
    container.style.display = 'block';
    return;
  }

  const list = document.createElement('div');
  list.className = 'list-group shadow-sm';

  results.forEach(result => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';

    const typeIcons = {
      district: 'bi-geo-alt',
      upazila: 'bi-building',
      mouza: 'bi-file-earmark-text'
    };

    const typeBadges = {
      district: 'জেলা',
      upazila: 'উপজেলা',
      mouza: 'মৌজা'
    };

    const icon = typeIcons[result.type] || 'bi-file';
    const badge = typeBadges[result.type] || result.type;

    item.innerHTML = `
      <div class="flex-grow-1">
        <div class="d-flex align-items-center mb-1">
          <i class="bi ${icon} me-2 text-primary"></i>
          <strong>${escapeHTML(result.name)}</strong>
        </div>
        <small class="text-muted">
          <i class="bi bi-arrow-right me-1"></i>
          ${result.path.map(p => escapeHTML(p)).join(' → ')}
        </small>
      </div>
      <span class="badge bg-primary bg-opacity-10 text-primary">${badge}</span>
    `;

    item.addEventListener('click', () => {
      onResultClick(result);
    });

    list.appendChild(item);
  });

  container.innerHTML = '';
  container.appendChild(list);
  container.style.display = 'block';
}

/**
 * Highlights search query in text
 * @param {string} text - Text to highlight
 * @param {string} query - Query to highlight
 * @returns {string} HTML with highlighted text
 */
export function highlightQuery(text, query) {
  if (!query) return escapeHTML(text);

  const escapedText = escapeHTML(text);
  const escapedQuery = escapeHTML(query);
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  return escapedText.replace(regex, '<mark>$1</mark>');
}
