import { useEffect, useMemo, useState } from 'react';
import { listReviews } from '../../lib/api';

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
  var [search, setSearch] = useState('');

  useEffect(function () {
    loadReviews();
  }, []);

  async function loadReviews() {
    setLoading(true);
    setError('');
    try {
      var res = await listReviews(session.token);
      setReviews(res.reviews || []);
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
      return true;
    });
  }, [reviews, filterSales, filterVenue, filterFrom, filterTo, search]);

  function exportCSV() {
    var headers = ['Timestamp', 'Sales User', 'Guest Name', 'Mobile', 'Email', 'Event Date', 'Function Location', 'Food', 'Beverage', 'Service', 'Overall', 'Remarks'];
    var rows = filtered.map(function (r) {
      return [
        formatTimestamp(r.timestamp),
        r.salesUser || '',
        r.guestName || '',
        r.guestMobile || '',
        r.guestEmail || '',
        formatEventDate(r.eventDate),
        r.functionLocation || '',
        r.food || '',
        r.beverage || '',
        r.service || '',
        r.overall || '',
        r.remarks || '',
      ];
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
  }

  function clearFilters() {
    setFilterSales('');
    setFilterVenue('');
    setFilterFrom('');
    setFilterTo('');
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
            <label className="fb-label">Search</label>
            <input className="fb-input" placeholder="name / mobile / remarks" value={search} onChange={function (e) { setSearch(e.target.value); }} />
          </div>
        </div>
        <div className="fb-inline-row" style={{ justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <span className="fb-muted">
            Showing {filtered.length} of {reviews.length}
          </span>
          <div className="fb-inline-row">
            <button className="fb-btn-ghost" onClick={clearFilters}>Clear</button>
            <button className="fb-btn-ghost" onClick={loadReviews} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button className="fb-btn-ghost" onClick={exportCSV} disabled={!filtered.length}>Export CSV</button>
          </div>
        </div>
      </div>

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
                    <td>{r.food}</td>
                    <td>{r.beverage}</td>
                    <td>{r.service}</td>
                    <td>{r.overall}</td>
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
