const defaultDebugLevel = 0;

const params = (new URL(document.location)).searchParams;

// must establish Debug level before using logFactory
import Xen from '../../components/xen/xen.js';
Xen.Debug.level = params.has('log') ? 2 : defaultDebugLevel;

// some globals configured here for the convenience of providing in this simple config file.
// TODO(sjmiles): at least collate globals into a namespace, or provide as a module

// common shell resources are here (aka `.../shell`)
window.shellPath = '../..';
window.arcsPath = '../../..';

// path redirects
window.shellUrls = {};

// magic redirect for Scott's servers (`projects` heuristic could make false positives)
// TOOD(sjmiles): allow persistent configurable redirects for developer environments, maybe via `localstorage`?
if (document.location.pathname.includes('projects')) {
  window.shellUrls['https://sjmiles.github.io/'] = `${window.arcsPath}/../`;
}

// optional service worker, also disabled on insecure origins
if ('serviceWorker' in navigator) {
  const useSw = params.has('sw');
  if (useSw) {
    navigator.serviceWorker.register('../../sw.js');
  } else {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for (let registration of registrations) {
        registration.unregister();
      }
    });
  }
}

// default manifest!
window.defaultManifest = `

import '${window.arcsPath}/artifacts/Arcs/Arcs.recipes'
import '${window.arcsPath}/artifacts/canonical.manifest'
import 'https://sjmiles.github.io/arcs-stories/0.4/canonical.manifest'

`;
