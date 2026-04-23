import { navigate } from '../../lib/router';

export default function CaptureIntro() {
  return (
    <div className="fb-capture-root">
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <a href="/" style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.5)', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>⌂ Hub</a>
      </div>
      <div className="fb-capture-hero">
        <div className="fb-logo">
          <span className="fb-logo-main">Ambria</span>
          <span className="fb-logo-sub">Cuisines &nbsp;·&nbsp; Guest Feedback</span>
        </div>

        <div className="fb-divider">
          <div className="fb-divider-line" />
          <div className="fb-divider-diamond" />
          <div className="fb-divider-line" />
        </div>

        <h1>Hand the tablet to your guest</h1>
        <p className="fb-muted">Tap below to begin capturing their experience</p>

        <button
          className="fb-btn fb-btn-inline"
          style={{ marginTop: '2rem', paddingLeft: '3rem', paddingRight: '3rem' }}
          onClick={function () { navigate('/guest'); }}
        >
          Start Review
        </button>
      </div>
    </div>
  );
}