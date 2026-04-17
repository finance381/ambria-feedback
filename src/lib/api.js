var SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL;

/**
 * Single POST helper. Uses text/plain to skip CORS preflight.
 * Apps Script still parses e.postData.contents as JSON.
 */
export async function postToSheet(payload) {
  if (!SCRIPT_URL) {
    throw new Error('Missing VITE_SCRIPT_URL — check your .env file');
  }
  var res;
  try {
    res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
  } catch (e) {
    throw new Error('Network error. Check connection.');
  }
  var data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('Bad response from server');
  }
  if (!data.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

// ===== Auth =====
export function login(username, password) {
  return postToSheet({ action: 'login', username: username, password: password });
}

// ===== Reviews =====
export function submitReview(token, fields) {
  return postToSheet(Object.assign({ action: 'submitReview', token: token }, fields));
}

export function listReviews(token) {
  return postToSheet({ action: 'listReviews', token: token });
}

// ===== Venues =====
export function listVenues(token) {
  return postToSheet({ action: 'listVenues', token: token });
}

export function listAllVenues(token) {
  return postToSheet({ action: 'listAllVenues', token: token });
}

export function addVenue(token, name) {
  return postToSheet({ action: 'addVenue', token: token, name: name });
}

export function updateVenue(token, oldName, newName, active) {
  return postToSheet({ action: 'updateVenue', token: token, oldName: oldName, newName: newName, active: active });
}

// ===== Users =====
export function listUsers(token) {
  return postToSheet({ action: 'listUsers', token: token });
}

export function addUser(token, payload) {
  return postToSheet(Object.assign({ action: 'addUser', token: token }, payload));
}

export function updateUser(token, payload) {
  return postToSheet(Object.assign({ action: 'updateUser', token: token }, payload));
}

export function resetPassword(token, username, newPassword) {
  return postToSheet({ action: 'resetPassword', token: token, username: username, newPassword: newPassword });
}
