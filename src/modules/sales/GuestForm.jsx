import { useEffect, useState } from 'react';
import { submitReview, listVenues } from '../../lib/api';
import { navigate } from '../../lib/router';
import { useKioskLock } from '../../hooks/useKioskLock';
import StarRating from '../../components/StarRating';

function todayISO() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export default function GuestForm({ session }) {
  useKioskLock(true);

  var [step, setStep] = useState('details'); // details | ratings | thankyou
  var [venues, setVenues] = useState(function () {
    try {
      var raw = sessionStorage.getItem('ambria.venues');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  });
  var [loadingVenues, setLoadingVenues] = useState(function () {
    try { return !sessionStorage.getItem('ambria.venues'); } catch (e) { return true; }
  });
  var [error, setError] = useState('');
  var [submitting, setSubmitting] = useState(false);

  var [form, setForm] = useState({
    guestName: '',
    guestMobile: '',
    guestEmail: '',
    eventDate: todayISO(),
    functionLocation: '',
    food: 0,
    beverage: 0,
    service: 0,
    overall: 0,
    remarks: '',
  });
  var [showCancel, setShowCancel] = useState(false);

  useEffect(function () {
    // Already cached from login bundle? skip the fetch
    if (venues.length > 0) {
      setLoadingVenues(false);
      return;
    }
    listVenues(session.token).then(function (res) {
      var list = res.venues || [];
      setVenues(list);
      try { sessionStorage.setItem('ambria.venues', JSON.stringify(list)); } catch (e) {}
      setLoadingVenues(false);
    }).catch(function (e) {
      setError('Could not load venues: ' + e.message);
      setLoadingVenues(false);
    });
  }, [session.token]);

  // Auto-return to capture screen after thank-you
  useEffect(function () {
    if (step !== 'thankyou') return;
    var t = setTimeout(function () { navigate('/capture'); }, 3500);
    return function () { clearTimeout(t); };
  }, [step]);

  function set(key, value) {
    setForm(Object.assign({}, form, Object.fromEntries([[key, value]])));
  }

  function handleNext() {
    if (!form.guestName.trim() || !form.guestMobile.trim()) {
      setError('Name and mobile are required');
      return;
    }
    if (!form.eventDate) {
      setError('Event date is required');
      return;
    }
    if (!form.functionLocation) {
      setError('Please select a function location');
      return;
    }
    setError('');
    setStep('ratings');
  }

  async function handleSubmit() {
    if (!form.food || !form.beverage || !form.service || !form.overall) {
      setError('Please rate all four categories');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await submitReview(session.token, form);
      setStep('thankyou');
    } catch (e) {
      setError(e.message || 'Submission failed');
    }
    setSubmitting(false);
  }

  function handleCancelConfirmed() {
    setShowCancel(false);
    navigate('/capture');
  }

  var stepIndex = step === 'details' ? 0 : step === 'ratings' ? 1 : 2;

  return (
    <div className="fb-root">
      {step !== 'thankyou' && (
        <div className="fb-capture-corner">
          <button className="fb-btn-ghost" onClick={function () { setShowCancel(true); }}>
            Cancel
          </button>
        </div>
      )}

      {showCancel && (
        <div className="fb-modal-backdrop" onClick={function () { setShowCancel(false); }}>
          <div className="fb-modal" onClick={function (e) { e.stopPropagation(); }}>
            <h3 className="fb-heading" style={{ marginBottom: '0.5rem' }}>Discard this review?</h3>
            <p className="fb-muted" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              All entered details will be lost
            </p>
            <div className="fb-inline-row" style={{ justifyContent: 'center' }}>
              <button className="fb-btn-ghost" onClick={function () { setShowCancel(false); }}>
                Keep going
              </button>
              <button className="fb-btn fb-btn-inline fb-btn-danger" onClick={handleCancelConfirmed}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fb-card">
        <div className="fb-logo">
          <span className="fb-logo-main">Ambria</span>
          <span className="fb-logo-sub">Cuisines &nbsp;·&nbsp; Event Dining</span>
        </div>

        <div className="fb-step-indicator">
          {[0, 1, 2].map(function (i) {
            return <div key={i} className={'fb-step-dot ' + (i <= stepIndex ? 'active' : '')} />;
          })}
        </div>

        {step === 'details' && (
          <DetailsStep
            form={form}
            set={set}
            venues={venues}
            loadingVenues={loadingVenues}
            error={error}
            onNext={handleNext}
          />
        )}

        {step === 'ratings' && (
          <RatingsStep
            form={form}
            set={set}
            error={error}
            submitting={submitting}
            onSubmit={handleSubmit}
            onBack={function () { setError(''); setStep('details'); }}
          />
        )}

        {step === 'thankyou' && <ThankYouStep name={form.guestName} />}
      </div>
    </div>
  );
}

function DetailsStep({ form, set, venues, loadingVenues, error, onNext }) {
  return (
    <>
      <h2 className="fb-heading">Guest Details</h2>
      <p className="fb-subheading">A warm welcome to you</p>
      <div className="fb-divider"><div className="fb-divider-line" /><div className="fb-divider-diamond" /><div className="fb-divider-line" /></div>

      <div className="fb-field">
        <label className="fb-label">Full Name</label>
        <input
          className="fb-input"
          placeholder="Your name"
          value={form.guestName}
          onChange={function (e) { set('guestName', e.target.value); }}
        />
      </div>

      <div className="fb-field">
        <label className="fb-label">Mobile Number</label>
        <input
          className="fb-input"
          placeholder="+91 00000 00000"
          inputMode="tel"
          value={form.guestMobile}
          onChange={function (e) { set('guestMobile', e.target.value); }}
        />
      </div>

      <div className="fb-field">
        <label className="fb-label">
          Email Address <span className="fb-label-optional">(optional)</span>
        </label>
        <input
          className="fb-input"
          type="email"
          placeholder="name@example.com"
          value={form.guestEmail}
          onChange={function (e) { set('guestEmail', e.target.value); }}
        />
      </div>

      <div className="fb-field">
        <label className="fb-label">Event Date</label>
        <input
          className="fb-input"
          type="date"
          value={form.eventDate}
          onChange={function (e) { set('eventDate', e.target.value); }}
        />
      </div>

      <div className="fb-field">
        <label className="fb-label">Function Location</label>
        <div className="fb-select-wrap">
          <select
            className="fb-select"
            value={form.functionLocation}
            onChange={function (e) { set('functionLocation', e.target.value); }}
            disabled={loadingVenues}
          >
            <option value="">{loadingVenues ? 'Loading…' : 'Select a venue'}</option>
            {venues.map(function (v) {
              return <option key={v.name} value={v.name}>{v.name}</option>;
            })}
          </select>
        </div>
      </div>

      {error && <p className="fb-error">{error}</p>}

      <button className="fb-btn" onClick={onNext}>Continue</button>
    </>
  );
}

function RatingsStep({ form, set, error, submitting, onSubmit, onBack }) {
  var fields = [
    { key: 'food', label: 'Food' },
    { key: 'beverage', label: 'Beverages' },
    { key: 'service', label: 'Service' },
    { key: 'overall', label: 'Overall' },
  ];

  return (
    <>
      <h2 className="fb-heading">Share Your Experience</h2>
      <p className="fb-subheading">Tap to rate out of five</p>
      <div className="fb-divider"><div className="fb-divider-line" /><div className="fb-divider-diamond" /><div className="fb-divider-line" /></div>

      <div style={{ marginBottom: '1.5rem' }}>
        {fields.map(function (f) {
          return (
            <div className="fb-field" key={f.key} style={{ marginBottom: '1.1rem' }}>
              <label className="fb-label">{f.label}</label>
              <StarRating value={form[f.key]} onChange={function (v) { set(f.key, v); }} />
            </div>
          );
        })}
      </div>

      <div className="fb-field">
        <label className="fb-label">Remarks <span className="fb-label-optional">(optional)</span></label>
        <textarea
          className="fb-textarea"
          placeholder="Any thoughts, highlights, or suggestions…"
          value={form.remarks}
          onChange={function (e) { set('remarks', e.target.value); }}
        />
      </div>

      {error && <p className="fb-error">{error}</p>}

      <button className="fb-btn" onClick={onSubmit} disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit Feedback'}
      </button>
      <button
        className="fb-btn-ghost"
        style={{ width: '100%', marginTop: '0.75rem' }}
        onClick={onBack}
        disabled={submitting}
      >
        ← Back
      </button>
    </>
  );
}

function ThankYouStep({ name }) {
  return (
    <div className="fb-thankyou">
      <div className="fb-thankyou-icon">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <h2 className="fb-thankyou-title">Thank You, {name}</h2>
      <div className="fb-divider"><div className="fb-divider-line" /><div className="fb-divider-diamond" /><div className="fb-divider-line" /></div>
      <p className="fb-thankyou-text">
        Your feedback has been received.<br />
        It was a pleasure hosting you.<br />
        We look forward to welcoming you again.
      </p>
    </div>
  );
}
