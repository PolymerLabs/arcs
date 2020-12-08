/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Schema} from './schema.js';
import {Type, EntityType} from './type.js';
import {Refinement} from './refiner.js';
import {FieldType, Kind as SchemaFieldKind} from './schema-field.js';

function fromLiteral(data = {fields: {}, names: [], description: {}, refinement: null}) {
  const fields = {};
  for (const key of Object.keys(data.fields)) {
    fields[key] = fieldFromLiteral(data.fields[key]);
    if (fields[key].refinement) {
      fields[key].refinement = Refinement.fromLiteral(fields[key].refinement);
    }
  }
  const result = new Schema(data.names, fields);
  result.description = data.description || {};
  if (data.refinement) {
    result.refinement = Refinement.fromLiteral(data.refinement);
  }
  return result;
}

function fieldFromLiteral(field): FieldType {
  const kind = field.kind;
  switch (kind) {
    case SchemaFieldKind.Reference:
      return FieldType.create({...field, kind, schema: {kind: field.schema.kind, model: Type.fromLiteral(field.schema.model)}});
    case SchemaFieldKind.Collection:
    case SchemaFieldKind.OrderedList:
      return FieldType.create({...field, kind, schema: fieldFromLiteral(field.schema)});
    case SchemaFieldKind.Inline:
      return FieldType.create({...field, kind, model: EntityType.fromLiteral(field.model)});
    default:
      return FieldType.create(field);
  }
}

Schema.fromLiteral = fromLiteral;
FieldType.fromLiteral = fieldFromLiteral;
