// app.js
// =========================
// Map Explorer Application
// Organized into a single App object for better structure and maintainability.
// =========================

const App = {
  // ==========================================
  // CONFIGURATION
  // ==========================================
  Config: {
    API_BASE: 'https://script.google.com/macros/s/AKfycbzlLhCx-_sL_TnV_wBOPicAYcwcqg3jTgawC_eysmTzVkvKZ6jl69h5I0JK3csRaL0j/exec'
  },

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  State: {
    localData: null
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
    resetBtn: document.getElementById('resetBtn')
  },

  // ==========================================
  // UTILITIES
  // ==========================================
  Utils: {
    setStatus(txt, isLoading = false) {
      const { status } = App.DOM;
      if (isLoading) {
        status.innerHTML = `
          <span class="d-inline-flex align-items-center px-3 py-2 rounded-pill bg-primary bg-opacity-10 text-primary fw-semibold">
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${txt}
          </span>
        `;
      } else {
        if (txt === 'শুরু করতে বিভাগ নির্বাচন করুন।') {
          status.innerHTML = `
            <div class="d-inline-flex align-items-center px-3 py-2 rounded-3 border border-primary border-opacity-25 bg-primary bg-opacity-10 text-primary">
              <i class="bi bi-info-circle-fill me-2"></i>
              <span class="fw-semibold">শুরু করতে বিভাগ নির্বাচন করুন</span>
            </div>
          `;
          return;
        }

        if (txt.startsWith('লোড সম্পন্ন:')) {
          const divisionName = txt.replace('লোড সম্পন্ন:', '').split('।')[0].trim();
          status.innerHTML = `
            <div class="d-inline-flex flex-wrap align-items-center gap-2 px-3 py-2 rounded-3 border border-success border-opacity-25 bg-success bg-opacity-10 text-success">
              <i class="bi bi-check-circle-fill"></i>
              <span class="badge bg-success-subtle text-success-emphasis border border-success border-opacity-25">${divisionName}</span>
              <span class="fw-semibold">লোড সম্পন্ন, এখন জেলা নির্বাচন করুন</span>
            </div>
          `;
          return;
        }

        if (txt === 'উপজেলা/থানা নির্বাচন করুন...' || txt === 'সার্ভে টাইপ নির্বাচন করুন...') {
          const label = txt.replace('...', '');
          status.innerHTML = `
            <div class="d-inline-flex align-items-center px-3 py-2 rounded-3 border border-warning border-opacity-25 bg-warning bg-opacity-10 text-warning-emphasis">
              <i class="bi bi-signpost-split-fill me-2"></i>
              <span class="fw-semibold">${label}</span>
            </div>
          `;
          return;
        }

        if (txt === 'মৌজা ম্যাপ নির্বাচন করুন।') {
          status.innerHTML = `
            <div class="d-inline-flex align-items-center px-3 py-2 rounded-3 border border-info border-opacity-25 bg-info bg-opacity-10 text-info-emphasis">
              <i class="bi bi-map-fill me-2"></i>
              <span class="fw-semibold">মৌজা ম্যাপ নির্বাচন করুন</span>
            </div>
          `;
          return;
        }

        if (txt.startsWith('ত্রুটি:')) {
          status.innerHTML = `
            <div class="d-inline-flex align-items-center px-3 py-2 rounded-3 border border-danger border-opacity-25 bg-danger bg-opacity-10 text-danger">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              <span class="fw-semibold">${txt}</span>
            </div>
          `;
          return;
        }

        status.innerHTML = `
          <span class="d-inline-flex align-items-center px-3 py-2 rounded-pill bg-secondary bg-opacity-10 text-secondary fw-semibold">
            ${txt}
          </span>
        `;
      }
    },

    showProgress(show, text = 'ডাউনলোড হচ্ছে...', percentage = null) {
      const { progressContainer } = App.DOM;
      if (show) {
        const isDeterminate = percentage !== null && percentage >= 0;
        const barClass = isDeterminate ? 'progress-bar' : 'progress-bar progress-bar-striped progress-bar-animated';
        const width = isDeterminate ? percentage : 100;
        progressContainer.style.display = 'block';
        progressContainer.innerHTML = `
          <div class="progress mt-2" role="progressbar" aria-label="Loading data" aria-valuenow="${width}" aria-valuemin="0" aria-valuemax="100">
            <div class="${barClass}" style="width: ${width}%">${text}</div>
          </div>`;
      } else {
        progressContainer.style.display = 'none';
        progressContainer.innerHTML = '';
      }
    },

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

    getIconForMimeType(mimeType) {
      if (!mimeType) return 'bi bi-file-earmark-text';
      if (mimeType.startsWith('image/')) return 'bi bi-file-earmark-image';
      if (mimeType.startsWith('video/')) return 'bi bi-file-earmark-play';
      if (mimeType.startsWith('audio/')) return 'bi bi-file-earmark-music';
      if (mimeType === 'application/pdf') return 'bi bi-file-earmark-pdf';
      return 'bi bi-file-earmark-text';
    }
  },

  // ==========================================
  // API SERVICES
  // ==========================================
  API: { // fetchChildren ফাংশনটি এখন আর ব্যবহৃত হচ্ছে না, তাই এটি মুছে ফেলা হয়েছে।
    async downloadViaProxy(fileId, fileName, onProgress = null) {
      const report = (percentage, message) => {
        if (onProgress) onProgress(Math.max(0, Math.min(100, percentage)), message);
      };

      const url = new URL(App.Config.API_BASE);
      url.searchParams.set('action', 'download');
      url.searchParams.set('fileId', fileId);

      report(5, 'সার্ভারে অনুরোধ পাঠানো হচ্ছে...');
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Proxy failed: ' + res.status);

      report(25, 'সার্ভার রেসপন্স পাওয়া গেছে...');
      const json = await res.json();
      if (!json.success || !json.data || !json.data.base64) {
        throw new Error('Invalid proxy response');
      }

      report(40, 'ফাইল ডিকোড প্রস্তুতি চলছে...');
      const payload = json.data;
      const byteCharacters = atob(payload.base64);
      const byteNumbers = new Array(byteCharacters.length);
      const decodeStep = Math.max(1, Math.floor(byteCharacters.length / 25));
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
        if (i % decodeStep === 0 || i === byteCharacters.length - 1) {
          const decodePercent = 40 + Math.round((i / Math.max(1, byteCharacters.length - 1)) * 45);
          report(decodePercent, 'ফাইল ডিকোড হচ্ছে...');
        }
      }

      report(90, 'ফাইল প্যাকেজ করা হচ্ছে...');
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: payload.mimeType || 'application/octet-stream' });

      report(96, 'ডাউনলোড শুরু করা হচ্ছে...');
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || payload.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
      report(100, 'ডাউনলোড সম্পন্ন');
    }
  },

  // ==========================================
  // UI RENDERING & LOGIC
  // ==========================================
  UI: { // processFetchedData ফাংশনের লজিক createDropdown এর মধ্যে যুক্ত করা হয়েছে।
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
        option.textContent = folder.name;
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
          const currentDepthForPrompt = Array.from(
            App.DOM.dropdownContainer.querySelectorAll('select')
          ).indexOf(selectEl);
          const promptText = placeholders[currentDepthForPrompt] || 'নির্বাচন করুন...';
          App.Utils.setStatus(promptText);
          return;
        }

        App.Utils.toggleDropdowns(true);

        const allDropdowns = Array.from(App.DOM.dropdownContainer.querySelectorAll('select'));
        const currentDepth = allDropdowns.indexOf(selectEl);
        const selectedFolderName = selectEl.options[selectEl.selectedIndex].text;

        try {
          if (currentDepth === 0) { // Division selected
            App.Utils.setStatus(`'${selectedFolderName}' বিভাগের ডেটা লোড হচ্ছে...`, true);
            const response = await fetch(`Data/${selectedFolderName}_full_data.json`);
            if (!response.ok) {
              throw new Error(`'${selectedFolderName}' বিভাগের ডেটা ফাইল খুঁজে পাওয়া যায়নি।`);
            }
            const jsonData = await response.json();
            App.State.localData = jsonData[selectedFolderName]; // The object for the division
            
            if (App.State.localData && App.State.localData.districts) {
              App.UI.createDropdown(App.State.localData.districts);
              App.Utils.setStatus(`লোড সম্পন্ন: ${selectedFolderName}। এখন জেলা নির্বাচন করুন।`);
            } else {
              throw new Error(`'${selectedFolderName}' এর জন্য কোনো জেলা পাওয়া যায়নি।`);
            }
          } else { // District, Upazila, or Survey Type selected
            const selectedItem = folders.find(f => f.id === selectedFolderId);
            if (!selectedItem) {
              throw new Error("নির্বাচন খুঁজে পাওয়া যায়নি।");
            }

            const subFolders = selectedItem.upazilas || selectedItem.survey_types || [];
            const files = selectedItem.mouzas || [];
            let nextStepMessage = "নির্বাচন করুন।";

            if (subFolders.length > 0) App.UI.createDropdown(subFolders);
            App.UI.renderFiles(files, currentDepth);

            if (files.length > 0) nextStepMessage = "মৌজা ম্যাপ নির্বাচন করুন।";
            else if (subFolders.length > 0) nextStepMessage = placeholders[currentDepth + 1] || "নির্বাচন করুন।";
            
            App.Utils.setStatus(nextStepMessage);
          }
        } catch (err) {
          console.error("Failed to process selection:", err);          
          App.Utils.setStatus(`ত্রুটি: ${err.message}`);
        } finally {
          App.Utils.toggleDropdowns(false);
        }
      });

      wrapper.appendChild(select);
      App.DOM.dropdownContainer.appendChild(wrapper);

      // Show step message immediately when a new dropdown is created.
      if (depth > 0) {
        const promptText = placeholders[depth] || 'নির্বাচন করুন...';
        App.Utils.setStatus(promptText);
      }
    },

    renderFiles(files, depth) {
      if (!files || files.length === 0) {
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
        option.textContent = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        option.dataset.file = JSON.stringify(file);
        select.appendChild(option);
      });

      const wrapperDiv = document.createElement('div');
      wrapperDiv.className = 'dropdown-wrapper mb-3 shadow-sm rounded bg-white p-1';
      wrapperDiv.appendChild(select);
      App.DOM.dropdownContainer.appendChild(wrapperDiv);

      const choices = new Choices(select, { searchEnabled: true, itemSelectText: 'নির্বাচন করুন' });
      select.choices = choices;

      select.addEventListener('change', (event) => {
        App.DOM.fileContainer.innerHTML = '';
        if (event.detail.value) {
          const selectedOption = Array.from(select.options).find(opt => opt.value === event.detail.value);
          const file = JSON.parse(selectedOption.dataset.file);
          const fileNode = App.UI.createFileNode(file);
          App.DOM.fileContainer.appendChild(fileNode);
        }
      });

      if (App.DOM.fileContainer.innerHTML === '') {
        App.Utils.setStatus('মৌজা নির্বাচন করুন।');
      }
    },

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
          <h6 class="card-title mb-0 text-truncate" title="${file.name}">${file.name}</h6>
          <small class="text-muted">${file.mimeType || 'Unknown Type'}</small>
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
      actionsDiv.className = 'd-grid';

      const captchaContainer = document.createElement('div');
      captchaContainer.className = 'mt-3 p-3 bg-light rounded border';
      captchaContainer.style.display = 'none';

      const dlBtn = document.createElement('button');
      dlBtn.className = 'btn btn-primary btn-lg shadow-sm';
      dlBtn.innerHTML = '<i class="bi bi-cloud-download me-2"></i> Download';

      const startDownload = async () => {
        let progressTimer = null;
        let currentProgress = 0;
        let downloadSucceeded = false;

        const updateProgress = (percentage, stepText = '') => {
          currentProgress = Math.max(currentProgress, Math.min(100, Math.round(percentage)));
          App.Utils.showProgress(
            true,
            `ফাইল ডাউনলোড এর জন্য প্রস্তুত করা হচ্ছে... ${currentProgress}%`,
            currentProgress
          );
          if (stepText) {
            App.Utils.setStatus(stepText, true);
          }
        };

        try {
          dlBtn.disabled = true;
          dlBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
          updateProgress(0, 'ফাইল প্রস্তুত করা হচ্ছে...');

          // Smooth visual progress from 0% to 95% while actual work চলছে।
          progressTimer = setInterval(() => {
            if (currentProgress < 95) {
              updateProgress(currentProgress + 1);
            }
          }, 80);

          await App.API.downloadViaProxy(file.id, file.name, (percentage, stepText) => {
            updateProgress(percentage, stepText);
          });

          updateProgress(100, 'ডাউনলোড সম্পন্ন হয়েছে।');
          downloadSucceeded = true;
        } catch (err) {
          App.Utils.setStatus(`ডাউনলোড এরর: ${err.message}`);
        } finally {
          if (progressTimer) clearInterval(progressTimer);
          if (downloadSucceeded) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
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
    App.State.localData = null; // Reset state
    try {
      App.Utils.setStatus('বিভাগ লোড হচ্ছে...', true);
      
      // Divisions are now predefined. Data is loaded on selection.
      const divisionNames = [
        "ঢাকা বিভাগ", "চট্টগ্রাম বিভাগ", "রাজশাহী বিভাগ", "খুলনা বিভাগ",
        "বরিশাল বিভাগ", "সিলেট বিভাগ", "রংপুর বিভাগ", "ময়মনসিংহ বিভাগ"
      ];

      const divisions = divisionNames.map(name => ({
        id: name, // Use name as ID to construct filename
        name: name
      }));

      App.UI.createDropdown(divisions);
      
      App.Utils.setStatus('শুরু করতে বিভাগ নির্বাচন করুন।');
    } catch (err) {
      const { status } = App.DOM;
      status.innerHTML = `
        <div class="alert alert-danger d-flex align-items-center mt-3" role="alert">
          <i class="bi bi-exclamation-triangle-fill flex-shrink-0 me-2"></i>
          <div>
            <strong>ত্রুটি:</strong> অ্যাপ্লিকেশন ডেটা লোড করা যায়নি।
            <p class="mb-0 mt-1">অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করে পৃষ্ঠাটি রিফ্রেশ করুন।</p>
            <hr>
            <small class="text-muted mb-0">টেকনিক্যাল বিবরণ: ${err.message}</small>
          </div>
        </div>
      `;
    } finally {
      App.Utils.toggleDropdowns(false);
    }
  },

  resetApp() {
    App.DOM.dropdownContainer.innerHTML = '';
    App.DOM.fileContainer.innerHTML = '';
    App.DOM.progressContainer.style.display = 'none';
    App.DOM.progressContainer.innerHTML = '';
    App.DOM.downloadContainer.innerHTML = '';
    App.init();
  }
};

// Start Application
App.init();
App.DOM.resetBtn.addEventListener('click', App.resetApp);
