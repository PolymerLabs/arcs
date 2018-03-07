import {initDebug} from '../shared/arc-registry.js';
if (initDebug().preExistingArcs) {
  document.dispatchEvent(new CustomEvent('arcs-debug', {
    detail: [{
      messageType: 'Warning',
      messageBody: 'PreExistingArcs'
    }]
  }));
}
