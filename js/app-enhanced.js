/**
 * Enhanced Map Explorer Application
 * With modular architecture, search, favorites, recent items, and filters
 */

import { sanitizeHTML, sanitizeFileName, escapeHTML } from './utils/sanitizer.js';
import { retryWithBackoff } from './utils/retry.js';
import { initOfflineDetection, isOnline, showOfflineNotification } from './utils/offline.js';
import { addToRecent } from './utils/storage.js';
import { searchInData, createSearchUI, renderSearchResults } from './modules/search.js';
import { createFavoritesPanel, renderFavorites, createFavoriteButton } from './modules/favorites.js';
import { createRecentPanel, renderRecentItems } from './modules/recent.js';
import { createFilterUI, filterFiles, getFilterSummary } from './modules/filters.js';

const App = {
  // ==========================================
  // CONFIGURATION
  // ==========================================
  Config: {
    API_BASE: 'https://script.google.com/macros/s/AKfycbzlLhCx-_sL_TnV_wBOPicAYcwcqg3jTgawC_eysmTzVkvKZ6jl69h5I0JK3csRaL0j/exec',
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
  },

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  State: {
    localData: null,
    currentDivision: null,
    currentFiles: [],
    activeFilters: { type: '', size: '' },
    isOffline: false,
    offlineDetectionInitialized: false,
    skipFilterOnce: false
  },

  // ==========================================
  // DOM ELEMENTS CACHE
  // ==========================================
  DOM: {
    status: document.getElementById('status'),
    dropdownContainer: document.getElementById('dropdownContainer'),
    fileContainer: document.getElementById('fileContainer'),
    progressContainer: document.getElementById('progressContainer'),
    downloadContainer: document.getElementById('downloadContainer'),
    resetBtn: document.getElementById('resetBtn'),
    featuresContainer: document.getElementById('featuresContainer')
  },

  // ==========================================
  // UTILITIES
  // ==========================================
  Utils: {
    /**
     * Sets status message
     * @param {string} txt - Status text
     * @param {boolean} isLoading - Show loading spinner
     */
    setStatus(txt, isLoading = false) {
      const { status } = App.DOM;
      if (isLoading) {
        status.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${escapeHTML(txt)}`;
      } else {
        status.innerHTML = escapeHTML(txt);
      }
    },

    /**
     * Shows progress bar
     * @param {boolean} show - Show/hide progress
     * @param {string} text - Progress text
     * @param {number|null} percentage - Progress percentage
     */
    showProgress(show, text = 'ডাউনলোড হচ্ছে...', percentage = null) {
      const { progressContainer } = App.DOM;
      if (show) {
        const isDeterminate = percentage !== null && percentage >= 0;
        const barClass = isDeterminate ? 'progress-bar' : 'progress-bar progress-bar-striped progress-bar-animated';
        const width = isDeterminate ? percentage : 100;
        progressContainer.style.display = 'block';
        progressContainer.innerHTML = `
          <div class="progress mt-2" role="progressbar" aria-label="Loading data" aria-valuenow="${width}" aria-valuemin="0" aria-valuemax="100">
            <div class="${barClass}" style="width: ${width}%">${escapeHTML(text)}</div>
          </div>`;
      } else {
        progressContainer.style.display = 'none';
        progressContainer.innerHTML = '';
      }
    },

    /**
     * Toggles dropdown enabled/disabled state
     * @param {boolean} disabled - Disabled state
     */
    toggleDropdowns(disabled) {
      const dropdowns = App.DOM.dropdownContainer.querySelectorAll('select');
      dropdowns.forEach(select => {
        if (select.choices) {
          if (disabled) select.choices.disable();
          else select.choices.enable();
        } else {
          select.disabled = disabled;
        }
      });
    },

    /**
     * Gets Bootstrap icon class for MIME type
     * @param {string} mimeType - MIME type
     * @returns {string} Icon class
     */
    getIconForMimeType(mimeType) {
      if (!mimeType) return 'bi bi-file-earmark-text';
      if (mimeType.startsWith('image/')) return 'bi bi-file-earmark-image';
      if (mimeType.startsWith('video/')) return 'bi bi-file-earmark-play';
      if (mimeType.startsWith('audio/')) return 'bi bi-file-earmark-music';
      if (mimeType === 'application/pdf') return 'bi bi-file-earmark-pdf';
      return 'bi bi-file-earmark-text';
    },

    /**
     * Shows error message with retry option
     * @param {string} message - Error message
     * @param {Function} retryFn - Retry function
     */
    showError(message, retryFn = null) {
      const { status } = App.DOM;
      const retryBtn = retryFn ? `
        <button class="btn btn-sm btn-primary mt-2" id="retryBtn">
          <i class="bi bi-arrow-clockwise me-1"></i> আবার চেষ্টা করুন
        </button>
      ` : '';

      status.innerHTML = `
        <div class="alert alert-danger d-flex align-items-start mt-3" role="alert">
          <i class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2 mt-1"></i>
          <div class="flex-grow-1">
            <strong>ত্রুটি:</strong> ${escapeHTML(message)}
            ${retryBtn}
          </div>
        </div>
      `;

      if (retryFn) {
        const retryButton = status.querySelector('#retryBtn');
        if (retryButton) {
          retryButton.addEventListener('click', retryFn);
        }
      }
    },

    /**
     * Wait helper
     * @param {number} ms - Delay in milliseconds
     * @returns {Promise<void>}
     */
    sleep(ms = 50) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  },

  // ==========================================
  // API SERVICES
  // ==========================================
  API: {
    /**
     * Downloads file via proxy with retry logic
     * @param {string} fileId - Google Drive file ID
     * @param {string} fileName - File name
     */
    async downloadViaProxy(fileId, fileName) {
      const url = new URL(App.Config.API_BASE);
      url.searchParams.set('action', 'download');
      url.searchParams.set('fileId', fileId);

      await retryWithBackoff(
        async () => {
          const res = await fetch(url.toString());
          if (!res.ok) throw new Error('Proxy failed: ' + res.status);

          const json = await res.json();
          if (!json.success || !json.data || !json.data.base64) {
            throw new Error('Invalid proxy response');
          }

          const payload = json.data;
          const byteCharacters = atob(payload.base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: payload.mimeType || 'application/octet-stream' });

          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = sanitizeFileName(fileName || payload.fileName);
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(blobUrl);
        },
        {
          maxRetries: App.Config.MAX_RETRY_ATTEMPTS,
          initialDelay: App.Config.RETRY_DELAY,
          onRetry: (attempt, maxAttempts, delay, error) => {
            App.Utils.showProgress(
              true,
              `ডাউনলোড ব্যর্থ হয়েছে। পুনরায় চেষ্টা করা হচ্ছে (${attempt}/${maxAttempts})...`,
              null
            );
          }
        }
      );
    },

    /**
     * Loads division data with retry logic
     * @param {string} divisionName - Division name
     * @returns {Promise<Object>} Division data
     */
    async loadDivisionData(divisionName) {
      return await retryWithBackoff(
        async () => {
          const response = await fetch(`Data/${divisionName}_full_data.json`);
          if (!response.ok) {
            throw new Error(`'${divisionName}' বিভাগের ডেটা ফাইল খুঁজে পাওয়া যায়নি।`);
          }
          return await response.json();
        },
        {
          maxRetries: App.Config.MAX_RETRY_ATTEMPTS,
          initialDelay: App.Config.RETRY_DELAY,
          onRetry: (attempt, maxAttempts) => {
            App.Utils.setStatus(`ডেটা লোড করা হচ্ছে... (চেষ্টা ${attempt}/${maxAttempts})`, true);
          }
        }
      );
    }
  },

  // ==========================================
  // UI RENDERING & LOGIC
  // ==========================================
  UI: {
    /**
     * Initializes feature panels (search, favorites, recent, filters)
     */
    initFeaturePanels() {
      const container = App.DOM.featuresContainer;
      if (!container) return;

      container.innerHTML = '';

      // Search panel
      const searchUI = createSearchUI((query, resultsContainer) => {
        if (!App.State.localData) {
          resultsContainer.innerHTML = `
            <div class="alert alert-warning mb-0">
              <i class="bi bi-info-circle me-2"></i>
              প্রথমে একটি বিভাগ নির্বাচন করুন।
            </div>
          `;
          resultsContainer.style.display = 'block';
          return;
        }

        const results = searchInData(App.State.localData, query);
        renderSearchResults(results, resultsContainer, (result) => App.UI.handleSearchResultClick(result));
      });

      // Favorites panel
      const favoritesPanel = createFavoritesPanel((item) => App.UI.handleFavoriteItemClick(item));

      // Recent panel
      const recentPanel = createRecentPanel((item) => App.UI.handleRecentItemClick(item));

      // Filters panel (shown only when files are displayed)
      const filtersPanel = createFilterUI((filters) => {
        App.State.activeFilters = filters;
        App.UI.applyFiltersToCurrentFiles();
      });

      container.appendChild(searchUI);
      container.appendChild(favoritesPanel);
      container.appendChild(recentPanel);
      container.appendChild(filtersPanel);
    },

    /**
     * Applies active filters to current files
     */
    applyFiltersToCurrentFiles() {
      if (App.State.currentFiles.length === 0) {
        App.Utils.setStatus('মৌজা নির্বাচন করুন।');
        return;
      }

      const filtered = filterFiles(App.State.currentFiles, App.State.activeFilters);
      const summary = getFilterSummary(App.State.currentFiles, filtered, App.State.activeFilters);

      // Update status with filter summary
      App.Utils.setStatus(summary);
      App.UI.renderFiles(filtered, 3);
    },

    /**
     * Handles search result click and navigates the cascade
     * @param {Object} result - Search result item
     */
    async handleSearchResultClick(result) {
      if (!result) return;

      try {
        if (result.type === 'district') {
          await App.UI.navigateToSelection({
            districtId: result.data?.id,
            districtName: result.name
          });
          App.Utils.setStatus(`জেলা নির্বাচন সম্পন্ন: ${result.name}`);
          return;
        }

        if (result.type === 'upazila') {
          await App.UI.navigateToSelection({
            districtName: result.path?.[0],
            upazilaId: result.data?.id,
            upazilaName: result.name
          });
          App.Utils.setStatus(`উপজেলা নির্বাচন সম্পন্ন: ${result.name}`);
          return;
        }

        if (result.type === 'mouza' && result.id) {
          await App.UI.openFileById(result.id);
          App.Utils.setStatus(`মৌজা নির্বাচন সম্পন্ন: ${result.name}`);
        }
      } catch (error) {
        App.Utils.showError(`সার্চ রেজাল্টে যেতে ব্যর্থ হয়েছে: ${error.message}`);
      }
    },

    /**
     * Handles click on favorite item
     * @param {Object} item - Favorite item
     */
    async handleFavoriteItemClick(item) {
      if (!item?.id) {
        App.Utils.showError('প্রিয় আইটেমের তথ্য অসম্পূর্ণ।');
        return;
      }

      try {
        await App.UI.ensureDivisionLoaded(item.path);
        await App.UI.openFileById(item.id);
        App.Utils.setStatus(`প্রিয় আইটেম লোড হয়েছে: ${item.name || 'ফাইল'}`);
      } catch (error) {
        App.Utils.showError(`প্রিয় আইটেম লোড করা যায়নি: ${error.message}`);
      }
    },

    /**
     * Handles click on recent item
     * @param {Object} item - Recent item
     */
    async handleRecentItemClick(item) {
      if (!item?.id) {
        App.Utils.showError('সাম্প্রতিক আইটেমের তথ্য অসম্পূর্ণ।');
        return;
      }

      try {
        await App.UI.ensureDivisionLoaded(item.path);
        await App.UI.openFileById(item.id);
        App.Utils.setStatus(`সাম্প্রতিক আইটেম লোড হয়েছে: ${item.name || 'ফাইল'}`);
      } catch (error) {
        App.Utils.showError(`সাম্প্রতিক আইটেম লোড করা যায়নি: ${error.message}`);
      }
    },

    /**
     * Finds a file path by file id inside current division data
     * @param {string} fileId - File id
     * @returns {Object|null} Path details
     */
    findFilePathById(fileId) {
      if (!App.State.localData?.districts) return null;

      for (const district of App.State.localData.districts) {
        const upazilas = district.upazilas || [];
        for (const upazila of upazilas) {
          const surveyTypes = upazila.survey_types || [];
          for (const surveyType of surveyTypes) {
            const mouzas = surveyType.mouzas || [];
            const file = mouzas.find(mouza => mouza.id === fileId);
            if (file) {
              return { district, upazila, surveyType, file };
            }
          }
        }
      }

      return null;
    },

    /**
     * Waits for a select to be available at dropdown depth
     * @param {number} depth - Zero-based select depth
     * @param {number} timeoutMs - Timeout in ms
     * @returns {Promise<HTMLSelectElement>}
     */
    async waitForSelectAtDepth(depth, timeoutMs = 3000) {
      const started = Date.now();

      while (Date.now() - started < timeoutMs) {
        const selects = Array.from(App.DOM.dropdownContainer.querySelectorAll('select'));
        if (selects[depth]) {
          return selects[depth];
        }
        await App.Utils.sleep(60);
      }

      throw new Error('প্রয়োজনীয় ড্রপডাউন পাওয়া যায়নি।');
    },

    /**
     * Selects an option in dropdown by matcher and triggers change
     * @param {number} depth - Select depth
     * @param {Function} matcher - Matcher function for option
     */
    async selectOptionAtDepth(depth, matcher) {
      const select = await App.UI.waitForSelectAtDepth(depth);
      const option = Array.from(select.options).find(opt => opt.value && matcher(opt));

      if (!option) {
        throw new Error('নির্ধারিত অপশন পাওয়া যায়নি।');
      }

      if (select.choices) {
        select.choices.setChoiceByValue(option.value);
      } else {
        select.value = option.value;
      }

      select.dispatchEvent(new Event('change', { bubbles: true }));
      await App.Utils.sleep(120);
    },

    /**
     * Navigates cascade dropdown selection
     * @param {Object} path - Selection path
     */
    async navigateToSelection(path) {
      if (path.districtId || path.districtName) {
        await App.UI.selectOptionAtDepth(1, opt =>
          (path.districtId && opt.value === path.districtId) ||
          (!path.districtId && opt.textContent.trim() === path.districtName)
        );
      }

      if (path.upazilaId || path.upazilaName) {
        await App.UI.selectOptionAtDepth(2, opt =>
          (path.upazilaId && opt.value === path.upazilaId) ||
          (!path.upazilaId && opt.textContent.trim() === path.upazilaName)
        );
      }

      if (path.surveyTypeId || path.surveyTypeName) {
        await App.UI.selectOptionAtDepth(3, opt =>
          (path.surveyTypeId && opt.value === path.surveyTypeId) ||
          (!path.surveyTypeId && opt.textContent.trim() === path.surveyTypeName)
        );
      }

      if (path.fileId || path.fileName) {
        await App.UI.selectOptionAtDepth(4, opt =>
          (path.fileId && opt.value === path.fileId) ||
          (!path.fileId && opt.textContent.trim() === path.fileName)
        );
      }
    },

    /**
     * Ensures a division is loaded before file navigation
     * @param {string} divisionName - Division name
     */
    async ensureDivisionLoaded(divisionName) {
      if (!divisionName) return;
      if (App.State.currentDivision === divisionName && App.State.localData) return;

      await App.UI.selectOptionAtDepth(0, opt => opt.textContent.trim() === divisionName);

      const started = Date.now();
      while (Date.now() - started < 7000) {
        if (App.State.currentDivision === divisionName && App.State.localData) {
          return;
        }
        await App.Utils.sleep(100);
      }

      throw new Error('বিভাগের ডেটা লোড হতে সময়সীমা অতিক্রম হয়েছে।');
    },

    /**
     * Opens file by id through automatic path navigation
     * @param {string} fileId - Target file id
     */
    async openFileById(fileId) {
      if (!App.State.localData) {
        throw new Error('প্রথমে একটি বিভাগ নির্বাচন করুন।');
      }

      const resolved = App.UI.findFilePathById(fileId);
      if (!resolved) {
        throw new Error('এই বিভাগে ফাইলটি খুঁজে পাওয়া যায়নি।');
      }

      App.State.skipFilterOnce = true;

      await App.UI.navigateToSelection({
        districtId: resolved.district.id,
        districtName: resolved.district.name,
        upazilaId: resolved.upazila.id,
        upazilaName: resolved.upazila.name,
        surveyTypeId: resolved.surveyType.id,
        surveyTypeName: resolved.surveyType.name,
        fileId: resolved.file.id,
        fileName: resolved.file.name
      });
    },

    /**
     * Creates cascading dropdown
     * @param {Array} folders - Array of folder objects
     */
    createDropdown(folders) {
      if (!folders || folders.length === 0) return;

      const placeholders = [
        'বিভাগ নির্বাচন করুন...',
        'জেলা নির্বাচন করুন...',
        'উপজেলা/থানা নির্বাচন করুন...',
        'সার্ভে টাইপ নির্বাচন করুন...',
        'মৌজা নির্বাচন করুন...'
      ];
      const depth = App.DOM.dropdownContainer.children.length;

      const wrapper = document.createElement('div');
      wrapper.className = 'dropdown-wrapper mb-3 shadow-sm rounded bg-white p-1';

      const select = document.createElement('select');
      select.className = 'form-select form-select-lg border-0';

      folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder.id;
        option.textContent = sanitizeHTML(folder.name);
        select.appendChild(option);
      });

      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = placeholders[depth] || 'নির্বাচন করুন...';
      select.insertBefore(defaultOption, select.firstChild);
      select.value = '';

      select.addEventListener('change', async (event) => {
        const selectEl = event.target;
        const selectedFolderId = selectEl.value;
        const currentWrapper = selectEl.closest('.dropdown-wrapper');

        // Clear subsequent UI
        while (currentWrapper.nextElementSibling) {
          currentWrapper.nextElementSibling.remove();
        }
        App.DOM.fileContainer.innerHTML = '';

        if (!selectedFolderId) {
          App.Utils.setStatus('অনুগ্রহ করে নির্বাচন করুন।');
          return;
        }

        // Check online status before loading data
        if (!isOnline()) {
          App.Utils.showError('ইন্টারনেট সংযোগ নেই। অনুগ্রহ করে আপনার সংযোগ পরীক্ষা করুন।');
          return;
        }

        App.Utils.toggleDropdowns(true);

        const allDropdowns = Array.from(App.DOM.dropdownContainer.querySelectorAll('select'));
        const currentDepth = allDropdowns.indexOf(selectEl);
        const selectedFolderName = selectEl.options[selectEl.selectedIndex].text;

        try {
          if (currentDepth === 0) { // Division selected
            App.Utils.setStatus(`'${selectedFolderName}' বিভাগের ডেটা লোড হচ্ছে...`, true);

            const jsonData = await App.API.loadDivisionData(selectedFolderName);
            App.State.localData = jsonData[selectedFolderName];
            App.State.currentDivision = selectedFolderName;

            if (App.State.localData && App.State.localData.districts) {
              App.UI.createDropdown(App.State.localData.districts);
              App.Utils.setStatus(`লোড সম্পন্ন: ${selectedFolderName}। এখন জেলা নির্বাচন করুন।`);
            } else {
              throw new Error(`'${selectedFolderName}' এর জন্য কোনো জেলা পাওয়া যায়নি।`);
            }
          } else { // District, Upazila, or Survey Type selected
            const selectedItem = folders.find(f => f.id === selectedFolderId);
            if (!selectedItem) {
              throw new Error("নির্বাচন খুঁজে পাওয়া যায়নি।");
            }

            const subFolders = selectedItem.upazilas || selectedItem.survey_types || [];
            const files = selectedItem.mouzas || [];
            let nextStepMessage = "নির্বাচন করুন।";

            App.State.currentFiles = files.length > 0 ? files : [];

            if (subFolders.length > 0) App.UI.createDropdown(subFolders);
            if (files.length > 0) {
              if (App.State.skipFilterOnce) {
                App.State.skipFilterOnce = false;
                App.UI.renderFiles(files, currentDepth);
              } else {
                App.UI.applyFiltersToCurrentFiles();
              }
            } else {
              App.UI.renderFiles(files, currentDepth);
            }

            if (files.length > 0) {
              nextStepMessage = "মৌজা ম্যাপ নির্বাচন করুন।";
            } else if (subFolders.length > 0) {
              nextStepMessage = placeholders[currentDepth + 1] || "নির্বাচন করুন।";
            }

            if (files.length > 0 && (App.State.activeFilters.type || App.State.activeFilters.size)) {
              const filtered = filterFiles(App.State.currentFiles, App.State.activeFilters);
              App.Utils.setStatus(getFilterSummary(App.State.currentFiles, filtered, App.State.activeFilters));
            } else {
              App.Utils.setStatus(nextStepMessage);
            }
          }
        } catch (err) {
          console.error("Failed to process selection:", err);
          App.Utils.showError(
            err.message,
            () => {
              // Trigger change event again to retry
              selectEl.dispatchEvent(new Event('change'));
            }
          );
        } finally {
          App.Utils.toggleDropdowns(false);
        }
      });

      wrapper.appendChild(select);
      App.DOM.dropdownContainer.appendChild(wrapper);
    },

    /**
     * Renders files list
     * @param {Array} files - Array of file objects
     * @param {number} depth - Current depth level
     */
    renderFiles(files, depth) {
      App.DOM.dropdownContainer
        .querySelectorAll('.file-selector-wrapper')
        .forEach(node => node.remove());

      if (!files || files.length === 0) {
        App.DOM.fileContainer.innerHTML = '';
        if (depth === 3) {
          const li = document.createElement('li');
          li.className = 'list-group-item text-center text-body-secondary';
          li.textContent = 'এই ফোল্ডারে কোনো ফাইল নেই।';
          App.DOM.fileContainer.appendChild(li);
        } else {
          App.DOM.fileContainer.innerHTML = '';
        }
        return;
      }

      const select = document.createElement('select');
      select.className = 'form-select form-select-lg border-0';

      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'মৌজা ম্যাপ নির্বাচন করুন...';
      select.appendChild(defaultOption);

      files.forEach(file => {
        const option = document.createElement('option');
        option.value = file.id;
        const displayName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        option.textContent = sanitizeHTML(displayName);
        option.dataset.file = JSON.stringify(file);
        select.appendChild(option);
      });

      const wrapperDiv = document.createElement('div');
      wrapperDiv.className = 'dropdown-wrapper file-selector-wrapper mb-3 shadow-sm rounded bg-white p-1';
      wrapperDiv.appendChild(select);
      App.DOM.dropdownContainer.appendChild(wrapperDiv);

      const choices = new Choices(select, { searchEnabled: true, itemSelectText: 'নির্বাচন করুন' });
      select.choices = choices;

      select.addEventListener('change', (event) => {
        const selectedValue = event.detail?.value || event.target.value;
        App.DOM.fileContainer.innerHTML = '';
        if (selectedValue) {
          const selectedOption = Array.from(select.options).find(opt => opt.value === selectedValue);
          const file = JSON.parse(selectedOption.dataset.file);
          const fileNode = App.UI.createFileNode(file);
          App.DOM.fileContainer.appendChild(fileNode);
        }
      });

      if (App.DOM.fileContainer.innerHTML === '') {
        App.Utils.setStatus('মৌজা নির্বাচন করুন।');
      }
    },

    /**
     * Creates file card node
     * @param {Object} file - File object
     * @returns {HTMLElement} File card element
     */
    createFileNode(file) {
      const wrapper = document.createElement('div');
      wrapper.className = 'card mb-3 shadow-sm border-0 animate__animated animate__fadeIn';

      const cardBody = document.createElement('div');
      cardBody.className = 'card-body';

      const iconClass = App.Utils.getIconForMimeType(file.mimeType);

      const header = document.createElement('div');
      header.className = 'd-flex align-items-center mb-3';
      header.innerHTML = `
        <div class="flex-shrink-0 bg-light rounded p-2 text-center" style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
          <span class="${iconClass} fs-3 text-primary"></span>
        </div>
        <div class="flex-grow-1 ms-3 overflow-hidden">
          <h6 class="card-title mb-0 text-truncate" title="${escapeHTML(file.name)}">${escapeHTML(file.name)}</h6>
          <small class="text-muted">${escapeHTML(file.mimeType || 'Unknown Type')}</small>
        </div>
      `;
      cardBody.appendChild(header);

      if (file.size) {
        const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
        const sizeBadge = document.createElement('div');
        sizeBadge.className = 'mb-3';
        sizeBadge.innerHTML = `<span class="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-10"><i class="bi bi-hdd me-1"></i> ${sizeInMB} MB</span>`;
        cardBody.appendChild(sizeBadge);
      }

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'd-flex gap-2';

      // Add to favorites button
      const favBtn = createFavoriteButton(file.id, {
        id: file.id,
        name: file.name,
        path: App.State.currentDivision || '',
        mimeType: file.mimeType,
        size: file.size
      }, () => {
        // Refresh favorites panel
        renderFavorites(
          App.DOM.featuresContainer?.querySelector('.favorites-panel'),
          App.UI.handleFavoriteItemClick
        );
      });

      actionsDiv.appendChild(favBtn);

      const captchaContainer = document.createElement('div');
      captchaContainer.className = 'mt-3 p-3 bg-light rounded border';
      captchaContainer.style.display = 'none';

      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn btn-primary flex-grow-1 shadow-sm';
      dlBtn.innerHTML = '<i class="bi bi-cloud-download me-2"></i> Download';

      const startDownload = async () => {
        try {
          dlBtn.disabled = true;
          dlBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
          App.Utils.showProgress(true, 'ফাইল ডাউনলোড এর জন্য প্রস্তুত করা হচ্ছে...');

          await App.API.downloadViaProxy(file.id, file.name);

          // Add to recent items
          addToRecent({
            id: file.id,
            name: file.name,
            path: App.State.currentDivision || '',
            mimeType: file.mimeType,
            size: file.size
          });

          const recentPanel = App.DOM.featuresContainer?.querySelector('.recent-panel');
          if (recentPanel) {
            renderRecentItems(recentPanel, App.UI.handleRecentItemClick);
          }

          App.Utils.showProgress(false);
          App.Utils.setStatus('ডাউনলোড সম্পন্ন হয়েছে!');
        } catch (err) {
          console.error('Download error:', err);
          App.Utils.showError(`ডাউনলোড এরর: ${err.message}`, startDownload);
        } finally {
          App.Utils.showProgress(false);
          dlBtn.disabled = false;
          dlBtn.innerHTML = '<i class="bi bi-cloud-download me-2"></i> Download';
        }
      };

      const generateCaptchaQuestion = () => {
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const correctAnswer = num1 + num2;

        captchaContainer.innerHTML = `
          <label class="form-label small fw-bold text-muted mb-2">নিরাপত্তা প্রশ্ন: ${num1} + ${num2} = ?</label>
          <div class="input-group">
            <input type="number" id="captchaInput" class="form-control" placeholder="উত্তর লিখুন">
            <button id="submitCaptcha" class="btn btn-success">যাচাই করুন</button>
          </div>
          <div id="captchaError" class="text-danger small mt-1"></div>
        `;
        captchaContainer.style.display = 'block';
        dlBtn.style.display = 'none';

        const submitBtn = captchaContainer.querySelector('#submitCaptcha');
        const input = captchaContainer.querySelector('#captchaInput');

        const validate = () => {
          if (parseInt(input.value, 10) === correctAnswer) {
            captchaContainer.style.display = 'none';
            dlBtn.style.display = 'block';
            startDownload();
          } else {
            generateCaptchaQuestion();
            const newErrorEl = captchaContainer.querySelector('#captchaError');
            if (newErrorEl) newErrorEl.textContent = 'ভুল উত্তর। আবার চেষ্টা করুন।';
          }
        };

        submitBtn.addEventListener('click', validate);
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') validate();
        });

        setTimeout(() => input.focus(), 100);
      };

      dlBtn.addEventListener('click', generateCaptchaQuestion);

      actionsDiv.appendChild(dlBtn);
      cardBody.appendChild(actionsDiv);
      cardBody.appendChild(captchaContainer);

      wrapper.appendChild(cardBody);
      return wrapper;
    }
  },

  // ==========================================
  // INITIALIZATION
  // ==========================================
  async init() {
    App.Utils.toggleDropdowns(true);
    App.State.localData = null;

    // Initialize offline detection once
    if (!App.State.offlineDetectionInitialized) {
      initOfflineDetection(
        () => {
          App.State.isOffline = true;
          showOfflineNotification();
        },
        () => {
          App.State.isOffline = false;
        }
      );
      App.State.offlineDetectionInitialized = true;
    }

    // Initialize feature panels
    App.UI.initFeaturePanels();

    try {
      App.Utils.setStatus('বিভাগ লোড হচ্ছে...', true);

      const divisionNames = [
        "ঢাকা বিভাগ", "চট্টগ্রাম বিভাগ", "রাজশাহী বিভাগ", "খুলনা বিভাগ",
        "বরিশাল বিভাগ", "সিলেট বিভাগ", "রংপুর বিভাগ", "ময়মনসিংহ বিভাগ"
      ];

      const divisions = divisionNames.map(name => ({
        id: name,
        name: name
      }));

      App.UI.createDropdown(divisions);

      App.Utils.setStatus('শুরু করতে বিভাগ নির্বাচন করুন।');
    } catch (err) {
      App.Utils.showError(
        'অ্যাপ্লিকেশন ডেটা লোড করা যায়নি। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করে পৃষ্ঠাটি রিফ্রেশ করুন।',
        () => App.init()
      );
    } finally {
      App.Utils.toggleDropdowns(false);
    }
  },

  /**
   * Resets application state
   */
  resetApp() {
    App.DOM.dropdownContainer.innerHTML = '';
    App.DOM.fileContainer.innerHTML = '';
    App.DOM.progressContainer.style.display = 'none';
    App.DOM.progressContainer.innerHTML = '';
    App.DOM.downloadContainer.innerHTML = '';
    App.State.localData = null;
    App.State.currentDivision = null;
    App.State.currentFiles = [];
    App.State.activeFilters = { type: '', size: '' };
    App.State.skipFilterOnce = false;
    App.init();
  }
};

// Start Application
App.init();
App.DOM.resetBtn.addEventListener('click', App.resetApp);
