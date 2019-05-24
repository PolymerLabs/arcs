/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
export const ObserverTable = class {
  static cleanId(key) {
    return String(key).replace(/[!:$./|]/g, '_');
  }
  constructor(tableId) {
    this.table = document.querySelector(`#${tableId} tbody`);
  }
  addRow(key, cols) {
    this.disposeRow(key);
    const html = cols.map(msg => `<td>${String(msg).replace(/</g, '&lt;')}</td>`).join('');
    const node = elt(this.table, 'tr', {innerHTML: html});
    node.id = ObserverTable.cleanId(key);
    return node;
  }
  disposeRow(key) {
    const id = ObserverTable.cleanId(key);
    const node = this.table.querySelector(`#${id}`);
    if (node) {
      node.remove();
    }
  }
  removeRow(key) {
    const id = ObserverTable.cleanId(key);
    const node = this.table.querySelector(`#${id}`);
    if (node) {
      node.style.backgroundColor = '#FFC8C8';
    }
  }
  onChange(change, dt) {
    //console.log(change, `${dt}ms`);
    if (change.add) {
      this.onAdd(change.add.rawData);
    } else if (change.remove) {
      this.onRemove(change.remove.rawData);
    }
  }
  onAdd({key, description, deleted}) {
    const node = this.addRow(key, [key, description]);
    if (deleted) {
      node.style = 'color: red;';
    }
  }
  onRemove({key}) {
    this.remove(key);
  }
};

const elt = (container, tag, props) =>
  container.appendChild(Object.assign(document.createElement(tag), props));

