/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Arcs from '../../../lib/arcs.js';

export class Stores {
  static async createContextStore(context, options) {
    const schemaType = Arcs.Type.fromLiteral(options.schema);
    const typeOf = options.isCollection ? schemaType.collectionOf() : schemaType;
    const store = await this._requireStore(context, typeOf, options);
    return store;
  }
  static async _requireStore(context, type, {name, id, tags, storageKey}) {
    const store = context.findStoreById(id);
    return store || await context.createStore(type, name, id, tags, storageKey);
  }
}
