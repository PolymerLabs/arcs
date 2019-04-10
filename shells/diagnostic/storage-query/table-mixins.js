import {ObserverTable} from './observer-table.js';
import {nameOfType, getBoxTypeSpec, boxes} from './utils.js';

const handlesTable = new ObserverTable('handles');
const metaTable = new ObserverTable('meta');
const entitiesTable = new ObserverTable('entities');
const friendsTable = new ObserverTable('friends');

export const ArcHandleDisplayMixin = Base => class extends Base {
  async add(handle, store) {
    super.add(handle, store);
    const key = handle.storageKey;
    const user = key.split('/').slice(5, 6);
    handlesTable.addRow(key, [user, nameOfType(handle.type), key.split('/').pop()]);
  }
  remove(handle, store) {
    super.remove(handle, store);
    const key = handle.storageKey;
    handlesTable.removeRow(key);
  }
};

export const ArcMetaDisplayMixin = Base => class extends Base {
  get table() {
    return metaTable;
  }
  async add(entity, store) {
    super.add(entity, store);
    const {id, rawData: {description, deleted}} = entity;
    if (!deleted) {
      const user = store.storageKey.split('/').slice(5, 6);
      this.table.addRow(id, [user, description]);
    }
  }
  remove(entity, store) {
    super.remove(entity, store);
    if (!entity.rawData.deleted) {
      this.table.removeRow(entity.id);
    }
  }
};

export const ShareDisplayMixin = Base => class extends Base {
  async add(entity, store) {
    super.add(entity, store);
    const user = store.storageKey.split('/').slice(5, 6);
    const realId = entity.id.split(':').slice(0, -1).join(':');
    entitiesTable.addRow(realId, [user, nameOfType(store.type), JSON.stringify(entity.rawData)]);
    const typeName = store.type.getEntitySchema().names[0];
    const typeSpec = getBoxTypeSpec(store);
    const box = boxes[typeSpec];
    if (!box.table) {
      const tid = typeName.replace(/[[\]]/g, '_');
      document.body.appendChild(Object.assign(document.createElement('div'), {innerHTML: `
<table id="${tid}">
  <thead>
    <tr><th colspan="3">Box of ${typeName}</th></tr>
    <tr><th style="width:100px">User</th><th style="width:200px">Type</th><th>Data</th></tr>
  </thead>
  <tbody>
  </tbody>
</table>
<spacer></spacer>
      `}));
      box.table = new ObserverTable(tid);
    }
    box.table.addRow(realId, [user, typeName, JSON.stringify(entity.rawData)]);
  }
  remove(entity, store) {
    super.remove(entity, store);
    const realId = entity.id.split(':').slice(0, -1).join(':');
    entitiesTable.removeRow(realId);
    const typeSpec = getBoxTypeSpec(store);
    const box = boxes[typeSpec];
    if (box) {
      box.table.removeRow(realId);
    }
  }
};

export const ProfileDisplayMixin = Base => class extends Base {
  async add(entity, store) {
    super.add(entity, store);
    const typeName = store.type.getEntitySchema().names[0];
    if (typeName === 'Friend' && store.type.isCollection) {
      friendsTable.addRow(entity.id, [entity.rawData.publicKey]);
    }
  }
  remove(entity, store) {
    super.remove(entity, store);
    const typeName = store.type.getEntitySchema().names[0];
    if (typeName === 'Friend' && store.type.isCollection) {
      friendsTable.removeRow(entity.id);
    }
  }
};
