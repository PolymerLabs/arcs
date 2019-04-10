export const ObserverTable = class {
  constructor(tableId) {
    this.table = document.querySelector(`#${tableId} tbody`);
  }
  cleanId(key) {
    return key.replace(/[!:$./]/g, '_');
  }
  addRow(key, cols) {
    const html = cols.map(msg => `<td>${msg.replace(/</g, '&lt;')}</td>`).join('');
    const node = elt(this.table, 'tr', {innerHTML: html});
    node.id = this.cleanId(key);
    return node;
  }
  removeRow(key) {
    const id = this.cleanId(key);
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

