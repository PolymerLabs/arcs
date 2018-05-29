const defaultDebugLevel = 0;

// must establish Debug level before using logFactory
import Xen from '../../components/xen/xen.js';
Xen.Debug.level = ((new URL(document.location)).searchParams.has('log')) ? 2 : defaultDebugLevel;

// some globals configured here for the convenience of providing in this simple config file.
// TODO(sjmiles): at least collate globals into a namespace, or provide as a module

// common shell resources are here (aka `.../shell`)
window.shellPath = '../..';

// path redirects
window.shellUrls = {};

// magic redirect for Scott's servers (`projects` heuristic could make false positives)
// TOOD(sjmiles): allow persistent configurable redirects for developer environments, maybe via `localstorage`?
if (document.location.pathname.includes('projects')) {
  window.shellUrls['https://sjmiles.github.io/'] = `${window.shellPath}/../../`;
}

// default manifest!
window.defaultManifest = `

import '${window.shellPath}/artifacts/Arcs/Arcs.recipes'
import '${window.shellPath}/artifacts/canonical.manifest'
import 'https://sjmiles.github.io/arcs-stories/0.4/Generic/Generic.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.4/TV/TV.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.4/PlaidAccounts/PlaidAccounts.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.4/GitHubDash/GitHubDash.recipes'
import 'https://sjmiles.github.io/arcs-stories/0.4/Generated/Generated.recipes'

`;
