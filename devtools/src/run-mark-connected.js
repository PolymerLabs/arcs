import {DevtoolsBroker} from '../shared/devtools-broker.js';
if (DevtoolsBroker.markConnected().preExistingArcs) {
  document.dispatchEvent(new CustomEvent('arcs-debug-out', {
    detail: [{
      messageType: 'Warning',
      messageBody: 'PreExistingArcs'
    }]
  }));
}
