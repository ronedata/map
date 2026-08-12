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
//
// ⚠️ এই সংস্করণে UrlFetchApp যোগ হয়েছে (বড় ফাইল টুকরো করে আনার জন্য), তাই
//    নতুন অনুমতি লাগবে। ডিপ্লয়ের আগে একবার এডিটরে গিয়ে authorize() ফাংশনটি
//    Run করুন — Google অনুমতি চাইবে, দিয়ে দিন। নইলে বড় ফাইল আসবে না।
// =============================================================================

/** ম্যাপের সবচেয়ে উপরের (root) ফোল্ডার */
const DEFAULT_FOLDER_ID = '1T1GWNPpszx44Mj42u7tLXaP3ac3t4yRb';

/** এক অনুরোধে সর্বোচ্চ কত বাইট পাঠানো যাবে (base64 এ ১.৩৩× বাড়ে) */
const MAX_CHUNK = 12 * 1024 * 1024;

/**
 * সমর্থিত অনুরোধ:
 *   ?action=download&fileId=…                  → পুরো ফাইল, base64 এ
 *   ?action=download&fileId=…&start=0&len=…    → ফাইলের একটি টুকরো
 *   ?action=listChildren&folderId=…            → ফোল্ডারের ভেতরের নাম-তালিকা
 *   ?action=ping                               → সার্ভার সাড়া দিচ্ছে কি না
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
      return (params.len !== undefined)
        ? downloadChunk(params.fileId, Number(params.start) || 0, Number(params.len))
        : downloadWhole(params.fileId);
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
 * বিশাল base64 স্ট্রিংটা JSON.stringify() দিয়ে গেলে তার আরেকটি কপি তৈরি হয়,
 * অর্থাৎ মেমরিতে দুবার থাকে। তাই উত্তরটি হাতে জোড়া হচ্ছে — base64 এর
 * অক্ষরগুলোয় (A–Z a–z 0–9 + / =) JSON এ পালানোর মতো কিছু নেই, তাই নিরাপদ।
 */
function payload(fields, encoded) {
  let s = '{"success":true,"data":{';
  for (const k in fields) s += JSON.stringify(k) + ':' + JSON.stringify(fields[k]) + ',';
  s += '"base64":"' + encoded + '"}}';
  return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON);
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

/** এক অনুরোধে পুরো ফাইল দেওয়ার সর্বোচ্চ আকার (এর বড় হলে টুকরো করে নিতে হবে) */
const WHOLE_LIMIT = 40 * 1024 * 1024;

/**
 * পুরো ফাইল এক অনুরোধে। ছোট ফাইলের (৯৯.৯%) জন্য এটিই ব্যবহৃত হয় —
 * পুরনো পথ, তাই আচরণ অপরিবর্তিত।
 *
 * বড় ফাইলে এখানে ঢুকতে দেওয়া হয় না: DriveApp পুরোটা মেমরিতে তোলে, তাতে
 * স্ক্রিপ্ট আটকে গিয়ে কোটা নষ্ট হয়। সীমাটি পুরনো ক্লায়েন্টের ৩৫ MB এর
 * চেয়ে বেশি রাখা হয়েছে, যাতে ক্যাশে থাকা পুরনো পাতাও ভেঙে না যায়।
 */
function downloadWhole(fileId) {
  const file = DriveApp.getFileById(fileId);
  if (file.getSize() > WHOLE_LIMIT) {
    return json({
      success: false,
      error: 'ফাইলটি বড় — start ও len দিয়ে টুকরো করে নিন'
    });
  }
  const blob = file.getBlob();
  const encoded = Utilities.base64Encode(blob.getBytes());
  return payload({
    fileName: file.getName(),
    mimeType: blob.getContentType() || 'application/octet-stream',
    size: file.getSize()
  }, encoded);
}

/**
 * ফাইলের একটি টুকরো — [start, start+len)।
 *
 * DriveApp দিয়ে ফাইলের অংশ পড়া যায় না, পুরোটা মেমরিতে তুলতে হয়; ৯০৫ MB এর
 * ফাইলে তা অসম্ভব। তাই Drive API কে Range হেডার দিয়ে ডাকা হচ্ছে — কেবল
 * চাওয়া বাইটগুলোই আসে, মেমরিও টুকরোর সমান থাকে।
 *
 * উত্তরে start/len/eof থাকে, যাতে ক্লায়েন্ট বুঝতে পারে টুকরো পেয়েছে
 * (পুরনো সংস্করণ এগুলো পাঠাত না)।
 */
function downloadChunk(fileId, start, len) {
  if (!(len > 0)) return json({ success: false, error: 'len ঠিক নেই' });
  if (len > MAX_CHUNK) len = MAX_CHUNK;

  const file = DriveApp.getFileById(fileId);
  const size = file.getSize();
  if (start >= size) return json({ success: false, error: 'start ফাইলের আকারের বাইরে' });
  if (start + len > size) len = size - start;

  /* Drive মাঝেমধ্যে ৫xx দেয়। এখানেই একবার আবার চেষ্টা করলে ক্লায়েন্টকে
     পুরো রাউন্ড-ট্রিপ ঘুরে আসতে হয় না — ডাউনলোড কম ব্যর্থ হয়। */
  let res = null, code = 0;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) Utilities.sleep(600);
    res = UrlFetchApp.fetch(
      'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId)
        + '?alt=media&supportsAllDrives=true',
      {
        method: 'get',
        headers: {
          Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
          Range: 'bytes=' + start + '-' + (start + len - 1)
        },
        muteHttpExceptions: true
      });
    code = res.getResponseCode();
    // ২০৬ = আংশিক (যা চাই), ২০০ = পুরোটা পাঠিয়ে দিয়েছে
    if (code === 206 || code === 200) break;
    if (code < 500) break;   // ৪xx স্থায়ী ভুল — আবার চেষ্টা করে লাভ নেই
  }

  if (code !== 206 && code !== 200) {
    return json({ success: false, error: 'Drive সাড়া দেয়নি (' + code + ')' });
  }
  let bytes = res.getContent();
  if (code === 200 && bytes.length > len) bytes = bytes.slice(start, start + len);

  return payload({
    fileName: file.getName(),
    mimeType: file.getMimeType() || 'application/octet-stream',
    size: size,
    start: start,
    len: bytes.length,
    eof: (start + bytes.length) >= size
  }, Utilities.base64Encode(bytes));
}

/**
 * অনুমতি নেওয়ার জন্য — এডিটরে একবার Run করুন।
 * নতুন স্কোপ দুটি: Drive পড়া (আগেই ছিল) ও বাইরের ঠিকানায় অনুরোধ (নতুন)।
 */
function authorize() {
  DriveApp.getFolderById(DEFAULT_FOLDER_ID).getName();
  UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/about?fields=kind', {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  Logger.log('অনুমতি ঠিক আছে — এবার Deploy → Manage deployments → New version');
}
