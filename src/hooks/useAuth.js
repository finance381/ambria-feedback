import { useEffect, useState, useCallback } from 'react';

var STORAGE_KEY = 'ambria.session';

export function useAuth() {
  var [session, setSession] = useState(function () { return readSession(); });

  // Sync across tabs (unlikely on a tablet but harmless)
  useEffect(function () {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setSession(readSession());
    }
    window.addEventListener('storage', onStorage);
    return function () { window.removeEventListener('storage', onStorage); };
  }, []);

  var saveSession = useCallback(function (data) {
    if (data) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setSession(data);
  }, []);

  var logout = useCallback(function () {
    try { sessionStorage.removeItem('ambria.venues'); } catch (e) {}
    saveSession(null);
  }, [saveSession]);

  return { session: session, saveSession: saveSession, logout: logout };
}

function readSession() {
  try {
    var raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
