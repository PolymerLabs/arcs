const defaultDebugLevel = 2;

// must establish Debug level before using logFactory
import Xen from '../components/xen/xen.js';
Xen.Debug.level = ((new URL(document.location)).searchParams.has('log')) ? 2 : defaultDebugLevel;

// common shell resources are here
window.shellPath = '..';
