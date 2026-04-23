import { useState } from 'react';
import ReviewsTab from './ReviewsTab';
import VenuesTab from './VenuesTab';
import UsersTab from './UsersTab';
import AnalyticsTab from './AnalyticsTab';
import SalesTeamTab from './SalesTeamTab';

export default function AdminShell({ session, onLogout }) {
  var [tab, setTab] = useState('reviews');

  return (
    <div className="fb-admin-shell">
      <div className="fb-admin-topbar">
        <div className="fb-admin-brand">Ambria · Admin</div>
        <div className="fb-inline-row">
          <a href="/" style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,.1)', color: 'rgba(0,0,0,.4)', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>⌂ Hub</a>
          <span className="fb-admin-user">{session.displayName}</span>
          <button className="fb-btn-ghost" onClick={onLogout}>Log Out</button>
        </div>
      </div>

      <div className="fb-admin-tabs">
        <button
          className={'fb-admin-tab ' + (tab === 'reviews' ? 'active' : '')}
          onClick={function () { setTab('reviews'); }}
        >Reviews</button>
        <button
          className={'fb-admin-tab ' + (tab === 'venues' ? 'active' : '')}
          onClick={function () { setTab('venues'); }}
        >Venues</button>
        <button
          className={'fb-admin-tab ' + (tab === 'users' ? 'active' : '')}
          onClick={function () { setTab('users'); }}
        >Users</button>
        <button
          className={'fb-admin-tab ' + (tab === 'analytics' ? 'active' : '')}
          onClick={function () { setTab('analytics'); }}
        >Analytics</button>
        <button
          className={'fb-admin-tab ' + (tab === 'salesteam' ? 'active' : '')}
          onClick={function () { setTab('salesteam'); }}
        >Sales Team</button>
      </div>

      <div className="fb-admin-body">
        {tab === 'reviews' && <ReviewsTab session={session} />}
        {tab === 'venues' && <VenuesTab session={session} />}
        {tab === 'users' && <UsersTab session={session} />}
        {tab === 'analytics' && <AnalyticsTab session={session} />}
        {tab === 'salesteam' && <SalesTeamTab session={session} />}
      </div>
    </div>
  );
}
