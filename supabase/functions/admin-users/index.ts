// @ts-nocheck
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

  // Caller's auth — used to verify they are an active admin
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) return json({ error: 'Missing auth' }, 401)

  // Client that acts AS the caller (anon key + their JWT)
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error: userErr } = await caller.auth.getUser()
  if (userErr || !user) return json({ error: 'Invalid token' }, 401)

  const { data: profile, error: profErr } = await caller
    .from('profiles')
    .select('role, active, username')
    .eq('id', user.id)
    .maybeSingle()

  if (profErr || !profile) return json({ error: 'Profile not found' }, 403)
  if (profile.role !== 'admin' || !profile.active) return json({ error: 'Forbidden' }, 403)

  // From here on, caller is a verified active admin
  // Use service-role client for privileged operations
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const action = body.action

  try {
    if (action === 'createUser') {
      return await handleCreateUser(body, admin)
    }
    if (action === 'resetPassword') {
      return await handleResetPassword(body, admin)
    }
    if (action === 'updateUser') {
      return await handleUpdateUser(body, admin, profile.username, user.id)
    }
    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: (err as Error).message || String(err) }, 500)
  }
})

// ===========================================================
// CREATE USER
// ===========================================================
async function handleCreateUser(body: any, admin: any) {
  const username = String(body.username || '').trim().toLowerCase()
  const password = String(body.password || '')
  const role = String(body.role || '')
  const displayName = String(body.displayName || '').trim()

  if (!username || !password || !displayName) return json({ error: 'Missing fields' }, 400)
  if (role !== 'admin' && role !== 'sales') return json({ error: 'Invalid role' }, 400)

  // Check username uniqueness in profiles
  const { data: existing } = await admin
    .from('profiles').select('id').eq('username', username).maybeSingle()
  if (existing) return json({ error: 'Username already exists' }, 400)

  const email = `${username}@ambria.local`

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr) return json({ error: createErr.message }, 400)

  const { error: profErr } = await admin.from('profiles').insert({
    id: created.user.id,
    username,
    display_name: displayName,
    role,
    active: true,
  })

  if (profErr) {
    // Roll back the auth user if profile insert failed
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: 'Profile creation failed: ' + profErr.message }, 500)
  }

  return json({ ok: true })
}

// ===========================================================
// RESET PASSWORD
// ===========================================================
async function handleResetPassword(body: any, admin: any) {
  const username = String(body.username || '').trim().toLowerCase()
  const newPassword = String(body.newPassword || '')
  if (!username || !newPassword) return json({ error: 'Missing fields' }, 400)

  const { data: profile, error } = await admin
    .from('profiles').select('id').eq('username', username).maybeSingle()
  if (error || !profile) return json({ error: 'User not found' }, 404)

  const { error: updErr } = await admin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  })
  if (updErr) return json({ error: updErr.message }, 500)

  return json({ ok: true })
}

// ===========================================================
// UPDATE USER — role, active, displayName
// ===========================================================
async function handleUpdateUser(body: any, admin: any, callerUsername: string, callerId: string) {
  const username = String(body.username || '').trim().toLowerCase()
  if (!username) return json({ error: 'Username required' }, 400)

  const { data: target, error } = await admin
    .from('profiles').select('id, role, active').eq('username', username).maybeSingle()
  if (error || !target) return json({ error: 'User not found' }, 404)

  const newRole = body.role !== undefined ? String(body.role) : target.role
  const newActive = body.active !== undefined ? (body.active === true) : target.active
  const newDisplayName = body.displayName !== undefined ? String(body.displayName).trim() : null

  // Guard: self-lockout protection
  if (target.id === callerId) {
    if (newActive === false) return json({ error: 'Cannot deactivate yourself' }, 400)
    if (newRole !== 'admin') return json({ error: 'Cannot change your own role' }, 400)
  }

  // Guard: at least one active admin must remain
  const wasActiveAdmin = target.role === 'admin' && target.active
  const stillActiveAdmin = newRole === 'admin' && newActive
  if (wasActiveAdmin && !stillActiveAdmin) {
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('active', true)
      .neq('id', target.id)
    if ((count ?? 0) < 1) return json({ error: 'At least one active admin required' }, 400)
  }

  const update: any = { role: newRole, active: newActive }
  if (newDisplayName !== null) update.display_name = newDisplayName

  const { error: updErr } = await admin
    .from('profiles').update(update).eq('id', target.id)
  if (updErr) return json({ error: updErr.message }, 500)

  return json({ ok: true })
}