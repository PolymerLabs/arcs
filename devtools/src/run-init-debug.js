import {initDebug} from '../shared/arc-registry.js';
if (initDebug().preExistingArcs) {
  document.dispatchEvent(new CustomEvent('arcs-debug-out', {
    detail: [{
      messageType: 'Warning',
      messageBody: 'PreExistingArcs'
    }]
  }));
}
