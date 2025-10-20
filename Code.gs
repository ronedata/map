// Code.gs
// ======================
// প্রথমে এখানে আপনার প্রথম (root) folderId দিন
const DEFAULT_FOLDER_ID = '1T1GWNPpszx44Mj42u7tLXaP3ac3t4yRb'; // <-- এখানে আপনার folderId দিন

/**
 * doGet handler: supports:
 *  - action=listChildren&folderId=...  -> returns immediate children (folders + files)
 *  - action=download&fileId=...        -> returns base64 payload for small files (optional)
 */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = (params.action || 'listChildren').toLowerCase();

    if (action === 'download' && params.fileId) {
      return proxyDownload(params.fileId);
    }

    // default: list children of folderId (or DEFAULT_FOLDER_ID)
    const folderId = params.folderId || DEFAULT_FOLDER_ID;
    const data = listChildren(folderId);
    const out = ContentService.createTextOutput(JSON.stringify({ success: true, data: data }));
    out.setMimeType(ContentService.MimeType.JSON);
    return out;

  } catch (err) {
    const errorObj = { success: false, error: err.message };
    const out = ContentService.createTextOutput(JSON.stringify(errorObj));
    out.setMimeType(ContentService.MimeType.JSON);
    return out;
  }
}

/**
 * Return immediate children (folders and files) for a given folderId
 * Response:
 * { id, name, type: 'folder'|'file', (for file: mimeType,size,url) }
 */
function listChildren(folderId) {
  var folder = DriveApp.getFolderById(folderId);
  var result = {
    id: folder.getId(),
    name: folder.getName(),
    folders: [],
    files: []
  };

  // folders
  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    var sf = subfolders.next();
    result.folders.push({
      id: sf.getId(),
      name: sf.getName(),
      type: 'folder'
    });
  }

  // files
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    result.files.push({
      id: f.getId(),
      name: f.getName(),
      mimeType: f.getMimeType(),
      size: f.getSize(),
      url: f.getUrl() // Drive URL (may require permissions)
    });
  }

  return result;
}

/**
 * Optional: Proxy download (base64) for smaller files.
 * WARNING: Apps Script has response size limits (~50MB or less depending), so
 * do not use for very large files.
 *
 * Returns JSON:
 * { fileName, mimeType, base64 }
 */
function proxyDownload(fileId) {
  var file = DriveApp.getFileById(fileId);
  var blob = file.getBlob();
  var bytes = blob.getBytes();
  var encoded = Utilities.base64Encode(bytes);
  var payload = {
    fileName: file.getName(),
    mimeType: blob.getContentType(),
    base64: encoded
  };
  var out = ContentService.createTextOutput(JSON.stringify({ success: true, data: payload }));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
