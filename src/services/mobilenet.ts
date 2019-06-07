import {dynamicScript} from '../platform/dynamic-script-web.js';

const modelUrl = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@1.0.0';

export const requireMobilenet = async () => {
  if (!window['mobilenet']) {
    await dynamicScript(modelUrl);
  }
  return window['mobilenet'];
}
