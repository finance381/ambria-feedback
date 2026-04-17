import { supabase, usernameToEmail, callAdminFunction } from './supabase'

// ===== Auth =====

export async function login(username, password) {
  var email = usernameToEmail(username)
  var { data, error } = await supabase.auth.signInWithPassword({ email: email, password: password })
  if (error) throw new Error('Invalid credentials')

  // Fetch profile — RLS lets us read our own row
  var { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('username, display_name, role, active')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profErr || !profile) {
    await supabase.auth.signOut()
    throw new Error('Profile not found')
  }
  if (!profile.active) {
    await supabase.auth.signOut()
    throw new Error('Account disabled')
  }

  // Pre-fetch venues for sales users (saves a round-trip)
  var venues = null
  if (profile.role === 'sales') {
    var { data: vs } = await supabase
      .from('venues')
      .select('name, active')
      .eq('active', true)
      .order('name')
    venues = vs || []
  }

  return {
    username: profile.username,
    displayName: profile.display_name,
    role: profile.role,
    venues: venues,
  }
}

export async function logout() {
  await supabase.auth.signOut()
}

// ===== Reviews =====

export async function submitReview(fields) {
  var { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  var row = {
    sales_user_id: user.id,
    guest_name: fields.guestName,
    guest_mobile: fields.guestMobile,
    guest_email: fields.guestEmail || null,
    event_date: fields.eventDate,
    function_location: fields.functionLocation,
    food: Number(fields.food),
    beverage: Number(fields.beverage),
    service: Number(fields.service),
    overall: Number(fields.overall),
    remarks: fields.remarks || null,
  }
  var { error } = await supabase.from('reviews').insert(row)
  if (error) throw new Error(error.message)
  return { ok: true }
}

export async function listReviews() {
  // Admin RLS lets us see all; joined sales profile for display
  var { data, error } = await supabase
    .from('reviews')
    .select('id, created_at, guest_name, guest_mobile, guest_email, event_date, function_location, food, beverage, service, overall, remarks, profiles(username, display_name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  // Flatten the join for UI compat with the old shape
  var reviews = (data || []).map(function (r) {
    return {
      timestamp: r.created_at,
      salesUser: r.profiles ? r.profiles.username : '',
      salesDisplayName: r.profiles ? r.profiles.display_name : '',
      guestName: r.guest_name,
      guestMobile: r.guest_mobile,
      guestEmail: r.guest_email || '',
      eventDate: r.event_date,
      functionLocation: r.function_location,
      food: r.food,
      beverage: r.beverage,
      service: r.service,
      overall: r.overall,
      remarks: r.remarks || '',
    }
  })
  return { reviews: reviews }
}

// ===== Venues =====

export async function listVenues() {
  var { data, error } = await supabase
    .from('venues')
    .select('name, active')
    .eq('active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return { venues: data || [] }
}

export async function listAllVenues() {
  var { data, error } = await supabase
    .from('venues')
    .select('name, active')
    .order('name')
  if (error) throw new Error(error.message)
  return { venues: data || [] }
}

export async function addVenue(name) {
  var trimmed = String(name).trim()
  if (!trimmed) throw new Error('Venue name required')
  var { error } = await supabase.from('venues').insert({ name: trimmed, active: true })
  if (error) {
    if (String(error.message).toLowerCase().indexOf('duplicate') !== -1) {
      throw new Error('Venue already exists')
    }
    throw new Error(error.message)
  }
  return { ok: true }
}

export async function updateVenue(oldName, newName, active) {
  var update = {}
  if (newName && String(newName).trim()) update.name = String(newName).trim()
  if (active !== undefined) update.active = active === true
  var { error } = await supabase.from('venues').update(update).eq('name', oldName)
  if (error) throw new Error(error.message)
  return { ok: true }
}

// ===== Users =====

export async function listUsers() {
  var { data, error } = await supabase
    .from('profiles')
    .select('username, display_name, role, active')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  var users = (data || []).map(function (p) {
    return {
      username: p.username,
      displayName: p.display_name,
      role: p.role,
      active: p.active,
    }
  })
  return { users: users }
}

export async function addUser(payload) {
  return callAdminFunction('createUser', payload)
}

export async function updateUser(payload) {
  return callAdminFunction('updateUser', payload)
}

export async function resetPassword(username, newPassword) {
  return callAdminFunction('resetPassword', { username: username, newPassword: newPassword })
}