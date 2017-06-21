'use strict';

let XenElement = require('../lib/xen-element.js');

class InterleavedList extends XenElement {
  didMount() {
    // TODO(sjmiles): restore display:none when not debugging
    //this.style.display = 'none';
    this._observer = new MutationObserver(this._observeNodes.bind(this));
    this._observer.observe(this, {childList: true, subtree: true});
    this._target = this.findTarget();
  }
  findTarget() {
    let node = this.previousElementSibling;
    while (node && node.localName != 'x-list') {
      node = node.previousElementSibling;
    }
    return node;
  }
  _observeNodes(mutations) {
    console.log(mutations);
    let list = this._root.querySelector('x-list');
    if (list) {
      this._observer.disconnect();
      this.interleaved = Array.from(list.children);
      this._observer.observe(list, {childList: true});
    }
  }
  set interleaved(nodes) {
    if (this._interleaved) {
      this._interleaved.forEach(n => n.remove());
    }
    this._interleaved = nodes;
    this.interleaveNodes(nodes, this._target);
  }
  interleaveNodes(nodes, into) {
    console.log('interleaving...');
    let next = into.firstElementChild;
    let tag = 'interleaved';
    nodes.forEach(node => {
      node.setAttribute(tag, '');
      if (next) {
        let container = next.querySelector('[slotid]') || next;
        container.appendChild(node);
        //into.insertBefore(node, next);
        //next.appendChild(node);
        next = next.nextElementSibling;
      } /*else {
        into.appendChild(node);
      }*/
    });
  }
}
customElements.define('interleaved-list', InterleavedList);

module.exports = InterleavedList;
