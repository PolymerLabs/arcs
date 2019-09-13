/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Utils} from '../../lib/utils.js';

const defaultManifest = `
import 'https://$particles/PipeApps/RenderNotification.arcs'
`;

export const requireContext = async manifest => {
  if (!requireContext.promise) {
    requireContext.promise = Utils.parse(manifest || defaultManifest);
  }
  return await requireContext.promise;
};
