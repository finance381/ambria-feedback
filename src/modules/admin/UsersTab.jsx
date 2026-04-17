import { useEffect, useState } from 'react';
import { listUsers, addUser, updateUser, resetPassword } from '../../lib/api';

export default function UsersTab({ session }) {
  var [users, setUsers] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');

  var [showAdd, setShowAdd] = useState(false);
  var [newUser, setNewUser] = useState({ username: '', displayName: '', role: 'sales', password: '' });
  var [adding, setAdding] = useState(false);

  var [editing, setEditing] = useState(null); // full user object
  var [resetFor, setResetFor] = useState(null); // username
  var [resetPwd, setResetPwd] = useState('');
  var [busy, setBusy] = useState('');

  useEffect(function () { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      var res = await listUsers();
      setUsers(res.users || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!newUser.username.trim() || !newUser.displayName.trim() || !newUser.password) {
      setError('Fill all fields');
      return;
    }
    setAdding(true);
    setError('');
    try {
      await addUser(newUser);
      setNewUser({ username: '', displayName: '', role: 'sales', password: '' });
      setShowAdd(false);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setAdding(false);
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(editing.username);
    setError('');
    try {
      await updateUser({
        username: editing.username,
        displayName: editing.displayName,
        role: editing.role,
        active: editing.active,
      });
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy('');
  }

  async function toggleActive(u) {
    if (u.username === session.username && u.active) {
      setError('Cannot deactivate yourself');
      return;
    }
    setBusy(u.username);
    setError('');
    try {
      await updateUser({ username: u.username, active: !u.active });
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy('');
  }

  async function doReset() {
    if (!resetFor || !resetPwd) return;
    setBusy(resetFor);
    setError('');
    try {
      await resetPassword(resetFor, resetPwd);
      setResetFor(null);
      setResetPwd('');
    } catch (e) {
      setError(e.message);
    }
    setBusy('');
  }

  return (
    <>
      <div className="fb-panel">
        <div className="fb-inline-row" style={{ justifyContent: 'space-between' }}>
          <div className="fb-panel-title" style={{ marginBottom: 0 }}>Staff Users</div>
          <button className="fb-btn-ghost" onClick={function () { setShowAdd(true); setError(''); }}>
            + Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="fb-panel">
          <p className="fb-error" style={{ textAlign: 'left' }}>{error}</p>
        </div>
      )}

      <div className="fb-panel">
        <div className="fb-table-wrap">
          <table className="fb-table">
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ width: '340px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="fb-muted">Loading…</td></tr>}
              {!loading && !users.length && <tr><td colSpan={5} className="fb-muted">No users</td></tr>}
              {users.map(function (u) {
                var isEditing = editing && editing.username === u.username;
                var isSelf = u.username === session.username;
                return (
                  <tr key={u.username}>
                    <td>
                      {isEditing ? (
                        <input
                          className="fb-input"
                          value={editing.displayName}
                          onChange={function (e) { setEditing(Object.assign({}, editing, { displayName: e.target.value })); }}
                        />
                      ) : u.displayName}
                    </td>
                    <td>{u.username}{isSelf && <span className="fb-muted"> (you)</span>}</td>
                    <td>
                      {isEditing ? (
                        <div className="fb-select-wrap">
                          <select
                            className="fb-select"
                            value={editing.role}
                            onChange={function (e) { setEditing(Object.assign({}, editing, { role: e.target.value })); }}
                            disabled={isSelf}
                          >
                            <option value="sales">Sales</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      ) : (
                        <span className={'fb-pill ' + (u.role === 'admin' ? 'fb-pill-admin' : 'fb-pill-sales')}>
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={'fb-pill ' + (u.active ? 'fb-pill-ok' : 'fb-pill-off')}>
                        {u.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="fb-inline-row">
                        {isEditing ? (
                          <>
                            <button className="fb-btn-ghost" onClick={saveEdit} disabled={busy === u.username}>Save</button>
                            <button className="fb-btn-ghost" onClick={function () { setEditing(null); }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button
                              className="fb-btn-ghost"
                              onClick={function () { setEditing(Object.assign({}, u)); }}
                              disabled={busy === u.username}
                            >Edit</button>
                            <button
                              className="fb-btn-ghost"
                              onClick={function () { setResetFor(u.username); setResetPwd(''); setError(''); }}
                              disabled={busy === u.username}
                            >Reset PW</button>
                            <button
                              className="fb-btn-ghost fb-btn-danger"
                              onClick={function () { toggleActive(u); }}
                              disabled={busy === u.username || (isSelf && u.active)}
                            >{u.active ? 'Deactivate' : 'Reactivate'}</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fb-modal-backdrop" onClick={function () { setShowAdd(false); }}>
          <div className="fb-modal" onClick={function (e) { e.stopPropagation(); }}>
            <h3 className="fb-heading" style={{ textAlign: 'left', marginBottom: '1.25rem' }}>Add New User</h3>

            <div className="fb-field">
              <label className="fb-label">Display Name</label>
              <input
                className="fb-input"
                value={newUser.displayName}
                onChange={function (e) { setNewUser(Object.assign({}, newUser, { displayName: e.target.value })); }}
              />
            </div>
            <div className="fb-field">
              <label className="fb-label">Username</label>
              <input
                className="fb-input"
                autoCapitalize="none"
                value={newUser.username}
                onChange={function (e) { setNewUser(Object.assign({}, newUser, { username: e.target.value })); }}
              />
            </div>
            <div className="fb-field">
              <label className="fb-label">Role</label>
              <div className="fb-select-wrap">
                <select
                  className="fb-select"
                  value={newUser.role}
                  onChange={function (e) { setNewUser(Object.assign({}, newUser, { role: e.target.value })); }}
                >
                  <option value="sales">Sales</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="fb-field">
              <label className="fb-label">Initial Password</label>
              <input
                className="fb-input"
                type="text"
                value={newUser.password}
                onChange={function (e) { setNewUser(Object.assign({}, newUser, { password: e.target.value })); }}
              />
              <p className="fb-muted" style={{ marginTop: '0.4rem', fontSize: '0.7rem' }}>
                Share this with the user, they can't see it after
              </p>
            </div>

            {error && <p className="fb-error" style={{ textAlign: 'left' }}>{error}</p>}

            <div className="fb-inline-row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="fb-btn-ghost" onClick={function () { setShowAdd(false); }}>Cancel</button>
              <button className="fb-btn fb-btn-inline" onClick={handleAdd} disabled={adding}>
                {adding ? 'Adding…' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetFor && (
        <div className="fb-modal-backdrop" onClick={function () { setResetFor(null); }}>
          <div className="fb-modal" onClick={function (e) { e.stopPropagation(); }}>
            <h3 className="fb-heading" style={{ textAlign: 'left', marginBottom: '0.5rem' }}>Reset Password</h3>
            <p className="fb-muted" style={{ marginBottom: '1.25rem' }}>For user: {resetFor}</p>

            <div className="fb-field">
              <label className="fb-label">New Password</label>
              <input
                className="fb-input"
                type="text"
                value={resetPwd}
                onChange={function (e) { setResetPwd(e.target.value); }}
                autoFocus
              />
            </div>

            {error && <p className="fb-error" style={{ textAlign: 'left' }}>{error}</p>}

            <div className="fb-inline-row" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button className="fb-btn-ghost" onClick={function () { setResetFor(null); }}>Cancel</button>
              <button className="fb-btn fb-btn-inline" onClick={doReset} disabled={!resetPwd || busy === resetFor}>
                {busy === resetFor ? 'Saving…' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
