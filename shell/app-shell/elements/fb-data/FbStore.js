import Arcs from '../../lib/arcs.js';
import ArcsUtils from '../../lib/arcs-utils.js';

export class FbStore {
  static createArcStore(arc, options) {
    let resolver;
    const promise = new Promise(resolve => resolver = resolve);
    const arcstore = document.createElement('arc-handle');
    arcstore.options = options;
    arcstore.arc = arc;
    arcstore.addEventListener('store', e => {
      arcstore.store = e.detail;
      arcstore.add = entity => arcstore.store.store(entity);
      arcstore.remove = id => arcstore.store.remove(id);
      resolver(arcstore);
    });
    return promise;
  }
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
    return store || await context.newStore(type, name, id, tags);
  }
}
