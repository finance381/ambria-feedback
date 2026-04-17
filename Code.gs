/**
 * Ambria Cuisines — Guest Feedback Backend
 * Google Apps Script web app. Deploy as: Execute as Me, Access: Anyone.
 *
 * Sheet tabs required: Users, Venues, Reviews
 * Run seedFirstAdmin() ONCE from the editor before deploying.
 */

// ============================================================
// CONFIG
// ============================================================
var SHEET_USERS = 'Users';
var SHEET_VENUES = 'Venues';
var SHEET_REVIEWS = 'Reviews';

// Token signing secret. Change once, keep it. If you rotate, all users log out.
var TOKEN_SECRET = 'CHANGE_ME_TO_A_LONG_RANDOM_STRING_abc123xyz789';

// Token validity window (ms). 12 hours covers a full shift.
var TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

// ============================================================
// ENTRY POINT
// ============================================================
function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ ok: false, error: 'Invalid JSON' });
  }

  try {
    var action = body.action;

    // Public actions (no token)
    if (action === 'login') return handleLogin(body);

    // Protected actions — validate token first
    var auth = verifyToken(body.token);
    if (!auth.ok) return jsonOut({ ok: false, error: 'Unauthorized' });

    if (action === 'submitReview') return handleSubmitReview(body, auth);
    if (action === 'listVenues') return handleListVenues(auth, false);

    // Admin-only below
    if (auth.role !== 'admin') return jsonOut({ ok: false, error: 'Forbidden' });

    if (action === 'listReviews') return handleListReviews(body);
    if (action === 'listAllVenues') return handleListVenues(auth, true);
    if (action === 'addVenue') return handleAddVenue(body);
    if (action === 'updateVenue') return handleUpdateVenue(body);
    if (action === 'listUsers') return handleListUsers();
    if (action === 'addUser') return handleAddUser(body);
    if (action === 'updateUser') return handleUpdateUser(body, auth);
    if (action === 'resetPassword') return handleResetPassword(body);

    return jsonOut({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message || err) });
  }
}

// ============================================================
// AUTH HANDLERS
// ============================================================
function handleLogin(body) {
  var username = String(body.username || '').trim().toLowerCase();
  var password = String(body.password || '');
  if (!username || !password) return jsonOut({ ok: false, error: 'Missing credentials' });

  var user = findUser(username);
  if (!user) return jsonOut({ ok: false, error: 'Invalid credentials' });
  if (user.active !== true) return jsonOut({ ok: false, error: 'Account disabled' });
  if (user.passwordHash !== hashPassword(password)) return jsonOut({ ok: false, error: 'Invalid credentials' });

  var token = signToken(user.username, user.role);
  return jsonOut({
    ok: true,
    token: token,
    role: user.role,
    username: user.username,
    displayName: user.displayName,
  });
}

// ============================================================
// REVIEW HANDLERS
// ============================================================
function handleSubmitReview(body, auth) {
  var required = ['guestName', 'guestMobile', 'eventDate', 'functionLocation', 'food', 'beverage', 'service', 'overall'];
  for (var i = 0; i < required.length; i++) {
    if (!body[required[i]]) return jsonOut({ ok: false, error: 'Missing field: ' + required[i] });
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REVIEWS);
  sheet.appendRow([
    new Date(),
    auth.username,
    String(body.guestName).trim(),
    String(body.guestMobile).trim(),
    String(body.guestEmail || '').trim(),
    String(body.eventDate),
    String(body.functionLocation),
    String(body.food),
    String(body.beverage),
    String(body.service),
    String(body.overall),
    String(body.remarks || ''),
  ]);
  return jsonOut({ ok: true });
}

function handleListReviews(body) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_REVIEWS);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return jsonOut({ ok: true, reviews: [] });

  var reviews = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    reviews.push({
      timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      salesUser: r[1],
      guestName: r[2],
      guestMobile: r[3],
      guestEmail: r[4],
      eventDate: r[5],
      functionLocation: r[6],
      food: r[7],
      beverage: r[8],
      service: r[9],
      overall: r[10],
      remarks: r[11],
    });
  }
  return jsonOut({ ok: true, reviews: reviews.reverse() });
}

// ============================================================
// VENUE HANDLERS
// ============================================================
function handleListVenues(auth, includeInactive) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VENUES);
  var values = sheet.getDataRange().getValues();
  var venues = [];
  for (var i = 1; i < values.length; i++) {
    var active = values[i][1] === true || String(values[i][1]).toUpperCase() === 'TRUE';
    if (!includeInactive && !active) continue;
    venues.push({ name: values[i][0], active: active });
  }
  return jsonOut({ ok: true, venues: venues });
}

function handleAddVenue(body) {
  var name = String(body.name || '').trim();
  if (!name) return jsonOut({ ok: false, error: 'Venue name required' });
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VENUES);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === name.toLowerCase()) {
      return jsonOut({ ok: false, error: 'Venue already exists' });
    }
  }
  sheet.appendRow([name, true]);
  return jsonOut({ ok: true });
}

function handleUpdateVenue(body) {
  var oldName = String(body.oldName || '');
  var newName = String(body.newName || '').trim();
  var active = body.active;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_VENUES);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === oldName) {
      if (newName) sheet.getRange(i + 1, 1).setValue(newName);
      if (active !== undefined) sheet.getRange(i + 1, 2).setValue(active === true);
      return jsonOut({ ok: true });
    }
  }
  return jsonOut({ ok: false, error: 'Venue not found' });
}

// ============================================================
// USER HANDLERS
// ============================================================
function handleListUsers() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  var values = sheet.getDataRange().getValues();
  var users = [];
  for (var i = 1; i < values.length; i++) {
    users.push({
      username: values[i][0],
      role: values[i][2],
      displayName: values[i][3],
      active: values[i][4] === true || String(values[i][4]).toUpperCase() === 'TRUE',
    });
  }
  return jsonOut({ ok: true, users: users });
}

function handleAddUser(body) {
  var username = String(body.username || '').trim().toLowerCase();
  var password = String(body.password || '');
  var role = String(body.role || '');
  var displayName = String(body.displayName || '').trim();
  if (!username || !password || !displayName) return jsonOut({ ok: false, error: 'Missing fields' });
  if (role !== 'admin' && role !== 'sales') return jsonOut({ ok: false, error: 'Invalid role' });
  if (findUser(username)) return jsonOut({ ok: false, error: 'Username already exists' });

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  sheet.appendRow([username, hashPassword(password), role, displayName, true]);
  return jsonOut({ ok: true });
}

function handleUpdateUser(body, auth) {
  var username = String(body.username || '').trim().toLowerCase();
  if (!username) return jsonOut({ ok: false, error: 'Username required' });

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  var values = sheet.getDataRange().getValues();
  var rowIdx = -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === username) { rowIdx = i; break; }
  }
  if (rowIdx === -1) return jsonOut({ ok: false, error: 'User not found' });

  var currentRole = values[rowIdx][2];
  var currentActive = values[rowIdx][4] === true || String(values[rowIdx][4]).toUpperCase() === 'TRUE';
  var newRole = body.role !== undefined ? String(body.role) : currentRole;
  var newActive = body.active !== undefined ? (body.active === true) : currentActive;

  // Guard 1: admin cannot deactivate or demote themselves
  if (username === auth.username) {
    if (newActive === false) return jsonOut({ ok: false, error: 'Cannot deactivate yourself' });
    if (newRole !== 'admin') return jsonOut({ ok: false, error: 'Cannot change your own role' });
  }

  // Guard 2: at least one active admin must remain
  if ((currentRole === 'admin' && currentActive) && (newRole !== 'admin' || !newActive)) {
    var activeAdmins = 0;
    for (var j = 1; j < values.length; j++) {
      var a = values[j][4] === true || String(values[j][4]).toUpperCase() === 'TRUE';
      if (values[j][2] === 'admin' && a && j !== rowIdx) activeAdmins++;
    }
    if (activeAdmins < 1) return jsonOut({ ok: false, error: 'At least one active admin required' });
  }

  if (body.displayName !== undefined) sheet.getRange(rowIdx + 1, 4).setValue(String(body.displayName).trim());
  sheet.getRange(rowIdx + 1, 3).setValue(newRole);
  sheet.getRange(rowIdx + 1, 5).setValue(newActive);
  return jsonOut({ ok: true });
}

function handleResetPassword(body) {
  var username = String(body.username || '').trim().toLowerCase();
  var newPassword = String(body.newPassword || '');
  if (!username || !newPassword) return jsonOut({ ok: false, error: 'Missing fields' });

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === username) {
      sheet.getRange(i + 1, 2).setValue(hashPassword(newPassword));
      return jsonOut({ ok: true });
    }
  }
  return jsonOut({ ok: false, error: 'User not found' });
}

// ============================================================
// HELPERS
// ============================================================
function findUser(username) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === username) {
      return {
        username: values[i][0],
        passwordHash: values[i][1],
        role: values[i][2],
        displayName: values[i][3],
        active: values[i][4] === true || String(values[i][4]).toUpperCase() === 'TRUE',
      };
    }
  }
  return null;
}

function hashPassword(plain) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, plain + '|' + TOKEN_SECRET);
  return bytesToHex(bytes);
}

function signToken(username, role) {
  var expires = Date.now() + TOKEN_TTL_MS;
  var payload = username + '.' + role + '.' + expires;
  var sigBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload + '|' + TOKEN_SECRET);
  var sig = bytesToHex(sigBytes);
  return Utilities.base64EncodeWebSafe(payload + '.' + sig);
}

function verifyToken(token) {
  if (!token) return { ok: false };
  try {
    var raw = Utilities.newBlob(Utilities.base64DecodeWebSafe(token)).getDataAsString();
    var parts = raw.split('.');
    if (parts.length !== 4) return { ok: false };
    var username = parts[0];
    var role = parts[1];
    var expires = Number(parts[2]);
    var sig = parts[3];
    if (Date.now() > expires) return { ok: false };
    var expected = bytesToHex(Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      username + '.' + role + '.' + expires + '|' + TOKEN_SECRET
    ));
    if (sig !== expected) return { ok: false };
    // Re-check user is still active
    var user = findUser(username);
    if (!user || !user.active) return { ok: false };
    return { ok: true, username: username, role: role };
  } catch (e) {
    return { ok: false };
  }
}

function bytesToHex(bytes) {
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
    var h = b.toString(16);
    if (h.length === 1) h = '0' + h;
    hex += h;
  }
  return hex;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// ONE-TIME SETUP — Run manually from editor
// ============================================================

/**
 * Run this ONCE from the Apps Script editor to seed the first admin.
 * After this, manage users via the admin UI.
 *
 * Steps:
 *   1. Edit the username/password/displayName below
 *   2. Change TOKEN_SECRET at the top of this file to something random
 *   3. Save, then from the editor: Run → seedFirstAdmin
 *   4. Grant permissions when prompted
 *   5. Delete or comment out this function (optional, but cleaner)
 */
function seedFirstAdmin() {
  var username = 'admin';
  var password = 'changeme123';
  var displayName = 'Administrator';

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, SHEET_USERS, ['Username', 'PasswordHash', 'Role', 'DisplayName', 'Active']);
  ensureSheet(ss, SHEET_VENUES, ['VenueName', 'Active']);
  ensureSheet(ss, SHEET_REVIEWS, [
    'Timestamp', 'SalesUser', 'GuestName', 'GuestMobile', 'GuestEmail',
    'EventDate', 'FunctionLocation', 'Food', 'Beverage', 'Service', 'Overall', 'Remarks'
  ]);

  var sheet = ss.getSheetByName(SHEET_USERS);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === username.toLowerCase()) {
      Logger.log('Admin already exists. Delete manually first if you want to reseed.');
      return;
    }
  }
  sheet.appendRow([username.toLowerCase(), hashPassword(password), 'admin', displayName, true]);
  Logger.log('Seeded admin: ' + username + ' / ' + password + '  (change the password immediately)');
}

function ensureSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
}
