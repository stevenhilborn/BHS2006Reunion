/**
 * BANNING BRONCOS CLASS OF 2006 - SITE BACKEND
 *
 * Handles BOTH the memories guestbook and the "current photo"
 * uploads under each classmate portrait.
 *
 * Paste this whole file into a Google Apps Script project that is
 * bound to a Google Sheet, then deploy it as a Web app.
 * Step-by-step instructions are in READ-ME-FIRST.txt.
 */

var SHEET_NAME    = 'Memories';
var NOW_SHEET     = 'CurrentPhotos';
var FOLDER_NAME   = 'Reunion Memory Photos';
var NOW_FOLDER    = 'Reunion Current Photos';

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}
function memSheet_() { return sheet_(SHEET_NAME, ['Timestamp', 'Name', 'Memory', 'Photo', 'Approved']); }
function nowSheet_() { return sheet_(NOW_SHEET, ['Timestamp', 'Classmate', 'File', 'Photo', 'Approved']); }

function folder_(name) {
  var it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function savePhoto_(dataUrl, who, folderName) {
  var m = String(dataUrl).match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!m) return '';   // only real image uploads are accepted
  var bytes = Utilities.base64Decode(m[2]);
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');
  var safe  = String(who).replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 40) || 'guest';
  var ext   = { 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[m[1]] || 'jpg';
  var blob  = Utilities.newBlob(bytes, m[1], safe + '-' + stamp + '.' + ext);
  var file  = folder_(folderName).createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
}

/* ----------------------------------------------------------- */

function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) || 'memories';

  if (type === 'now') {
    var rows = nowSheet_().getDataRange().getValues();
    var map = {};
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      if (!r[2] || !r[3]) continue;
      if (String(r[4]).toLowerCase() === 'no') continue;
      map[String(r[2])] = String(r[3]);   // newest row for a file wins
    }
    return json_({ ok: true, photos: map });
  }

  var mrows = memSheet_().getDataRange().getValues();
  var out = [];
  for (var j = 1; j < mrows.length; j++) {
    var m = mrows[j];
    if (!m[1] && !m[2]) continue;
    if (String(m[4]).toLowerCase() === 'no') continue;
    out.push({
      when:   Utilities.formatDate(new Date(m[0]), Session.getScriptTimeZone(), 'MMMM d, yyyy'),
      author: String(m[1]),
      body:   String(m[2]),
      photo:  String(m[3] || '')
    });
  }
  out.reverse();
  return json_({ ok: true, entries: out });
}

function doPost(e) {
  try {
    var p = e.parameter || {};
    var type = String(p.type || 'memory');

    if (type === 'now') {
      var who  = String(p.classmate || '').trim().slice(0, 80);
      var file = String(p.file || '').trim().slice(0, 120);
      if (!who || !file || !p.photo) return json_({ ok: false, error: 'Missing photo' });
      var nurl = savePhoto_(p.photo, who, NOW_FOLDER);
      if (!nurl) return json_({ ok: false, error: 'Bad image' });
      nowSheet_().appendRow([new Date(), who, file, nurl, 'yes']);
      return json_({ ok: true, url: nurl });
    }

    var name = String(p.author || '').trim().slice(0, 80);
    var body = String(p.body   || '').trim().slice(0, 4000);
    if (!name || !body) return json_({ ok: false, error: 'Missing name or memory' });

    var url = '';
    if (p.photo) {
      try { url = savePhoto_(p.photo, name, FOLDER_NAME); } catch (err) { url = ''; }
    }
    memSheet_().appendRow([new Date(), name, body, url, 'yes']);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}
