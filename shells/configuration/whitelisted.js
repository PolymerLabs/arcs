// components for particle use
import '../../modalities/dom/components/elements/corellia-xen/cx-input.js';
import '../../modalities/dom/components/elements/corellia-xen/cx-tabs.js';
import '../../modalities/dom/components/elements/corellia-xen/cx-button.js';
import '../../modalities/dom/components/elements/video-controller.js';
import '../../modalities/dom/components/elements/mic-input.js';
import '../../modalities/dom/components/elements/good-map.js';
import '../../modalities/dom/components/elements/geo-location.js';
import '../../modalities/dom/components/elements/model-input.js';
import '../../modalities/dom/components/elements/model-img.js';
import '../../modalities/dom/components/elements/dom-repeater.js';

// requires app-level firebase configuration
import '../lib/database/firebase-upload.js';

// services for particle use
// TODO(sjmiles): TensorFlowJs (tfjs, also part of ml5) uses `new Function()` which requires `unsafe-eval` csp
import '../services/textclassifier-service.js';
import '../lib/services/tf.js';
