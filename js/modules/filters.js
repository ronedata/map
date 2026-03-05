/**
 * Filters Module
 * Provides filtering functionality for files by type and size
 */

/**
 * Creates filter UI component
 * @param {Function} onFilterChange - Callback when filter changes
 * @returns {HTMLElement} Filter component
 */
export function createFilterUI(onFilterChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'filter-wrapper mb-3';
  wrapper.innerHTML = `
    <div class="card shadow-sm border-0">
      <div class="card-header bg-white d-flex justify-content-between align-items-center">
        <h6 class="mb-0">
          <i class="bi bi-funnel text-secondary me-2"></i>
          ফিল্টার
        </h6>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-link text-decoration-none p-0" id="resetFilters" title="রিসেট করুন">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
          <button class="btn btn-sm btn-link text-decoration-none p-0" id="toggleFilters">
            <i class="bi bi-chevron-down"></i>
          </button>
        </div>
      </div>
      <div class="card-body" id="filterContent" style="display: none;">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label small fw-bold">ফাইল টাইপ</label>
            <select class="form-select form-select-sm" id="filterFileType">
              <option value="">সব ফাইল</option>
              <option value="image">ছবি</option>
              <option value="pdf">PDF</option>
              <option value="document">ডকুমেন্ট</option>
              <option value="other">অন্যান্য</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label small fw-bold">ফাইল সাইজ</label>
            <select class="form-select form-select-sm" id="filterFileSize">
              <option value="">সব সাইজ</option>
              <option value="small">ছোট (&lt; 1 MB)</option>
              <option value="medium">মাঝারি (1-5 MB)</option>
              <option value="large">বড় (&gt; 5 MB)</option>
            </select>
          </div>
        </div>
        <div class="mt-3">
          <small class="text-muted" id="filterStatus">ফিল্টার সক্রিয় নেই</small>
        </div>
      </div>
    </div>
  `;

  const toggleBtn = wrapper.querySelector('#toggleFilters');
  const resetBtn = wrapper.querySelector('#resetFilters');
  const content = wrapper.querySelector('#filterContent');
  const icon = toggleBtn.querySelector('i');
  const typeSelect = wrapper.querySelector('#filterFileType');
  const sizeSelect = wrapper.querySelector('#filterFileSize');
  const statusText = wrapper.querySelector('#filterStatus');

  toggleBtn.addEventListener('click', () => {
    const isHidden = content.style.display === 'none';
    content.style.display = isHidden ? 'block' : 'none';
    icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
  });

  const updateFilters = () => {
    const filters = {
      type: typeSelect.value,
      size: sizeSelect.value
    };

    // Update status text
    const activeFilters = [];
    if (filters.type) activeFilters.push('টাইপ');
    if (filters.size) activeFilters.push('সাইজ');

    if (activeFilters.length > 0) {
      statusText.textContent = `সক্রিয় ফিল্টার: ${activeFilters.join(', ')}`;
      statusText.className = 'text-primary small';
    } else {
      statusText.textContent = 'ফিল্টার সক্রিয় নেই';
      statusText.className = 'text-muted small';
    }

    if (onFilterChange) onFilterChange(filters);
  };

  typeSelect.addEventListener('change', updateFilters);
  sizeSelect.addEventListener('change', updateFilters);

  resetBtn.addEventListener('click', () => {
    typeSelect.value = '';
    sizeSelect.value = '';
    updateFilters();
  });

  return wrapper;
}

/**
 * Filters files based on criteria
 * @param {Array} files - Array of file objects
 * @param {Object} filters - Filter criteria
 * @param {string} filters.type - File type filter
 * @param {string} filters.size - File size filter
 * @returns {Array} Filtered files
 */
export function filterFiles(files, filters) {
  if (!files || files.length === 0) return [];

  let filtered = [...files];

  // Filter by type
  if (filters.type) {
    filtered = filtered.filter(file => {
      const mimeType = file.mimeType || '';

      switch (filters.type) {
        case 'image':
          return mimeType.startsWith('image/');
        case 'pdf':
          return mimeType === 'application/pdf';
        case 'document':
          return (
            mimeType.includes('document') ||
            mimeType.includes('word') ||
            mimeType.includes('text')
          );
        case 'other':
          return !mimeType.startsWith('image/') && mimeType !== 'application/pdf';
        default:
          return true;
      }
    });
  }

  // Filter by size
  if (filters.size && filtered.length > 0) {
    filtered = filtered.filter(file => {
      if (!file.size) return true;

      const sizeInMB = file.size / (1024 * 1024);

      switch (filters.size) {
        case 'small':
          return sizeInMB < 1;
        case 'medium':
          return sizeInMB >= 1 && sizeInMB <= 5;
        case 'large':
          return sizeInMB > 5;
        default:
          return true;
      }
    });
  }

  return filtered;
}

/**
 * Gets filter summary text
 * @param {Array} originalFiles - Original files array
 * @param {Array} filteredFiles - Filtered files array
 * @param {Object} filters - Active filters
 * @returns {string} Summary text
 */
export function getFilterSummary(originalFiles, filteredFiles, filters) {
  const hasFilters = filters.type || filters.size;

  if (!hasFilters) {
    return `মোট ${originalFiles.length}টি ফাইল`;
  }

  return `${filteredFiles.length}টি ফাইল দেখানো হচ্ছে (মোট ${originalFiles.length}টি থেকে)`;
}
