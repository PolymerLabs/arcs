/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {ContextStores} from '../../lib/context-stores.js';
import {nameOfType, simpleNameOfType, boxes} from '../../lib/context-utils.js';
import {ObserverTable} from './observer-table.js';

const handlesTable = new ObserverTable('handles');
const metaTable = new ObserverTable('meta');
const entitiesTable = new ObserverTable('entities');
const friendsTable = new ObserverTable('friends');

export const ArcHandleDisplayMixin = Base => class extends Base {
  async add(handle, store) {
    await super.add(handle, store);
    const key = handle.storageKey;
    const user = key.split('/').slice(5, 6);
    handlesTable.addRow(key, [user, nameOfType(handle.type), key.split('/').pop()]);
  }
  async remove(handle, store) {
    await super.remove(handle, store);
    const key = handle.storageKey;
    handlesTable.removeRow(key);
  }
};

export const ArcMetaDisplayMixin = Base => class extends Base {
  get table() {
    return metaTable;
  }
  async add(entity, store) {
    await super.add(entity, store);
    const {id, rawData: {description, deleted}} = entity;
    if (!deleted) {
      const user = store.storageKey.split('/').slice(5, 6);
      this.table.addRow(id, [user, description]);
    }
  }
  async remove(entity, store) {
    await super.remove(entity, store);
    if (!entity.rawData.deleted) {
      this.table.removeRow(entity.id);
    }
  }
};

export const ShareDisplayMixin = Base => class extends Base {
  async add(entity, store) {
    await super.add(entity, store);
    const user = store.storageKey.split('/').slice(5, 6);
    entitiesTable.addRow(entity.id, [user, simpleNameOfType(store.type), JSON.stringify(entity.rawData)]);
    const typeName = store.type.getEntitySchema().names[0];
    //
    const metrics = ContextStores.getHandleMetrics(store.handle, this.isProfile);
    if (metrics) {
      const share = boxes[metrics.storeId];
      if (share) {
        if (!share.shareTable) {
          const name = metrics.storeId; // typeName
          const tid = ObserverTable.cleanId(name);
          document.body.appendChild(Object.assign(document.createElement('div'), {
            innerHTML: `
  <table id="${tid}">
    <thead>
      <tr><th colspan="3">${metrics.storeName}</th></tr>
      <tr><th style="width:100px">User</th><th style="width:100px">Type</th><th>Data</th></tr>
    </thead>
    <tbody>
    </tbody>
  </table>
  <spacer></spacer>
          `}));
          share.shareTable = new ObserverTable(tid);
        }
        share.shareTable.addRow(entity.id, [user, typeName, JSON.stringify(entity.rawData)]);
      }
      const box = boxes[metrics.boxStoreId];
      if (box) {
        if (!box.boxTable) {
          const name = metrics.boxStoreId;
          const tid = ObserverTable.cleanId(name);
          document.body.appendChild(Object.assign(document.createElement('div'), {
            innerHTML: `
  <table id="${tid}">
    <thead>
      <tr><th colspan="3">${metrics.boxStoreId}</th></tr>
      <tr><th style="width:100px">User</th><th style="width:100px">Type</th><th>Data</th></tr>
    </thead>
    <tbody>
    </tbody>
  </table>
  <spacer></spacer>
          `}));
          box.boxTable = new ObserverTable(tid);
        }
        box.boxTable.addRow(entity.id, [user, typeName, JSON.stringify(entity.rawData)]);
      }
    }
  }
  async remove(entity, store) {
    await super.remove(entity, store);
    entitiesTable.removeRow(entity.id);
    const metrics = ContextStores.getHandleMetrics(store.handle, this.isProfile);
    if (metrics) {
      const share = boxes[metrics.storeId];
      if (share && share.shareTable) {
        share.shareTable.removeRow(entity.id);
      }
      const box = boxes[metrics.boxStoreId];
      if (box && box.boxTable) {
        box.boxTable.removeRow(entity.id);
      }
    }
  }
};

export const ProfileDisplayMixin = Base => class extends ShareDisplayMixin(Base) {
  async add(entity, store) {
    await super.add(entity, store);
    if (this.isFriendStore(store)) {
      friendsTable.addRow(entity.id, [entity.rawData.publicKey]);
    }
  }
  async remove(entity, store) {
    await super.remove(entity, store);
    if (this.isFriendStore(store)) {
      friendsTable.removeRow(entity.id);
    }
  }
};
