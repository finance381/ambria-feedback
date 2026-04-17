import { useEffect, useState } from 'react';
import { listAllVenues, addVenue, updateVenue } from '../../lib/api';

export default function VenuesTab({ session }) {
  var [venues, setVenues] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [newName, setNewName] = useState('');
  var [adding, setAdding] = useState(false);
  var [editing, setEditing] = useState(null); // { oldName, newName }
  var [busy, setBusy] = useState('');

  useEffect(function () { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      var res = await listAllVenues();
      setVenues(res.venues || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    }
    setLoading(false);
  }

  async function handleAdd() {
    var n = newName.trim();
    if (!n) return;
    setAdding(true);
    setError('');
    try {
      await addVenue(n);
      setNewName('');
      await load();
    } catch (e) {
      setError(e.message);
    }
    setAdding(false);
  }

  async function toggleActive(v) {
    setBusy(v.name);
    setError('');
    try {
      await updateVenue(v.name, '', !v.active);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy('');
  }

  async function saveRename() {
    if (!editing) return;
    var n = editing.newName.trim();
    if (!n || n === editing.oldName) {
      setEditing(null);
      return;
    }
    setBusy(editing.oldName);
    setError('');
    try {
      await updateVenue(editing.oldName, n);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy('');
  }

  return (
    <>
      <div className="fb-panel">
        <div className="fb-panel-title">Add Venue</div>
        <div className="fb-inline-row" style={{ gap: '0.75rem' }}>
          <input
            className="fb-input"
            placeholder="e.g. Grand Ballroom"
            value={newName}
            onChange={function (e) { setNewName(e.target.value); }}
            onKeyDown={function (e) { if (e.key === 'Enter') handleAdd(); }}
            style={{ flex: 1 }}
          />
          <button className="fb-btn fb-btn-inline" onClick={handleAdd} disabled={adding || !newName.trim()}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        {error && <p className="fb-error" style={{ textAlign: 'left', marginTop: '0.75rem' }}>{error}</p>}
      </div>

      <div className="fb-panel">
        <div className="fb-panel-title">All Venues</div>
        <div className="fb-table-wrap">
          <table className="fb-table">
            <thead>
              <tr>
                <th>Venue Name</th>
                <th>Status</th>
                <th style={{ width: '280px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={3} className="fb-muted">Loading…</td></tr>}
              {!loading && !venues.length && <tr><td colSpan={3} className="fb-muted">No venues yet</td></tr>}
              {venues.map(function (v) {
                var isEditing = editing && editing.oldName === v.name;
                return (
                  <tr key={v.name}>
                    <td>
                      {isEditing ? (
                        <input
                          className="fb-input"
                          value={editing.newName}
                          onChange={function (e) { setEditing(Object.assign({}, editing, { newName: e.target.value })); }}
                          autoFocus
                          onKeyDown={function (e) {
                            if (e.key === 'Enter') saveRename();
                            if (e.key === 'Escape') setEditing(null);
                          }}
                        />
                      ) : v.name}
                    </td>
                    <td>
                      <span className={'fb-pill ' + (v.active ? 'fb-pill-ok' : 'fb-pill-off')}>
                        {v.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="fb-inline-row">
                        {isEditing ? (
                          <>
                            <button className="fb-btn-ghost" onClick={saveRename} disabled={busy === v.name}>Save</button>
                            <button className="fb-btn-ghost" onClick={function () { setEditing(null); }}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button
                              className="fb-btn-ghost"
                              onClick={function () { setEditing({ oldName: v.name, newName: v.name }); }}
                              disabled={busy === v.name}
                            >Rename</button>
                            <button
                              className="fb-btn-ghost"
                              onClick={function () { toggleActive(v); }}
                              disabled={busy === v.name}
                            >{v.active ? 'Deactivate' : 'Reactivate'}</button>
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
    </>
  );
}
