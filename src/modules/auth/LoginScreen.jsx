import { useState } from 'react';
import { login } from '../../lib/api';
import { navigate } from '../../lib/router';

export default function LoginScreen({ onLogin }) {
  var [username, setUsername] = useState('');
  var [password, setPassword] = useState('');
  var [error, setError] = useState('');
  var [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password) {
      setError('Enter username and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      var data = await login(username.trim(), password);
      var session = {
        token: data.token,
        role: data.role,
        username: data.username,
        displayName: data.displayName,
      };
      // Cache venues bundled with sales login response
      if (data.venues) {
        try { sessionStorage.setItem('ambria.venues', JSON.stringify(data.venues)); } catch (e) {}
      }
      onLogin(session);
      navigate(data.role === 'admin' ? '/admin' : '/capture');
    } catch (e) {
      setError(e.message || 'Login failed');
    }
    setLoading(false);
  }

  function onKey(e) {
    if (e.key === 'Enter') handleSubmit();
  }

  return (
    <div className="fb-root">
      <div className="fb-card">
        <div className="fb-logo">
          <span className="fb-logo-main">Ambria</span>
          <span className="fb-logo-sub">Cuisines &nbsp;·&nbsp; Staff Access</span>
        </div>

        <h2 className="fb-heading">Sign In</h2>
        <p className="fb-subheading">Authorised personnel only</p>

        <div className="fb-divider">
          <div className="fb-divider-line" />
          <div className="fb-divider-diamond" />
          <div className="fb-divider-line" />
        </div>

        <div className="fb-field">
          <label className="fb-label">Username</label>
          <input
            className="fb-input"
            autoCapitalize="none"
            autoCorrect="off"
            value={username}
            onChange={function (e) { setUsername(e.target.value); }}
            onKeyDown={onKey}
          />
        </div>

        <div className="fb-field">
          <label className="fb-label">Password</label>
          <input
            className="fb-input"
            type="password"
            value={password}
            onChange={function (e) { setPassword(e.target.value); }}
            onKeyDown={onKey}
          />
        </div>

        {error && <p className="fb-error">{error}</p>}

        <button className="fb-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Signing in…' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
