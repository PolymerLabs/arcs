/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {canonicalPolicyAnnotations} from './policy/canonical-policy-annotations.js';

export const canonicalManifest = `
annotation active
  targets: [Recipe]
  retention: Source
  doc: 'active recipe in arc'

annotation arcId(id: Text)
  targets: [Recipe]
  retention: Source
  doc: 'predefined ID of a long running arc'

annotation ttl(value: Text)
  // Atm TTL is only supported for recipes handles.
  targets: [Handle]
  retention: Runtime
  doc: 'data time-to-live'

annotation persistent
  targets: [Handle, Store, HandleConnection]
  retention: Runtime
  doc: 'storage capability: persistency'

annotation queryable
  targets: [Handle, Store, HandleConnection]
  retention: Runtime
  doc: 'storage capability: queryable'

annotation encrypted
  targets: [Handle, Store, HandleConnection]
  retention: Runtime
  doc: 'storage capability: encrypted'

annotation tiedToArc
  targets: [Handle]
  retention: Runtime
  doc: 'DEPRECATED storage capability mapped to volatile storage'

annotation tiedToRuntime
  targets: [Handle]
  retention: Runtime
  doc: 'DEPRECATED storage capability mapped to ramdisk storage'

annotation isolated
  targets: [Particle]
  retention: Source
  doc: 'Indicates that the given particle is an isolated particle, and does not egress data.'

annotation egress
  targets: [Particle]
  retention: Source
  doc: 'Indicates that the given particle can egress data out of the system (i.e. is not isolated).'

${canonicalPolicyAnnotations}
`;
