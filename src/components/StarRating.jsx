import { useState } from 'react';

/**
 * 5-star rating with 0.5 step granularity.
 * Tap left half of a star = half star, right half = full star.
 * Value is a number 0 to 5.
 */
export default function StarRating({ value, onChange, size }) {
  var [hover, setHover] = useState(0);
  var starSize = size || 36;
  var display = hover || value || 0;

  function handleClick(starIndex, isHalf) {
    var newVal = isHalf ? starIndex - 0.5 : starIndex;
    // Tap same value again = clear
    if (newVal === value) newVal = 0;
    onChange(newVal);
  }

  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(function (i) {
        var fill = 'empty';
        if (display >= i) fill = 'full';
        else if (display >= i - 0.5) fill = 'half';

        return (
          <div
            key={i}
            style={{ position: 'relative', width: starSize, height: starSize, cursor: 'pointer' }}
            onMouseLeave={function () { setHover(0); }}
          >
            {/* Left half hit area */}
            <div
              style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', zIndex: 2 }}
              onClick={function () { handleClick(i, true); }}
              onMouseEnter={function () { setHover(i - 0.5); }}
            />
            {/* Right half hit area */}
            <div
              style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', zIndex: 2 }}
              onClick={function () { handleClick(i, false); }}
              onMouseEnter={function () { setHover(i); }}
            />
            <Star size={starSize} fill={fill} />
          </div>
        );
      })}
      <span style={{
        marginLeft: 10,
        fontSize: 13,
        color: display > 0 ? '#c9a84c' : 'rgba(232,220,200,0.3)',
        fontFamily: "'JetBrains Mono', monospace",
        minWidth: 36,
      }}>
        {display > 0 ? display.toFixed(1) : '—'}
      </span>
    </div>
  );
}

function Star({ size, fill }) {
  var gold = '#c9a84c';
  var empty = 'rgba(201, 168, 76, 0.18)';
  var stroke = 'rgba(201, 168, 76, 0.35)';
  var gradId = 'half-' + Math.random().toString(36).slice(2, 9);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      {fill === 'half' && (
        <defs>
          <linearGradient id={gradId}>
            <stop offset="50%" stopColor={gold} />
            <stop offset="50%" stopColor={empty} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={fill === 'full' ? gold : fill === 'half' ? 'url(#' + gradId + ')' : empty}
        stroke={stroke}
        strokeWidth="0.8"
      />
    </svg>
  );
}

/** Read-only display for tables */
export function StarDisplay({ value, size }) {
  var s = size || 14;
  var v = Number(value) || 0;
  var gold = '#c9a84c';
  var empty = 'rgba(201, 168, 76, 0.2)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(function (i) {
        var fill = 'empty';
        if (v >= i) fill = 'full';
        else if (v >= i - 0.5) fill = 'half';
        var gradId = 'td-' + i + '-' + Math.random().toString(36).slice(2, 7);
        return (
          <svg key={i} width={s} height={s} viewBox="0 0 24 24" style={{ display: 'block' }}>
            {fill === 'half' && (
              <defs>
                <linearGradient id={gradId}>
                  <stop offset="50%" stopColor={gold} />
                  <stop offset="50%" stopColor={empty} />
                </linearGradient>
              </defs>
            )}
            <path
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
              fill={fill === 'full' ? gold : fill === 'half' ? 'url(#' + gradId + ')' : empty}
            />
          </svg>
        );
      })}
      <span style={{ marginLeft: 4, fontSize: 11, color: v > 0 ? '#c9a84c' : 'rgba(232,220,200,0.3)' }}>
        {v > 0 ? v.toFixed(1) : '—'}
      </span>
    </span>
  );
}