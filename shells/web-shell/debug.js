const params = (new URL(document.location)).searchParams;
if (params.has('log')) {
  let logLevel = params.get('log');
  logLevel = logLevel === '' ? 2 : (Number(logLevel) || 0);
  window.logLevel = logLevel;
  console.log(`setting logLevel = ${window.logLevel}`);
}
import {Xen} from '../lib/components/xen.js';
Xen.Debug.level = window.logLevel;
