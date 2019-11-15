/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Dictionary} from './hot.js';
import {Schema} from './schema.js';
import {Type} from './type.js';
/*
 * SchemaFactory contains all the constructor functions for a Schema, as
 * part of a PIMPL architecture, which is necessary to break cyclic
 * dependencies.
 */
export class SchemaFactory {
  // tslint:disable-next-line: no-any
  static createNew(names: string[], fields: Dictionary<any>, description?): Schema {
    return new Schema(names, fields, description);
  }

  static fromLiteral(data = {fields: {}, names: [], description: {}}) {
    const fields = {};
    const updateField = field => {
      if (field.kind === 'schema-reference') {
        const schema = field.schema;
        return {kind: 'schema-reference', schema: {kind: schema.kind, model: Type.fromLiteral(schema.model)}};
      } else if (field.kind === 'schema-collection') {
        return {kind: 'schema-collection', schema: updateField(field.schema)};
      } else {
        return field;
      }
    };
    for (const key of Object.keys(data.fields)) {
      fields[key] = updateField(data.fields[key]);
    }

    const result = new Schema(data.names, fields);
    result.description = data.description || {};
    return result;
  }

  static union(schema1: Schema, schema2: Schema): Schema|null {
    const names = [...new Set([...schema1.names, ...schema2.names])];
    const fields = {};

    for (const [field, type] of [...Object.entries(schema1.fields), ...Object.entries(schema2.fields)]) {
      if (fields[field]) {
        if (!Schema.typesEqual(fields[field], type)) {
          return null;
        }
      } else {
        fields[field] = type;
      }
    }

    return new Schema(names, fields);
  }

  static intersect(schema1: Schema, schema2: Schema): Schema {
    const names = [...schema1.names].filter(name => schema2.names.includes(name));
    const fields = {};

    for (const [field, type] of Object.entries(schema1.fields)) {
      const otherType = schema2.fields[field];
      if (otherType && Schema.typesEqual(type, otherType)) {
        fields[field] = type;
      }
    }

    return new Schema(names, fields);
  }

}
