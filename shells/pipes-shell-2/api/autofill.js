/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {process} from './process.js';

const parseAutofillMsg = msg => {
  if (msg.entity && msg.entity.type) {
    const {entity: {type, source, modality}} = msg;
    return {
      type,
      source: source || '',
      tag: `${type}_autofill`,
      modality
    };
  }
  // TODO(sjmiles): complain
};

export const autofill = async (msg, tid, bus, composerFactory, storage, context) => {
  const spec = parseAutofillMsg(msg);
  if (spec) {
    await process(spec, tid, bus, composerFactory, storage, context);
  }
};
