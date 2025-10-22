// app.js
// =========================
// CONFIG: Apps Script Web App URL (deploy থেকে পেয়েছেন)
const API_BASE = 'https://script.google.com/macros/s/AKfycbzlLhCx-_sL_TnV_wBOPicAYcwcqg3jTgawC_eysmTzVkvKZ6jl69h5I0JK3csRaL0j/exec'; // <-- এখানে বসান

const statusEl = document.getElementById('status');
const dropdownContainer = document.getElementById('dropdownContainer');
const fileContainer = document.getElementById('fileContainer');
const progressContainer = document.getElementById('progressContainer'); // Keep progressContainer for fetchChildren
const resetBtn = document.getElementById('resetBtn');

let localData = null; // To store data from division_districts.json

/**
 * Fetch immediate children for a folderId
 */
async function fetchChildren(folderId, folderName) {
  try {
    showProgress(true, folderName ? `লোড হচ্ছে: ${folderName}` : 'বিভাগ লোড হচ্ছে...');
    setStatus(folderName ? `লোড হচ্ছে: ${folderName}` : 'বিভাগ লোড হচ্ছে...', true);
    const url = new URL(API_BASE);
    url.searchParams.set('action', 'listChildren');
    if (folderId) {
      url.searchParams.set('folderId', folderId);
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Network response ' + res.status);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Invalid response');
    setStatus('লোড সম্পন্ন: ' + json.data.name);
    return json.data;
  } catch (err) {
    console.error(err);
    setStatus('এরর: ' + err.message);
    throw err;
  } finally {
    showProgress(false);
  }
}

function setStatus(txt, isLoading = false) {
  if (isLoading) {
    statusEl.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${txt}`;
  } else {
    statusEl.textContent = txt;
  }
}

/**
 * Returns a Bootstrap Icon class name based on the file's MIME type.
 * @param {string} mimeType - The MIME type of the file.
 * @returns {string} A string containing Bootstrap Icon classes.
 */
function getIconForMimeType(mimeType) {
  if (!mimeType) return 'bi bi-file-earmark-text';

  if (mimeType.startsWith('image/')) {
    return 'bi bi-file-earmark-image';
  }
  if (mimeType.startsWith('video/')) {
    return 'bi bi-file-earmark-play';
  }
  if (mimeType.startsWith('audio/')) {
    return 'bi bi-file-earmark-music';
  }
  if (mimeType === 'application/pdf') {
    return 'bi bi-file-earmark-pdf';
  }
  return 'bi bi-file-earmark-text'; // Default icon
}
/**
 * Build file node DOM element with Open & Download actions
 */
function createFileNode(file) {
  const wrapper = document.createElement('div');
  wrapper.className = 'list-group-item';

  // Helper to create detail paragraphs
  const createDetailRow = (label, value) => {
    const p = document.createElement('p');
    p.className = 'mb-1';
    p.innerHTML = `<strong>${label}:</strong> ${value}`;
    return p;
  };

  const iconClass = getIconForMimeType(file.mimeType);
  const iconHTML = `<span class="${iconClass} me-2 fs-5 text-primary"></span>`;

  // File Name
  const fileNameRow = createDetailRow('File Name', file.name);
  fileNameRow.innerHTML = `<strong>File Name:</strong> ${iconHTML} ${file.name}`;

  // File Type
  wrapper.appendChild(createDetailRow('File Type', file.mimeType || 'Unknown'));

  // File Size
  if (file.size) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    wrapper.appendChild(createDetailRow('File Size', `${sizeInMB} MB`));
  }

  // Add the file name row after other details for better alignment
  wrapper.insertBefore(fileNameRow, wrapper.firstChild);

  // Action Buttons
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'mt-3';

  const captchaContainer = document.createElement('div');
  captchaContainer.className = 'mt-2';
  captchaContainer.style.display = 'none';

  const dlBtn = document.createElement('button');
  dlBtn.className = 'btn btn-sm btn-primary';
  dlBtn.textContent = 'Download';

  const startDownload = async () => {
    try {
      dlBtn.disabled = true;
      showProgress(true, 'ফাইল ডাউনলোড এর জন্য রেডি করা হচ্ছে...');
      await downloadViaProxy(file.id, file.name);
    } catch (err) {
      // Using statusEl for download errors as alert is not preferred
      setStatus(`ডাউনলোড এরর: ${err.message}`);
    } finally {
      showProgress(false);
      dlBtn.disabled = false;
      dlBtn.textContent = 'Download';
    }
  };

  const generateCaptchaQuestion = () => {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      const correctAnswer = num1 + num2;

      captchaContainer.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <label for="captchaInput" class="form-label mb-0">${num1} + ${num2} =</label>
          <input type="number" id="captchaInput" class="form-control form-control-sm" style="width: 60px;">
          <button id="submitCaptcha" class="btn btn-sm btn-secondary">Submit</button>
        </div>
        <div id="captchaError" class="text-danger small mt-1"></div>
      `;
      captchaContainer.style.display = 'block';
      dlBtn.style.display = 'none';

      const submitBtn = captchaContainer.querySelector('#submitCaptcha');
      const input = captchaContainer.querySelector('#captchaInput');
      const errorEl = captchaContainer.querySelector('#captchaError');

      submitBtn.addEventListener('click', () => {
        if (parseInt(input.value, 10) === correctAnswer) {
          captchaContainer.style.display = 'none';
          dlBtn.style.display = 'inline-block';
          startDownload();
        } else {
          // ভুল উত্তর দিলে নতুন প্রশ্ন তৈরি করুন
          generateCaptchaQuestion();
          // নতুন তৈরি হওয়া ইনপুটে ফোকাস করুন এবং এরর মেসেজ দেখান
          const newErrorEl = captchaContainer.querySelector('#captchaError');
          if (newErrorEl) newErrorEl.textContent = 'ভুল উত্তর। আবার চেষ্টা করুন।';
          captchaContainer.querySelector('#captchaInput')?.focus();
        }
      });
  };
  const showCaptcha = () => generateCaptchaQuestion();

  dlBtn.addEventListener('click', showCaptcha);

  actionsDiv.appendChild(dlBtn);
  wrapper.appendChild(actionsDiv);
  wrapper.appendChild(captchaContainer);

  return wrapper;
}

/**
 * Shows or hides the indeterminate progress bar.
 * @param {boolean} show - True to show, false to hide.
 * @param {string} [text='ডাউনলোড হচ্ছে...'] - The text to display on the progress bar.
 * @param {number|null} [percentage=null] - The percentage to show on the progress bar.
 */
function showProgress(show, text = 'ডাউনলোড হচ্ছে...', percentage = null) {
  if (show) {
    const isDeterminate = percentage !== null && percentage >= 0;
    const barClass = isDeterminate ? 'progress-bar' : 'progress-bar progress-bar-striped progress-bar-animated';
    const width = isDeterminate ? percentage : 100;
    progressContainer.style.display = 'block';
    progressContainer.innerHTML = `
      <div class="progress mt-2" role="progressbar" aria-label="Loading data" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
        <div class="${barClass}" style="width: ${width}%">${text}</div>
      </div>`;
  } else {
    progressContainer.style.display = 'none';
    progressContainer.innerHTML = '';
  }
}
/**
 * Download via Apps Script proxy (base64 JSON)
 */
async function downloadViaProxy(fileId, fileName) {
  const url = new URL(API_BASE);
  url.searchParams.set('action', 'download');
  url.searchParams.set('fileId', fileId);

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
  a.download = fileName || payload.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

/**
 * Renders files in the file container
 */
function renderFiles(files, depth) {
  // If there are no files, show a message and return.
  if (!files || files.length === 0) {
    // Only show the "no files" message after selecting from the 4th dropdown (Survey Type, depth=3)
    if (depth === 3) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-center text-danger fw-bold';
      li.textContent = 'কোন ফাইল নেই।';
      fileContainer.appendChild(li);
    } else {
      fileContainer.innerHTML = ''; // Clear any previous message
    }
    return;
  }

  // Create a dropdown for files (Mouza maps)
  const select = document.createElement('select');
  select.className = 'form-select';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'মৌজা ম্যাপ নির্বাচন করুন...';
  select.appendChild(defaultOption);

  files.forEach(file => {
    const option = document.createElement('option');
    option.value = file.id;
    
    let displayName = file.name;
    const lastDotIndex = file.name.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      displayName = file.name.substring(0, lastDotIndex);
    }
    displayName = displayName.replace('_result_result', ''); // Remove "_result_result"
    option.textContent = displayName;
    // Store file object in a data attribute
    option.dataset.file = JSON.stringify(file);
    select.appendChild(option);
  });

  // Wrap the select in a div to manage it separately
  const wrapperDiv = document.createElement('div');
  wrapperDiv.appendChild(select);
  dropdownContainer.appendChild(wrapperDiv);

  // Initialize Choices.js only for this file dropdown
  const choices = new Choices(select, { searchEnabled: true, itemSelectText: 'নির্বাচন করুন' });

  select.addEventListener('change', (event) => {
    fileContainer.innerHTML = ''; // Clear previous file details
    if (event.detail.value) {
      // Find the option element to get the data attribute
      const selectedOption = Array.from(select.options).find(opt => opt.value === event.detail.value);
      const file = JSON.parse(selectedOption.dataset.file);
      const fileNode = createFileNode(file);
      fileContainer.appendChild(fileNode);
    }
  });

  // Initially, show a message in the file container
  if (fileContainer.innerHTML === '') {
    setStatus('মৌজা নির্বাচন করুন।');
  }
}

/**
 * Creates a new dropdown for folders and handles selection change.
 */
function createDropdown(folders) {
  if (!folders || folders.length === 0) {
    return; // Don't create a dropdown if there are no folders
  }

  const placeholders = [
    'বিভাগ নির্বাচন করুন...',
    'জেলা নির্বাচন করুন...',
    'উপজেলা/থানা নির্বাচন করুন...',
    'সার্ভে টাইপ নির্বাচন করুন...',
    'মৌজা নির্বাচন করুন...'
  ];
  const depth = dropdownContainer.children.length;

  const select = document.createElement('select');
  select.className = 'form-select';

  // Add folder options
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
  select.value = ''; // Set default selection

  select.addEventListener('change', async (event) => {
    const selectEl = event.target;
    const selectedFolderId = selectEl.value;

    // Remove subsequent dropdowns and file list
    // The actual element in the container is the select, not a wrapper
    let nextEl = selectEl;
    while (nextEl.nextElementSibling) {
      // If the next sibling is a Choices.js container, remove its wrapper
      const wrapper = nextEl.nextElementSibling;
      wrapper.remove();
    }
    fileContainer.innerHTML = ''; // Clear file list

    if (!selectedFolderId) {
      setStatus('অনুগ্রহ করে নির্বাচন করুন।');
      return;
    }

    toggleDropdowns(true); // Disable all dropdowns

    // Determine the depth of the current dropdown
    const allDropdowns = Array.from(dropdownContainer.querySelectorAll('select'));
    const currentDepth = allDropdowns.indexOf(selectEl);

    const selectedFolderName = selectEl.options[selectEl.selectedIndex].text;

    try {
      let data;

      // বিভাগ নির্বাচন (depth 0) -> বিভাগ-ভিত্তিক JSON লোড করুন এবং জেলা দেখান
      if (currentDepth === 0) {
        setStatus(`'${selectedFolderName}' এর ডেটা লোড হচ্ছে...`, true);
        const fileName = `data/${selectedFolderName}_full_data.json`;
        const response = await fetch(fileName);
        if (!response.ok) {
          throw new Error(`'${fileName}' ফাইলটি পাওয়া যায়নি।`);
        }
        localData = await response.json(); // সম্পূর্ণ বিভাগের ডেটা লোড করুন
        const divisionData = localData[selectedFolderName];
        data = { name: selectedFolderName, folders: divisionData.districts, files: [] };
        setStatus(`লোড সম্পন্ন: ${selectedFolderName}`);
      } 
      // জেলা নির্বাচন (depth 1) -> localData থেকে উপজেলা দেখান
      else if (currentDepth === 1) {
        setStatus(`'${selectedFolderName}' এর উপজেলা লোড হচ্ছে...`, true);
        const divisionSelect = allDropdowns[0];
        const divisionName = divisionSelect.options[divisionSelect.selectedIndex].text;
        const districtData = localData[divisionName]?.districts.find(d => d.id === selectedFolderId);
        data = { name: selectedFolderName, folders: districtData?.upazilas || [], files: [] };
        setStatus(`লোড সম্পন্ন: ${selectedFolderName}`);
      } 
      // উপজেলা নির্বাচন (depth 2) -> localData থেকে সার্ভে টাইপ দেখান
      else if (currentDepth === 2) {
        setStatus(`'${selectedFolderName}' এর সার্ভে টাইপ লোড হচ্ছে...`, true);
        const divisionSelect = allDropdowns[0];
        const districtSelect = allDropdowns[1];
        const divisionName = divisionSelect.options[divisionSelect.selectedIndex].text;
        const districtId = districtSelect.value;
        const upazilaData = localData[divisionName]?.districts.find(d => d.id === districtId)?.upazilas.find(u => u.id === selectedFolderId);
        data = { name: selectedFolderName, folders: upazilaData?.survey_types || [], files: [] };
        setStatus(`লোড সম্পন্ন: ${selectedFolderName}`);
      }
      // সার্ভে টাইপ নির্বাচন (depth 3) -> localData থেকে মৌজা (ফাইল) দেখান
      else if (currentDepth === 3) {
        setStatus(`'${selectedFolderName}' এর মৌজা ম্যাপ লোড হচ্ছে...`, true);
        const divisionSelect = allDropdowns[0];
        const districtSelect = allDropdowns[1];
        const upazilaSelect = allDropdowns[2];
        const divisionName = divisionSelect.options[divisionSelect.selectedIndex].text;
        const districtId = districtSelect.value;
        const upazilaId = upazilaSelect.value;
        const upazilaData = localData[divisionName]?.districts.find(d => d.id === districtId)?.upazilas.find(u => u.id === upazilaId);
        const surveyTypeData = upazilaData?.survey_types.find(st => st.id === selectedFolderId);
        data = { name: selectedFolderName, folders: [], files: surveyTypeData?.mouzas || [] }; // Mouzas are files
        setStatus(`লোড সম্পন্ন: ${selectedFolderName}`);
      } else {
        // সার্ভে টাইপ নির্বাচন (depth 3) -> localData থেকে মৌজা (ফাইল) দেখান
        // অথবা অন্য কোনো গভীরতার জন্য API কল করুন
        data = await fetchChildren(selectedFolderId, selectedFolderName);
      }

      // ডেটা প্রসেস করুন
      fileContainer.innerHTML = ''; // Clear previous file list or messages
      renderFiles(data.files, currentDepth);
      if (data.folders && data.folders.length > 0) {
        createDropdown(data.folders);
      }

    } catch (err) {
      setStatus('এরর: ' + err.message);
      console.error("Failed to process selection:", err);
    } finally {
      toggleDropdowns(false); // Re-enable all dropdowns
    }
  });

  dropdownContainer.appendChild(select);
}

/**
 * Toggles the disabled state of all dropdowns.
 * @param {boolean} disabled - True to disable, false to enable.
 */
function toggleDropdowns(disabled) {
  const dropdowns = dropdownContainer.querySelectorAll('select');
  dropdowns.forEach(select => {
    // Check if the select is a Choices.js instance
    if (select.choices) {
      if (disabled) select.choices.disable();
      else select.choices.enable();
    } else {
      select.disabled = disabled;
    }
  });
}

/**
 * Initialize explorer with DEFAULT root
 */
async function init() {
  toggleDropdowns(true);
  try {
    setStatus('বিভাগ লোড হচ্ছে...', true);
    localData = null; // Reset local data on init
    // Fetch initial division data from local division.json
    const response = await fetch('data/division.json');
    if (!response.ok) {
      throw new Error(`division.json ফাইলটি লোড করা যায়নি: ${response.statusText}`);
    }
    const divisionJson = await response.json();
    
    createDropdown(divisionJson.data.folders);

    setStatus('শুরু করতে বিভাগ নির্বাচন করুন।');
  } catch (err) {
    setStatus('এরর: ' + err.message);
  } finally {
    toggleDropdowns(false);
  }
}

/**
 * Resets the application to its initial state.
 */
function resetApp() {
  dropdownContainer.innerHTML = '';
  fileContainer.innerHTML = '';
  progressContainer.style.display = 'none';
  progressContainer.innerHTML = '';
  init(); // Re-initialize the app
}

init();
resetBtn.addEventListener('click', resetApp);
