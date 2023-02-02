/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {UiParticle} from './ui-particle.js';
import {Entity} from '../../../../build/runtime/entity.js';

/**
 * Particle that does transformation.
 */
export class UiTransformationParticle extends UiParticle {

  getTemplate(slotName: string) {
    // TODO: add support for multiple slots.
    return this.state.template;
  }

  getTemplateName(slotName: string) {
    // TODO: add support for multiple slots.
    return this.state.templateName;
  }

  render(props, state) {
    return state.renderModel;
  }

  shouldRender(props, state): boolean {
    return Boolean((state.template || state.templateName) && state.renderModel);
  }

  // Helper methods that may be reused in transformation particles to combine hosted content.
  static propsToItems(propsValues) {
    return propsValues ? propsValues.map(e => ({subId: Entity.id(e), ...e})) : [];
  }
}
