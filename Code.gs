// Code.gs — মৌজা ম্যাপ প্রক্সি (Google Apps Script)
// =============================================================================
// ওয়েব অ্যাপ হিসেবে ডিপ্লয় করতে হয়। সাইট এই একটি ঠিকানার মধ্য দিয়েই ফাইল পায় —
// Drive এর লিংক কোথাও দেখানো হয় না।
//
// ডিপ্লয়ের সেটিং (ভুল হলে "আইটেম খুঁজে পাওয়া যায়নি" আসবে):
//   Execute as        : Me
//   Who has access    : Anyone
//
// ⚠️ কোড বদলানোর পর: Deploy → Manage deployments → পেন্সিল আইকন →
//    Version: New version → Deploy। এতে ঠিকানা একই থাকে।
//    "New deployment" দিলে নতুন ঠিকানা তৈরি হবে আর সাইট ভেঙে যাবে।
// =============================================================================

/** ম্যাপের সবচেয়ে উপরের (root) ফোল্ডার */
const DEFAULT_FOLDER_ID = '1T1GWNPpszx44Mj42u7tLXaP3ac3t4yRb';

/**
 * সমর্থিত অনুরোধ:
 *   ?action=download&fileId=…              → ফাইলের বাইট base64 এ
 *   ?action=listChildren&folderId=…        → ওই ফোল্ডারের ভেতরের নাম-তালিকা
 *   ?action=ping                           → সার্ভার সাড়া দিচ্ছে কি না
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const action = String(params.action || 'listChildren').toLowerCase();

    if (action === 'ping') {
      return json({ success: true, data: { ok: true, at: new Date().toISOString() } });
    }

    if (action === 'download') {
      if (!params.fileId) return json({ success: false, error: 'fileId দেওয়া হয়নি' });
      return proxyDownload(params.fileId);
    }

    if (action === 'listchildren') {
      return json({ success: true, data: listChildren(params.folderId || DEFAULT_FOLDER_ID) });
    }

    // আগে অজানা action চুপচাপ ফোল্ডার তালিকা দিত — ভুল ধরা পড়ত না
    return json({ success: false, error: 'অজানা action: ' + action });

  } catch (err) {
    return json({ success: false, error: err.message });
  }
}

/** JSON উত্তর বানানোর ছোট হেল্পার */
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ফোল্ডারের ভেতরের ফোল্ডার ও ফাইলের তালিকা।
 *
 * ⚠️ ফাইলের Drive লিংক (getUrl) ইচ্ছে করেই বাদ দেওয়া হয়েছে — ইউজারের নির্দেশ:
 *    "Drive এর লিংক সবাইকে দেখানো যাবে না"। এই ঠিকানা পাবলিক, তাই এখানে লিংক
 *    রাখলে যে কেউ পুরো ট্রি হেঁটে সব ফাইলের সরাসরি লিংক বের করে ফেলতে পারত।
 *    নতুন কোড লেখার সময়ও getUrl() ফেরত দেওয়া যাবে না।
 */
function listChildren(folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const result = { id: folder.getId(), name: folder.getName(), folders: [], files: [] };

  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const sf = subfolders.next();
    result.folders.push({ id: sf.getId(), name: sf.getName(), type: 'folder' });
  }

  const files = folder.getFiles();
  while (files.hasNext()) {
    const f = files.next();
    result.files.push({
      id: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      size: f.getSize()
    });
  }
  return result;
}

/**
 * ফাইলের বাইট base64 এ ফেরত দেয়।
 * উত্তরের গড়ন আগের মতোই: { success, data: { fileName, mimeType, size, base64 } }
 *
 * মেমরি: একই ফাইল যেন বারবার কপি না হয়। JSON.stringify() দিলে বিশাল base64
 * স্ট্রিংটার আরেকটি কপি তৈরি হতো, তাই উত্তরটি হাতে জোড়া হচ্ছে — base64 এর
 * অক্ষরগুলোয় (A–Z a–z 0–9 + / =) JSON এ পালানোর মতো কিছু নেই, তাই নিরাপদ।
 */
function proxyDownload(fileId) {
  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();
  const encoded = Utilities.base64Encode(blob.getBytes());

  const body = '{"success":true,"data":{'
    + '"fileName":' + JSON.stringify(file.getName())
    + ',"mimeType":' + JSON.stringify(blob.getContentType() || 'application/octet-stream')
    + ',"size":' + file.getSize()
    + ',"base64":"' + encoded + '"}}';

  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
