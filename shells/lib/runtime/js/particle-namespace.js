/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import { UiParticle } from '../dist/ui-particle.js';
import { UiTransformationParticle } from '../dist/ui-transformation-particle.js';
import { UiMultiplexerParticle } from '../dist/ui-multiplexer-particle.js';
export function populateParticleNamespace(namespace) {
    return {
        ...namespace,
        // Ui-flavored Particles
        UiParticle,
        UiTransformationParticle,
        UiMultiplexerParticle,
        // Aliases
        SimpleParticle: UiParticle,
    };
}
