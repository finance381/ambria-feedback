import { useEffect, useState } from 'react';

/**
 * Hash-based routing. Works on GitHub Pages without server config.
 * Routes: /#/login, /#/capture, /#/guest, /#/admin
 */
export function useHashRoute() {
  var [route, setRoute] = useState(parseHash());

  useEffect(function () {
    function onChange() { setRoute(parseHash()); }
    window.addEventListener('hashchange', onChange);
    return function () { window.removeEventListener('hashchange', onChange); };
  }, []);

  return route;
}

export function navigate(path) {
  if (!path.startsWith('/')) path = '/' + path;
  window.location.hash = path;
}

function parseHash() {
  var h = window.location.hash || '#/';
  if (h.startsWith('#')) h = h.slice(1);
  if (!h.startsWith('/')) h = '/' + h;
  return h;
}
