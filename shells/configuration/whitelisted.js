/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// components for particle use
import '../lib/modalities/dom/components/elements/corellia-xen/cx-input.js';
import '../lib/modalities/dom/components/elements/corellia-xen/cx-tabs.js';
import '../lib/modalities/dom/components/elements/corellia-xen/cx-button.js';
import '../lib/modalities/dom/components/elements/dom-repeater.js';
import '../lib/modalities/dom/components/elements/good-map.js';
import '../lib/modalities/dom/components/elements/geo-location.js';
import '../lib/modalities/dom/components/elements/magenta-visualizer.js';
import '../lib/modalities/dom/components/elements/mic-input.js';
import '../lib/modalities/dom/components/elements/model-input.js';
import '../lib/modalities/dom/components/elements/model-img.js';
import '../lib/modalities/dom/components/elements/video-controller.js';
import '../lib/modalities/dom/components/elements/youtube-viewer.js';

// requires app-level firebase configuration
import '../lib/firebase-upload.js';

// services for particle use
// TODO(sjmiles): `textclassifier-service` is fake, deprecate?
import '../lib/services/textclassifier-service.js';
import '../../build/services/magenta-service.js';
// TODO(sjmiles): TensorFlowJs (tfjs, also part of ml5) uses `new Function()` which requires `unsafe-eval` csp
// import '../../build/services/tfjs-service.js';
// import '../../build/services/tfjs-mobilenet-service.js';
import '../../build/services/random-service.js';
