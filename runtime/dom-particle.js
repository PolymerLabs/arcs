/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

const {
  Particle,
  ViewChanges,
  //StateChanges,
  //SlotChanges
} = require("./particle.js");

const XenStateMixin = require("./browser/lib/xen-state.js");

//let log = !global.document || (global.logging === false) ? () => {} : console.log.bind(console, `---------- DomParticle::`);
//console.log(!!global.document, global.logging, log);

let log = false ? console.log.bind(console) : () => {};

/** @class DomParticle
 * Particle that does stuff with DOM.
 */
class DomParticle extends XenStateMixin(Particle) {
  /** @method get template()
   * Override to return a String defining primary markup.
   */
  get template() {
    return '';
  }
  /** @method getTemplate(slotName)
   * Override to return a String defining primary markup for the given slot name.
   */
  getTemplate(slotName) {
    // TODO: only supports a single template for now. add multiple templates support.
    return this.template;
  }
  /** @method _shouldRender(props, state)
   * Override to return false if the Particle won't use
   * it's slot.
   */
  _shouldRender(props, state) {
    return true;
  }
  /** @method _render(props, state)
   * Override to return a dictionary to map into the template.
   */
  _render(props, state) {
    return {};
  }
  /** @method _willReceiveProps(props)
   * Override if necessary, to do things when props change.
   */
  _willReceiveProps(props) {
  }
  /** @method get config()
   * Override if necessary, to modify superclass config.
   */
  get config() {
    // TODO(sjmiles): getter that does work is a bad idea, this is temporary
    return {
      // TODO(sjmiles): output views shouldn't be included here, but afaict, `inout`
      // doesn't work yet in manifest, so we are using `out` views for `inout` views
      views: this.spec.inputs.map(i => i.name).concat(this.spec.outputs.map(o => o.name)),
      // TODO(mmandlis): this.spec needs to be replace with a particle-spec loaded from
      // .manifest files, instead of .ptcl ones.
      slotNames: [ this.spec.renders.length && this.spec.renders[0].name.name ]
    };
  }
  _info() {
    return `---------- DomParticle::[${this.spec.name}]`;
  }
  async setViews(views) {
    this._views = views;
    let config = this.config;
    this.when([new ViewChanges(views, config.views, 'change')], async () => {
      //log(`${this.info()}: invalidated by [ViewChanges]`);
      // acquire (async) list data from views
      let data = await Promise.all(config.views
          .map(name => views.get(name))
          .filter(view => view.canRead)
          .map(view => view.toList ? view.toList() : view.get()));
      // convert view data (array) into props (dictionary)
      let props = config.views.reduce((props, name, i) => {
        let value = data[i];
        props[name] = (value && value.rawData) ? value.rawData : value;
        return props;
      }, Object.create(null));
      this._setProps(props);
    });
  }
  _update(props, state) {
    this.config.slotNames.forEach(s => this.render(s, ["model"]));
  }
  render(slotName, contentTypes) {
    let slot = this.getSlot(slotName);
    if (!slot) {
      return;  // didn't receive StartRender.
    }
    contentTypes.forEach(ct => slot._requestedContentTypes.add(ct));
    if (this._shouldRender(this._props, this._state)) {
      let content = {};
      if (slot._requestedContentTypes.has("template")) {
        content["template"] = this._initializeRender(slot);
      }
      if (slot._requestedContentTypes.has("model")) {
        content["model"] = this._render(this._props, this._state);
      }
      slot.render(content);
    } else if (slot.isRendered) {
      // Send empty object, to clear rendered slot contents.
      slot.render({});
    }
  }
  _initializeRender(slot) {
    let template = this.getTemplate(slot.slotName);
    this._findHandlerNames(template).forEach(name => {
      slot.clearEventHandlers(name);
      slot.registerEventHandler(name, eventlet => {
        if (this[name]) {
          this[name](eventlet, this._state, this._views);
        }
      });
    });
    return template;
  }
  _findHandlerNames(html) {
    let handlers = new Map();
    let re = /on-.*?=\"([^\"]*)"/gmi;
    for (let m=re.exec(html); m; m=re.exec(html)) {
      handlers.set(m[1], true);
    }
    return Array.from(handlers.keys());
  }
}

module.exports = DomParticle;
