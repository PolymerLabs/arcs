/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Schema} from './schema.js';
import {Type, TypeLiteral} from './type.js';

// tslint:disable-next-line: no-any
type SchemaMethod  = (data?: { fields: {}; names: any[]; description: {}; }) => Schema;

export class FromLiteralFactory {

  private static schemaMethod: SchemaMethod;
  static setSchemaMethod(meth: SchemaMethod) {
    FromLiteralFactory.schemaMethod = meth;
  }
// tslint:disable-next-line: no-any
  static schemaFromLiteral(data?: {fields: {}; names: any[]; description: {};}) : Schema {
    return FromLiteralFactory.schemaMethod(data);
  }
}
