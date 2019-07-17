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

export const caption = async (msg, tid, bus, composerFactory, storage, context) => {
  const spec = parseCaptionMsg(msg);
  if (spec) {
    await process(spec, tid, bus, composerFactory, storage, context);
  }
};

const parseCaptionMsg = msg => {
  if (msg.entity) {
    const spec = Object.assign(Object.create(null), msg.entity);
    spec.tag = `pipe_caption`;
    spec.source = spec.source || '';
    return spec;
  }
  // TODO(sjmiles): complain
};
