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
import {Type} from './type.js';
import {Refinement} from './refiner.js';
import {SchemaField} from './schema-field.js';

function fromLiteral(data = {fields: {}, names: [], description: {}, refinement: null}) {
  const fields = {};
  // TODO(b/162033274): factor this into schema-field.
  const updateField = field => {
    if (field.kind === 'schema-reference') {
      const schema = field.schema;
      return SchemaField.create({kind: 'schema-reference', schema: {kind: schema.kind, model: Type.fromLiteral(schema.model)}});
    } else if (field.kind === 'schema-collection') {
      return SchemaField.create({kind: 'schema-collection', schema: updateField(field.schema)});
    } else {
      return SchemaField.create(field);
    }
  };
  for (const key of Object.keys(data.fields)) {
    fields[key] = updateField(data.fields[key]);
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

Schema.fromLiteral = fromLiteral;
