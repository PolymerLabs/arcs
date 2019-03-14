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
      this.onAdd(change.add);
    } else if (change.remove) {
      this.onRemove(change.remove);
    }
  }
  onAdd({rawData}) {
    const node = this.addRow(rawData.key, [rawData.key, rawData.description]);
    if (rawData.deleted) {
      node.style = 'color: red;';
    }
    //console.log(rawData);
    //msg(`add: ${change.add.rawData.description}`);
  }
  onRemove({rawData}) {
    const node = document.querySelector(`#${rawData.key}`);
    node.style.backgroundColor = '#FFC8C8';
    //msg(`remove: ${rawData.description}`);
  }
};

const elt = (container, tag, props) =>
  container.appendChild(Object.assign(document.createElement(tag), props));

