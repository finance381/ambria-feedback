import { useEffect, useMemo, useState } from 'react';
import { listReviews } from '../../lib/api';
import { StarDisplay } from '../../components/StarRating';

function formatTimestamp(iso) {
  if (!iso) return '';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  } catch (e) { return String(iso); }
}

function formatEventDate(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toLocaleDateString();
  // Handle ISO from sheet
  try {
    var d = new Date(v);
    if (!isNaN(d.getTime())) return d.toLocaleDateString();
  } catch (e) {}
  return String(v);
}

export default function ReviewsTab({ session }) {
  var [reviews, setReviews] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');

  var [filterSales, setFilterSales] = useState('');
  var [filterVenue, setFilterVenue] = useState('');
  var [filterFrom, setFilterFrom] = useState('');
  var [filterTo, setFilterTo] = useState('');
  var [filterMinRating, setFilterMinRating] = useState('');
  var [search, setSearch] = useState('');
  var [lastRefresh, setLastRefresh] = useState(null);
  var [showExport, setShowExport] = useState(false);
  var [exportCols, setExportCols] = useState({
    timestamp: true,
    salesUser: true,
    guestName: true,
    guestMobile: true,
    guestEmail: true,
    eventDate: true,
    venue: true,
    food: true,
    beverage: true,
    service: true,
    overall: true,
    remarks: true,
  });

  useEffect(function () {
    loadReviews();
    var interval = setInterval(function () {
      loadReviews();
    }, 30000);
    return function () { clearInterval(interval); };
  }, []);

  async function loadReviews() {
    setLoading(true);
    setError('');
    try {
      var res = await listReviews();
      setReviews(res.reviews || []);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message || 'Failed to load reviews');
    }
    setLoading(false);
  }

  var uniqueSales = useMemo(function () {
    var s = {};
    reviews.forEach(function (r) { if (r.salesUser) s[r.salesUser] = true; });
    return Object.keys(s).sort();
  }, [reviews]);

  var uniqueVenues = useMemo(function () {
    var s = {};
    reviews.forEach(function (r) { if (r.functionLocation) s[r.functionLocation] = true; });
    return Object.keys(s).sort();
  }, [reviews]);

  var filtered = useMemo(function () {
    var q = search.trim().toLowerCase();
    return reviews.filter(function (r) {
      if (filterSales && r.salesUser !== filterSales) return false;
      if (filterVenue && r.functionLocation !== filterVenue) return false;
      if (filterFrom) {
        var t = new Date(r.timestamp);
        if (!isNaN(t.getTime()) && t < new Date(filterFrom)) return false;
      }
      if (filterTo) {
        var t2 = new Date(r.timestamp);
        var to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        if (!isNaN(t2.getTime()) && t2 > to) return false;
      }
      if (q) {
        var hay = (
          String(r.guestName || '') + ' ' +
          String(r.guestMobile || '') + ' ' +
          String(r.guestEmail || '') + ' ' +
          String(r.remarks || '')
        ).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      if (filterMinRating) {
        var minR = Number(filterMinRating);
        var overall = Number(r.overall) || 0;
        if (overall < minR) return false;
      }
      return true;
    });
  }, [reviews, filterSales, filterVenue, filterFrom, filterTo, filterMinRating, search]);

  var ALL_EXPORT_COLS = [
    { key: 'timestamp', header: 'Timestamp', get: function (r) { return formatTimestamp(r.timestamp); } },
    { key: 'salesUser', header: 'Sales User', get: function (r) { return r.salesUser || ''; } },
    { key: 'guestName', header: 'Guest Name', get: function (r) { return r.guestName || ''; } },
    { key: 'guestMobile', header: 'Mobile', get: function (r) { return r.guestMobile || ''; } },
    { key: 'guestEmail', header: 'Email', get: function (r) { return r.guestEmail || ''; } },
    { key: 'eventDate', header: 'Event Date', get: function (r) { return formatEventDate(r.eventDate); } },
    { key: 'venue', header: 'Function Location', get: function (r) { return r.functionLocation || ''; } },
    { key: 'food', header: 'Food', get: function (r) { return r.food || ''; } },
    { key: 'beverage', header: 'Beverage', get: function (r) { return r.beverage || ''; } },
    { key: 'service', header: 'Service', get: function (r) { return r.service || ''; } },
    { key: 'overall', header: 'Overall', get: function (r) { return r.overall || ''; } },
    { key: 'remarks', header: 'Remarks', get: function (r) { return r.remarks || ''; } },
  ];

  function toggleExportCol(key) {
    setExportCols(Object.assign({}, exportCols, Object.fromEntries([[key, !exportCols[key]]])));
  }

  function exportCSV() {
    var activeCols = ALL_EXPORT_COLS.filter(function (c) { return exportCols[c.key]; });
    if (!activeCols.length) return;

    var headers = activeCols.map(function (c) { return c.header; });
    var rows = filtered.map(function (r) {
      return activeCols.map(function (c) { return c.get(r); });
    });
    var csv = [headers].concat(rows).map(function (row) {
      return row.map(function (cell) {
        var s = String(cell == null ? '' : cell);
        if (s.indexOf('"') !== -1 || s.indexOf(',') !== -1 || s.indexOf('\n') !== -1) {
          s = '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(',');
    }).join('\n');

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'ambria-reviews-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExport(false);
  }

  function clearFilters() {
    setFilterSales('');
    setFilterVenue('');
    setFilterFrom('');
    setFilterTo('');
    setFilterMinRating('');
    setSearch('');
  }

  return (
    <>
      <div className="fb-panel">
        <div className="fb-panel-title">Filters</div>
        <div className="fb-filter-row">
          <div className="fb-field">
            <label className="fb-label">Sales User</label>
            <div className="fb-select-wrap">
              <select className="fb-select" value={filterSales} onChange={function (e) { setFilterSales(e.target.value); }}>
                <option value="">All</option>
                {uniqueSales.map(function (s) { return <option key={s} value={s}>{s}</option>; })}
              </select>
            </div>
          </div>
          <div className="fb-field">
            <label className="fb-label">Venue</label>
            <div className="fb-select-wrap">
              <select className="fb-select" value={filterVenue} onChange={function (e) { setFilterVenue(e.target.value); }}>
                <option value="">All</option>
                {uniqueVenues.map(function (v) { return <option key={v} value={v}>{v}</option>; })}
              </select>
            </div>
          </div>
          <div className="fb-field">
            <label className="fb-label">From</label>
            <input className="fb-input" type="date" value={filterFrom} onChange={function (e) { setFilterFrom(e.target.value); }} />
          </div>
          <div className="fb-field">
            <label className="fb-label">To</label>
            <input className="fb-input" type="date" value={filterTo} onChange={function (e) { setFilterTo(e.target.value); }} />
          </div>
          <div className="fb-field">
            <label className="fb-label">Min Overall</label>
            <div className="fb-select-wrap">
              <select className="fb-select" value={filterMinRating} onChange={function (e) { setFilterMinRating(e.target.value); }}>
                <option value="">Any</option>
                <option value="5">5 stars</option>
                <option value="4.5">4.5 +</option>
                <option value="4">4 +</option>
                <option value="3.5">3.5 +</option>
                <option value="3">3 +</option>
                <option value="2">2 +</option>
                <option value="1">1 +</option>
              </select>
            </div>
          </div>
          <div className="fb-field">
            <label className="fb-label">Search</label>
            <input className="fb-input" placeholder="name / mobile / remarks" value={search} onChange={function (e) { setSearch(e.target.value); }} />
          </div>
        </div>
        <div className="fb-inline-row" style={{ justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <span className="fb-muted">
            Showing {filtered.length} of {reviews.length}
            {lastRefresh ? ' · Updated ' + lastRefresh.toLocaleTimeString() : ''}
          </span>
          <div className="fb-inline-row">
            <button className="fb-btn-ghost" onClick={clearFilters}>Clear</button>
            <button className="fb-btn-ghost" onClick={loadReviews} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="fb-btn-ghost" onClick={function () { setShowExport(true); }} disabled={!filtered.length}>Export CSV</button>
          </div>
        </div>
      </div>

      {showExport && (
        <div className="fb-modal-backdrop" onClick={function () { setShowExport(false); }}>
          <div className="fb-modal" onClick={function (e) { e.stopPropagation(); }}>
            <h3 className="fb-heading" style={{ marginBottom: '0.25rem' }}>Export Reviews</h3>
            <p className="fb-muted" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              {filtered.length} reviews match current filters
            </p>
            <div className="fb-panel-title" style={{ marginBottom: '0.75rem' }}>Include Columns</div>
            <div className="fb-export-grid">
              {ALL_EXPORT_COLS.map(function (c) {
                return (
                  <label key={c.key} className="fb-export-check">
                    <input
                      type="checkbox"
                      checked={exportCols[c.key]}
                      onChange={function () { toggleExportCol(c.key); }}
                    />
                    <span>{c.header}</span>
                  </label>
                );
              })}
            </div>
            <div className="fb-inline-row" style={{ justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="fb-btn-ghost" onClick={function () { setShowExport(false); }}>Cancel</button>
              <button className="fb-btn fb-btn-inline" onClick={exportCSV}>Download CSV</button>
            </div>
          </div>
        </div>
      )}

      <div className="fb-panel">
        {error && <p className="fb-error" style={{ textAlign: 'left', marginBottom: '1rem' }}>{error}</p>}
        <div className="fb-table-wrap">
          <table className="fb-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Sales</th>
                <th>Guest</th>
                <th>Mobile</th>
                <th>Event Date</th>
                <th>Venue</th>
                <th>Food</th>
                <th>Bev</th>
                <th>Service</th>
                <th>Overall</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} className="fb-muted">Loading…</td></tr>
              )}
              {!loading && !filtered.length && (
                <tr><td colSpan={11} className="fb-muted">No reviews match filters</td></tr>
              )}
              {filtered.map(function (r, i) {
                return (
                  <tr key={i}>
                    <td>{formatTimestamp(r.timestamp)}</td>
                    <td>{r.salesUser}</td>
                    <td>{r.guestName}</td>
                    <td>{r.guestMobile}</td>
                    <td>{formatEventDate(r.eventDate)}</td>
                    <td>{r.functionLocation}</td>
                    <td><StarDisplay value={r.food} /></td>
                    <td><StarDisplay value={r.beverage} /></td>
                    <td><StarDisplay value={r.service} /></td>
                    <td><StarDisplay value={r.overall} /></td>
                    <td style={{ whiteSpace: 'normal', maxWidth: '280px' }}>{r.remarks}</td>
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
