/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import { UiParticle } from './ui-particle.js';
import { UiTransformationParticle } from './ui-transformation-particle.js';
import { UiMultiplexerParticle } from './ui-multiplexer-particle.js';
import { LoaderBase } from '../../../../build/platform/loader-base.js';
LoaderBase.namespace = {
    // existing corpus
    ...LoaderBase.namespace,
    // new items
    UiParticle,
    UiTransformationParticle,
    UiMultiplexerParticle,
    // aliases
    SimpleParticle: UiParticle
};
//# sourceMappingURL=install-ui-classes.js.map