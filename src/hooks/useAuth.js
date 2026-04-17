import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

var PROFILE_KEY = 'ambria.profile';

/**
 * Auth hook backed by Supabase. `session` exposes the app profile
 * (username, role, displayName) — not the raw Supabase session, which
 * the client handles automatically.
 */
export function useAuth() {
  var [session, setSession] = useState(function () { return readProfile(); });
  var [loading, setLoading] = useState(true);

  useEffect(function () {
    var mounted = true;

    // Initial check — is there a live Supabase session?
    supabase.auth.getSession().then(function (res) {
      if (!mounted) return;
      if (!res.data.session) {
        writeProfile(null);
        setSession(null);
        setLoading(false);
        return;
      }
      // Session exists, make sure our cached profile is still valid
      var cached = readProfile();
      if (cached) {
        setSession(cached);
        setLoading(false);
      } else {
        // No cached profile but live session — refetch from DB
        refreshProfile(res.data.session.user.id).then(function (p) {
          if (!mounted) return;
          setSession(p);
          setLoading(false);
        });
      }
    });

    // Listen for auth changes (logout, token refresh, session expiry)
    var sub = supabase.auth.onAuthStateChange(function (event, authSession) {
      if (!mounted) return;
      if (event === 'SIGNED_OUT' || !authSession) {
        writeProfile(null);
        try { sessionStorage.removeItem('ambria.venues'); } catch (e) {}
        setSession(null);
      }
    });

    return function () {
      mounted = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  var saveSession = useCallback(function (profile) {
    writeProfile(profile);
    setSession(profile);
  }, []);

  var logout = useCallback(async function () {
    try { sessionStorage.removeItem('ambria.venues'); } catch (e) {}
    writeProfile(null);
    setSession(null);
    await supabase.auth.signOut();
  }, []);

  return { session: session, saveSession: saveSession, logout: logout, loading: loading };
}

async function refreshProfile(userId) {
  var { data } = await supabase
    .from('profiles')
    .select('username, display_name, role, active')
    .eq('id', userId)
    .maybeSingle();
  if (!data || !data.active) return null;
  var profile = { username: data.username, displayName: data.display_name, role: data.role };
  writeProfile(profile);
  return profile;
}

function readProfile() {
  try {
    var raw = sessionStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function writeProfile(p) {
  try {
    if (p) sessionStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    else sessionStorage.removeItem(PROFILE_KEY);
  } catch (e) {}
}