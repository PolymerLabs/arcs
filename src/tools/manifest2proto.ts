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

const rootNamespace = protobuf.loadSync('./java/arcs/core/data/manifest.proto');
const manifestProto = rootNamespace.lookupType('arcs.Manifest');

export async function serialize2proto(path: string): Promise<Uint8Array> {
  const manifest = await Runtime.parseFile(path);

  // This is a super early sketch of manifest serialization, just for demo purposes.
  const payload = {
    recipes: manifest.recipes.map(r => ({
      name: r.name,
      particles: r.particles.map(p => p.name),
      handles: r.handles.map(h => h.localName).filter(h => !!h /* skip immediate handles */),
    }))
  };

  const errMsg = manifestProto.verify(payload);
  if (errMsg) throw Error(errMsg);

  const message = manifestProto.create(payload);

  return manifestProto.encode(message).finish();
}
