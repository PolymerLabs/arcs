/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import protobuf from 'protobufjs';
import {runfilesDir} from './runfiles-dir.oss.js';

// These variables store classes that deal with protos, upper case name is justified.
// tslint:disable: variable-name
const RootNamespace = protobuf.loadSync(runfilesDir + 'java/arcs/core/data/proto/manifest.proto');
export const ManifestProto = RootNamespace.lookupType('arcs.ManifestProto');
export const FateEnum = RootNamespace.lookupEnum('arcs.Fate');
export const CapabilityEnum = RootNamespace.lookupEnum('arcs.Capability');
export const DirectionEnum = RootNamespace.lookupEnum('arcs.Direction');
export const PrimitiveTypeEnum = RootNamespace.lookupEnum('arcs.PrimitiveTypeProto');
