import { createClient } from '@supabase/supabase-js'

var supabaseUrl = import.meta.env.VITE_SUPABASE_URL
var supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars — check your .env file')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'ambria.supabase.auth',
  },
})

/**
 * Username-to-email mapping. Keeps the username-only UX while using
 * Supabase Auth's email/password system under the hood.
 */
export function usernameToEmail(username) {
  return String(username).trim().toLowerCase() + '@ambria.local'
}

/**
 * Call the admin-users Edge Function.
 * Passes the current user's session token for server-side role validation.
 */
export async function callAdminFunction(action, payload) {
  var { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  var url = supabaseUrl + '/functions/v1/admin-users'
  var res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + session.access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(Object.assign({ action: action }, payload || {})),
  })
  var data
  try { data = await res.json() } catch (e) { throw new Error('Bad response from server') }
  if (!res.ok || data.error) throw new Error(data.error || 'Request failed')
  return data
}