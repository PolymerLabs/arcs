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

const XenonBase = require("./browser/xenon-base.js");

class DomParticle extends XenonBase(Particle) {
  get template() {
    return '';
  }
  get config() {
    return {
      views: this.spec.inputs.map(i => i.name).concat(this.spec.outputs.map(o => o.name)),
      slotName: this.spec.renders.length && this.spec.renders[0].name.name
    };
  }
  async setViews(views) {
    let config = this.config;
    this.when([new ViewChanges(views, config.views, 'change')], async e => {
      // acquire all list data from views (async)
      let data = await Promise.all(config.views.map(name => {
        let view = views.get(name);
        return view.toList ? view.toList() : view.name;
      }));
      // convert view data into props
      let props = {};
      config.views.forEach((name, i) => {
        props[name] = data[i];
      });
      // assign props
      this._viewsUpdated(props);
    });
    this._views = views;
    await this.requireSlot(config.slotName);
  }
  _viewsUpdated(props) {
  }
  setSlot(slot) {
    this._setState({slot});
    this._initializeRender(slot);
    super.setSlot(slot);
  }
  _clearSlot() {
    this._setState({slot: null});
    super._clearSlot();
  }
  _update(props, state) {
    this._renderModel(this._render(props, state));
  }
  _render(props, state) {
  }
  async _renderModel(model) {
    let slotName = this.config.slotName;
    if (!model) {
      this.releaseSlot(slotName);
    } else {
      (await this.requireSlot(slotName)).render({model});
    }
  }
  _initializeRender(slot) {
    let template = this.template;
    this._findHandlerNames(template).forEach(name => {
      slot.clearEventHandlers(name);
      slot.registerEventHandler(name, eventlet => {
        if (this[name]) {
          this[name](eventlet, this._state, this._views);
        }
      });
    });
    slot.render({name: 'main', template: template});
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