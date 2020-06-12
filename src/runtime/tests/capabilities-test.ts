// /**
//  * @license
//  * Copyright 2019 Google LLC.
//  * This code may only be used under the BSD style license found at
//  * http://polymer.github.io/LICENSE.txt
//  * Code distributed by Google as part of this project is also
//  * subject to an additional IP rights grant found at
//  * http://polymer.github.io/PATENTS.txt
//  */
// import {assert} from '../../platform/chai-web.js';
// import {Capabilities, Capability} from '../capabilities.js';

// describe('Capabilities', () => {
//   it('verifies same capabilities', () => {
//     assert.isTrue(Capabilities.empty.isSame(Capabilities.empty));
//     assert.isTrue(Capabilities.persistent.isSame(Capabilities.persistent));
//     assert.isTrue(Capabilities.queryable.isSame(Capabilities.queryable));
//     assert.isTrue(Capabilities.persistentQueryable.isSame(
//         Capabilities.persistentQueryable));
//     assert.isTrue(Capabilities.tiedToRuntime.isSame(Capabilities.tiedToRuntime));
//     assert.isTrue(Capabilities.tiedToArc.isSame(Capabilities.tiedToArc));

//     assert.isFalse(Capabilities.empty.isSame(Capabilities.persistent));
//     assert.isFalse(Capabilities.persistent.isSame(Capabilities.tiedToRuntime));
//     assert.isFalse(Capabilities.tiedToRuntime.isSame(Capabilities.tiedToArc));
//     assert.isFalse(Capabilities.tiedToArc.isSame(Capabilities.persistent));
//     assert.isFalse(Capabilities.queryable.isSame(Capabilities.persistentQueryable));

//     assert.isTrue(new Capabilities([]).isSame(new Capabilities([])));
//     assert.isTrue(new Capabilities([Capability.Persistent, Capability.TiedToArc]).isSame(
//         new Capabilities([Capability.Persistent, Capability.TiedToArc])));
//     assert.isTrue(new Capabilities([Capability.Persistent, Capability.Queryable]).isSame(
//           Capabilities.persistentQueryable));
//     assert.isFalse(new Capabilities([Capability.Persistent, Capability.TiedToArc]).isSame(Capabilities.persistent));
//     assert.isFalse(Capabilities.persistent.isSame(
//       new Capabilities([Capability.Persistent, Capability.TiedToArc])));
//   });

//   it('verifies contained capabilities', () => {
//     assert.isTrue(Capabilities.empty.contains(Capabilities.empty));
//     assert.isTrue(Capabilities.persistent.contains(Capabilities.persistent));
//     assert.isTrue(Capabilities.queryable.contains(Capabilities.queryable));
//     assert.isTrue(Capabilities.persistentQueryable.contains(Capabilities.persistentQueryable));
//     assert.isTrue(Capabilities.persistentQueryable.contains(Capabilities.persistent));
//     assert.isTrue(Capabilities.persistentQueryable.contains(Capabilities.queryable));
//     assert.isTrue(Capabilities.tiedToRuntime.contains(Capabilities.tiedToRuntime));
//     assert.isTrue(Capabilities.tiedToArc.contains(Capabilities.tiedToArc));

//     assert.isFalse(Capabilities.empty.contains(Capabilities.persistent));
//     assert.isFalse(Capabilities.persistent.contains(Capabilities.empty));
//     assert.isFalse(Capabilities.persistent.contains(Capabilities.tiedToRuntime));
//     assert.isFalse(Capabilities.tiedToRuntime.contains(Capabilities.tiedToArc));
//     assert.isFalse(Capabilities.tiedToArc.contains(Capabilities.persistent));
//     assert.isFalse(Capabilities.persistent.contains(Capabilities.persistentQueryable));
//     assert.isFalse(Capabilities.queryable.contains(Capabilities.persistentQueryable));
//     assert.isFalse(Capabilities.queryable.contains(Capabilities.persistent));

//     assert.isTrue(new Capabilities([Capability.Persistent, Capability.TiedToArc]).contains(
//         new Capabilities([Capability.Persistent, Capability.TiedToArc])));
//     assert.isTrue(new Capabilities([Capability.Persistent, Capability.TiedToArc]).contains(Capabilities.persistent));
//     assert.isFalse(Capabilities.persistent.isSame(
//       new Capabilities([Capability.Persistent, Capability.TiedToArc])));
//   });
// });
