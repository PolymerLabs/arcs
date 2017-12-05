/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import XTemplate from './xen-template.js';
import XElement from './xen-element.js';
import XState from './xen-state.js';

class XList extends XState(XElement) {
  static get observedAttributes() {
    return ['items','template','handler','render','scope'];
  }
  _mount() {
    this._setState({
      container: this.querySelector('[container]') || this,
      template: this.querySelector('template')
    });
    this.textContent = '';
  }
  _update(props, state) {
    var template = props.template || state.template;
    if (template) {
      this._renderList(state.container, template, props);
    }
  }
  _renderList(container, template, props) {
    // magically plumb eventMapper from an ancestor
    let p = this;
    while (!props.eventMapper && p) {
      props.eventMapper = p._eventMapper;
      p = p.parentElement;
    }
    //console.log('XList::_renderList:', props);
    var child = container.firstElementChild, next;
    props.items && props.items.forEach((item,i)=>{
      // use existing node if possible
      next = child && child.nextElementSibling;
      if (!child) {
        try {
          // TODO(sjmiles): install event handlers explicitly now
          var dom = XTemplate.stamp(template).events(props.eventMapper);
        } catch(x) {
          console.warn('x-list: if `listen` is undefined, you need to provide a `handler` property for `on-*` events');
          throw x;
        }
        child = dom.root.firstElementChild;
        if (child) {
          child._listDom = dom;
          container.appendChild(dom.root);
        }
      }
      if (child) {
        // scope aka childProps
        var scope = Object.create(null);
        // accumulate scope to implement lexical binding
        if (props.scope) {
          Object.assign(scope, props.scope);
          scope.scope = props;
        }
        // TODO(sjmiles): failure to decide if an item is an `item` or an anonymous collection of properties
        scope.item = item;
        if (typeof item === 'object') {
          Object.assign(scope, item);
        }
        // list scope
        scope._items = props.items;
        scope._itemIndex = i;
        scope._item = item;
        // user can supply additional scope processing
        if (props.render) {
          Object.assign(scope, props.render(scope));
        }
        //console.log('_renderList.scope:', scope);
        child._listDom.set(scope);
        child = next;
      }
    });
    // remove extra nodes
    while (child) {
      next = child.nextElementSibling;
      child.remove();
      child = next;
    }
  }
}

if (typeof customElements != 'undefined') {
  customElements.define('x-list', XList);
}
