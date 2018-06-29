import Arcs from '../../lib/arcs.js';

export class FbStore {
  static async createContextStore(context, options) {
    let type = options.type;
    let setOf = false;
    if (type[0] == '[') {
      setOf = true;
      type = type.slice(1, -1);
    }
    const schemaType = Arcs.Type.fromLiteral(options.schema);
    const typeOf = setOf ? schemaType.collectionOf() : schemaType;
    const store = await this._requireHandle(context, typeOf, options.name, options.id, options.tags);
    return store;
  }
  static async _requireHandle(context, type, name, id, tags) {
    const store = context.findStoreById(id);
    return store || await context.createStore(type, name, id, tags);
  }
}
