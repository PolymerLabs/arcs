/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Schema} from '../runtime/schema.js';
import {toProtoJSON} from '../runtime/wasm.js';
import proto_target from 'protobufjs/cli/targets/proto.js';
import protobufjs from 'protobufjs';

/**
 * Convert a Schema to .proto format that can be used to compile protobuf wrappers
 * @param schema a Schema to convert to a proto
 * @returns a string proto2 representation of a .proto file in the 'arcs' package
 */
export async function toProtoFile(schema: Schema):Promise<string> {
    const json = toProtoJSON(schema);
    const protoPromise = new Promise<string>((resolve, reject) => {
     try {
      // For now, default all packages to 'arcs'
      const jsonInArcsPackage = ({nested: {'arcs': json}});
      proto_target(protobufjs.Root.fromJSON(jsonInArcsPackage), {syntax: 'proto2'},
        (err, out) => {err != null ? reject(err) : resolve(out);});
     } catch (e) {
      reject(e);
     }
    });
    return protoPromise;
}
