/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Runtime} from '../runtime/runtime.js';
import protobuf from 'protobufjs';

const rootNamespace = protobuf.loadSync('./java/arcs/core/data/recipe.proto');
const envelope = rootNamespace.lookupType('arcs.RecipeEnvelopeProto');

export async function serialize2proto(path: string): Promise<Uint8Array> {
  const manifest = await Runtime.parseFile(path);

  if (manifest.recipes.length !== 1) throw Error('Manifest should have exactly one recipe');

  // This is a super early sketch of a plan serialization, just for demo purposes.
  const payload = {
    recipe: manifest.recipes.map(r => ({
      name: r.name,
      particles: r.particles.map(p => ({specName: p.name})),
      handles: r.handles.map(h => ({name: h.localName})),
    }))[0],
  };

  const errMsg = envelope.verify(payload);
  if (errMsg) throw Error(errMsg);

  const message = envelope.create(payload);

  return envelope.encode(message).finish();
}
