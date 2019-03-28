export const ObserverTable = class {
  constructor(tableId) {
    this.table = document.querySelector(`#${tableId} tbody`);
  }
  addRow(key, cols) {
    const html = cols.map(msg => `<td>${msg}</td>`).join('');
    const node = elt(this.table, 'tr', {innerHTML: html});
    node.id = key;
    return node;
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
    const node = document.querySelector(`#${key}`);
    node.style.backgroundColor = '#FFC8C8';
  }
};

const elt = (container, tag, props) =>
  container.appendChild(Object.assign(document.createElement(tag), props));

