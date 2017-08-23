/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// TODO: It is no longer in use, remove?
// 'use strict';
//
// let XenElement = require('../lib/xen-element.js');
//
// class InterleavedList extends XenElement {
//   _didMount() {
//     // TODO(sjmiles): restore display:none when not debugging
//     //this.style.display = 'none';
//     this._observer = new MutationObserver(this._observeNodes.bind(this));
//     this._observer.observe(this, {childList: true, subtree: true});
//     this._target = this._findTarget();
//   }
//   // target for injecting interleaved nodes is the first x-list that is a preceding sibling of `this`
//   _findTarget() {
//     let node = this.previousElementSibling;
//     while (node && node.localName != 'x-list') {
//       node = node.previousElementSibling;
//     }
//     return node;
//   }
//   _observeNodes(/*mutations*/) {
//     //console.log(mutations);
//     let list = this._root.querySelector('x-list');
//     if (list) {
//       this._observer.disconnect();
//       this._setInterleaved(Array.from(list.children));
//       this._observer.observe(list, {childList: true});
//     }
//   }
//   _setInterleaved(nodes) {
//     if (this._interleaved) {
//       this._interleaved.forEach(n => n.remove());
//     }
//     this._interleaved = nodes;
//     this._interleaveNodes(nodes, this._target);
//   }
//   _interleaveNodes(nodes, into) {
//     //console.log('interleaving...');
//     let tag = 'interleaved';
//     let next = into.firstElementChild;
//     nodes.forEach(node => {
//       node.setAttribute(tag, '');
//       if (next) {
//         let container = next.querySelector('[slotid]') || next;
//         container.appendChild(node);
//         next = next.nextElementSibling;
//       }
//     });
//   }
// }
// customElements.define('interleaved-list', InterleavedList);
//
// module.exports = InterleavedList;
