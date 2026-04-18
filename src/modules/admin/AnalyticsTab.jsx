import { useEffect, useMemo, useState } from 'react';
import { listReviews } from '../../lib/api';
import { StarDisplay } from '../../components/StarRating';

function avgRound(arr) {
  if (!arr.length) return 0;
  var sum = 0;
  for (var i = 0; i < arr.length; i++) sum += Number(arr[i]) || 0;
  return Math.round((sum / arr.length) * 10) / 10;
}

function monthKey(iso) {
  if (!iso) return 'Unknown';
  try {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return 'Unknown';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[d.getMonth()] + ' ' + d.getFullYear();
  } catch (e) { return 'Unknown'; }
}

export default function AnalyticsTab({ session }) {
  var [reviews, setReviews] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState('');

  useEffect(function () {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      var res = await listReviews();
      setReviews(res.reviews || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    }
    setLoading(false);
  }

  var summary = useMemo(function () {
    if (!reviews.length) return null;
    return {
      total: reviews.length,
      food: avgRound(reviews.map(function (r) { return r.food; })),
      beverage: avgRound(reviews.map(function (r) { return r.beverage; })),
      service: avgRound(reviews.map(function (r) { return r.service; })),
      overall: avgRound(reviews.map(function (r) { return r.overall; })),
    };
  }, [reviews]);

  var byVenue = useMemo(function () {
    var map = {};
    reviews.forEach(function (r) {
      var v = r.functionLocation || 'Unknown';
      if (!map[v]) map[v] = { name: v, count: 0, food: [], bev: [], svc: [], ovr: [] };
      map[v].count++;
      map[v].food.push(r.food);
      map[v].bev.push(r.beverage);
      map[v].svc.push(r.service);
      map[v].ovr.push(r.overall);
    });
    return Object.keys(map).map(function (k) {
      var g = map[k];
      return {
        name: g.name,
        count: g.count,
        food: avgRound(g.food),
        beverage: avgRound(g.bev),
        service: avgRound(g.svc),
        overall: avgRound(g.ovr),
      };
    }).slice().sort(function (a, b) { return b.count - a.count; });
  }, [reviews]);

  var bySales = useMemo(function () {
    var map = {};
    reviews.forEach(function (r) {
      var s = r.salesDisplayName || r.salesUser || 'Unknown';
      if (!map[s]) map[s] = { name: s, count: 0, food: [], bev: [], svc: [], ovr: [] };
      map[s].count++;
      map[s].food.push(r.food);
      map[s].bev.push(r.beverage);
      map[s].svc.push(r.service);
      map[s].ovr.push(r.overall);
    });
    return Object.keys(map).map(function (k) {
      var g = map[k];
      return {
        name: g.name,
        count: g.count,
        food: avgRound(g.food),
        beverage: avgRound(g.bev),
        service: avgRound(g.svc),
        overall: avgRound(g.ovr),
      };
    }).slice().sort(function (a, b) { return b.count - a.count; });
  }, [reviews]);

  var byMonth = useMemo(function () {
    var map = {};
    var order = [];
    reviews.forEach(function (r) {
      var mk = monthKey(r.timestamp);
      if (!map[mk]) {
        map[mk] = { name: mk, count: 0, food: [], bev: [], svc: [], ovr: [] };
        order.push(mk);
      }
      map[mk].count++;
      map[mk].food.push(r.food);
      map[mk].bev.push(r.beverage);
      map[mk].svc.push(r.service);
      map[mk].ovr.push(r.overall);
    });
    return order.map(function (k) {
      var g = map[k];
      return {
        name: g.name,
        count: g.count,
        food: avgRound(g.food),
        beverage: avgRound(g.bev),
        service: avgRound(g.svc),
        overall: avgRound(g.ovr),
      };
    });
  }, [reviews]);

  if (loading) return <div className="fb-panel"><p className="fb-muted">Loading analytics…</p></div>;
  if (error) return <div className="fb-panel"><p className="fb-error" style={{ textAlign: 'left' }}>{error}</p></div>;
  if (!summary) return <div className="fb-panel"><p className="fb-muted">No reviews yet</p></div>;

  return (
    <>
      <div className="fb-panel">
        <div className="fb-panel-title">Overview</div>
        <div className="fb-stat-grid">
          <div className="fb-stat-card">
            <div className="fb-stat-value">{summary.total}</div>
            <div className="fb-stat-label">Total Reviews</div>
          </div>
          <div className="fb-stat-card">
            <div className="fb-stat-value">{summary.food}</div>
            <div className="fb-stat-label">Avg Food</div>
          </div>
          <div className="fb-stat-card">
            <div className="fb-stat-value">{summary.beverage}</div>
            <div className="fb-stat-label">Avg Beverage</div>
          </div>
          <div className="fb-stat-card">
            <div className="fb-stat-value">{summary.service}</div>
            <div className="fb-stat-label">Avg Service</div>
          </div>
          <div className="fb-stat-card">
            <div className="fb-stat-value">{summary.overall}</div>
            <div className="fb-stat-label">Avg Overall</div>
          </div>
        </div>
      </div>

      <div className="fb-panel">
        <div className="fb-panel-title">By Sales User</div>
        <div className="fb-table-wrap">
          <table className="fb-table">
            <thead>
              <tr>
                <th>Sales User</th>
                <th>Reviews</th>
                <th>Food</th>
                <th>Bev</th>
                <th>Service</th>
                <th>Overall</th>
              </tr>
            </thead>
            <tbody>
              {bySales.map(function (row) {
                return (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.count}</td>
                    <td><StarDisplay value={row.food} /></td>
                    <td><StarDisplay value={row.beverage} /></td>
                    <td><StarDisplay value={row.service} /></td>
                    <td><StarDisplay value={row.overall} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fb-panel">
        <div className="fb-panel-title">By Venue</div>
        <div className="fb-table-wrap">
          <table className="fb-table">
            <thead>
              <tr>
                <th>Venue</th>
                <th>Reviews</th>
                <th>Food</th>
                <th>Bev</th>
                <th>Service</th>
                <th>Overall</th>
              </tr>
            </thead>
            <tbody>
              {byVenue.map(function (row) {
                return (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.count}</td>
                    <td><StarDisplay value={row.food} /></td>
                    <td><StarDisplay value={row.beverage} /></td>
                    <td><StarDisplay value={row.service} /></td>
                    <td><StarDisplay value={row.overall} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fb-panel">
        <div className="fb-panel-title">By Month</div>
        <div className="fb-table-wrap">
          <table className="fb-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Reviews</th>
                <th>Food</th>
                <th>Bev</th>
                <th>Service</th>
                <th>Overall</th>
              </tr>
            </thead>
            <tbody>
              {byMonth.map(function (row) {
                return (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.count}</td>
                    <td><StarDisplay value={row.food} /></td>
                    <td><StarDisplay value={row.beverage} /></td>
                    <td><StarDisplay value={row.service} /></td>
                    <td><StarDisplay value={row.overall} /></td>
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