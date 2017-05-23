'use strict';

const Template = require('./xenon-template.js');

class XList extends HTMLElement {
  static get observedAttributes() {
    return ['items','template','handler','render','scope'];
  }

  // TODO(sjmiles): begin inlining MVP replacement for Xenon.Element
  constructor() {
    super();
    this._props = Object.create(null);
    this._state = Object.create(null);
  }
  _setState(state) {
    Object.assign(this._state, state);
  }
  connectedCallback() {
    if (!this._mounted) {
      this._mounted = true;
      this._mount();
      //this.render();
    }
  }
  set items(items) {
    this._props.items = items;
    this.render();
  }
  render() {
    this._render(this._props, this._state);
  }
  _mount() {
    this._setState({
      container: this.querySelector('[container]') || this,
      template: this.querySelector('template')
    });
    this.textContent = '';
  }
  // end

  _render(props, state) {
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
    console.log('XList::_renderList ', props.eventMapper);

    //console.log('_renderList:', props);
    var child = container.firstElementChild, next;
    props.items && props.items.forEach((item,i)=>{
      // use existing node if possible
      next = child && child.nextElementSibling;
      if (!child) {
        try {
          var dom = Template.stamp(template); 
          // TODO(sjmiles): install event handlers explicitly now
          if (props.eventMapper) {
            dom.mapEvents(props.eventMapper);
          }
        } catch(x) {
          console.warn('x-list: if `listen` is undefined, you need to  provide a `handler` property for `on-*` events');
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

customElements.define('x-list', XList);