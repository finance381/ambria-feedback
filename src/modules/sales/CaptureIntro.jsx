import { navigate } from '../../lib/router';

export default function CaptureIntro() {
  return (
    <div className="fb-capture-root">
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