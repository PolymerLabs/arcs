import {initDebug} from '../shared/arc-registry.js';
import {initPlannerComponent} from '../shared/invoke-planner.js';

if (initDebug().preExistingArcs) {
  document.dispatchEvent(new CustomEvent('arcs-debug', {
    detail: [{
      messageType: 'Warning',
      messageBody: 'PreExistingArcs'
    }]
  }));
}

initPlannerComponent();

window.postMessage('debug-inited', '*');


