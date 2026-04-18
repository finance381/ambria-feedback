import { useEffect, useState } from 'react';
import { listSalesPeople, addSalesPerson, updateSalesPerson } from '../../lib/api';

export default function SalesTeamTab({ session }) {
  var [people, setPeople] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');
  var [newName, setNewName] = useState('');
  var [adding, setAdding] = useState(false);
  var [editId, setEditId] = useState(null);
  var [editName, setEditName] = useState('');
  var [saving, setSaving] = useState(false);

  useEffect(function () {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      var res = await listSalesPeople();
      setPeople(res.people || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    }
    setLoading(false);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      await addSalesPerson(newName.trim());
      setNewName('');
      await load();
    } catch (e) {
      setError(e.message || 'Failed to add');
    }
    setAdding(false);
  }

  async function handleToggle(person) {
    setSaving(true);
    setError('');
    try {
      await updateSalesPerson(person.id, { active: !person.active });
      await load();
    } catch (e) {
      setError(e.message || 'Failed to update');
    }
    setSaving(false);
  }

  async function handleRename(person) {
    if (!editName.trim() || editName.trim() === person.name) {
      setEditId(null);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateSalesPerson(person.id, { name: editName.trim() });
      setEditId(null);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to rename');
    }
    setSaving(false);
  }

  return (
    <>
      <div className="fb-panel">
        <div className="fb-panel-title">Add Sales Person</div>
        <div className="fb-inline-row">
          <input
            className="fb-input"
            placeholder="Full name"
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
        <div className="fb-panel-title">Sales Team</div>
        {loading && <p className="fb-muted">Loading…</p>}
        {!loading && !people.length && <p className="fb-muted">No sales people added yet</p>}
        {!loading && people.length > 0 && (
          <div className="fb-table-wrap">
            <table className="fb-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {people.map(function (p) {
                  var isEditing = editId === p.id;
                  return (
                    <tr key={p.id}>
                      <td>
                        {isEditing ? (
                          <input
                            className="fb-input"
                            value={editName}
                            onChange={function (e) { setEditName(e.target.value); }}
                            onKeyDown={function (e) { if (e.key === 'Enter') handleRename(p); }}
                            onBlur={function () { handleRename(p); }}
                            autoFocus
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
                          />
                        ) : p.name}
                      </td>
                      <td>
                        <span className={'fb-pill ' + (p.active ? 'fb-pill-ok' : 'fb-pill-off')}>
                          {p.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="fb-inline-row" style={{ justifyContent: 'flex-end' }}>
                          {!isEditing && (
                            <button
                              className="fb-btn-ghost"
                              onClick={function () { setEditId(p.id); setEditName(p.name); }}
                              disabled={saving}
                            >Rename</button>
                          )}
                          <button
                            className={'fb-btn-ghost' + (!p.active ? '' : ' fb-btn-danger')}
                            onClick={function () { handleToggle(p); }}
                            disabled={saving}
                          >
                            {p.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}