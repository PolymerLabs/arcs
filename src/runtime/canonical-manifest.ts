/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const canonicalManifest = `
annotation arcId(id: Text)
  targets: [Recipe]
  retention: Source
  doc: 'predefined ID of a long running arc'
annotation ttl(value: Text)
  // Atm TTL is only supported for recipes handles.
  targets: [Handle]
  retention: Runtime
  doc: 'data time-to-live'
`;
