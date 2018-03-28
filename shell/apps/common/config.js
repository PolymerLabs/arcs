// establish Debug level before using logFactory
import Xen from '../../components/xen/xen.js';
Xen.Debug.level = ((new URL(document.location)).searchParams.has('log')) ? 2 : 0;

// common shell resources are here
window.shellPath = '../..';
