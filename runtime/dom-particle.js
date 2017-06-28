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

const XenonBase = require("./browser/lib/xenon-base.js");

//let log = !global.document || (global.logging === false) ? () => {} : console.log.bind(console, `---------- DomParticle::`);
//console.log(!!global.document, global.logging, log);

let log = false ? console.log.bind(console) : () => {};

class DomParticle extends XenonBase(Particle) {
  // override to return a String defining primary markup
  get template() {
    return '';
  }
  // override to return false if the Particle won't use it's slot
  _shouldRender(props, state) {
    return true;
  }
  // override to return a dictionary to map against the template
  _render(props, state) {
  }
  // override if necessary, to do things when props change
  _willReceiveProps(props) {
  }
  // override if necessary, to modify superclass config
  get config() {
    // TODO(sjmiles): getter that does work is a bad idea, this is temporary
    return {
      // TODO(sjmiles): output views shouldn't be included here, but afaict, `inout`
      // doesn't work yet in manifest, so we are using `out` views for `inout` views
      views: this.spec.inputs.map(i => i.name).concat(this.spec.outputs.map(o => o.name)),
      slotName: this.spec.renders.length && this.spec.renders[0].name.name
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
      let data = await Promise.all(config.views.map(name => {
        let view = views.get(name);
        return view.toList ? view.toList() : view.get();
      }));
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
    let slotName = this.config.slotName;
    if (this._shouldRender(props, state) === false) {
      this.releaseSlot(slotName);
    } else {
      this.requireSlot(slotName);
    }
    if (state.slot) {
      log(`${this._info()}: rendering`);
      state.slot.render({model: this._render(props, state)});
    }
  }
  /*
  async _renderModel(model) {
    let slotName = this.config.slotName;
    if (!model) {
      if (this.slot) {
        //log(`${this.info()}: _renderModel about to releaseSlot: `, this.spec.name);
        this.releaseSlot(slotName);
      }
    } else {
      // TODO(sjmiles): render commands will stack up as we wait for slots, which
      // is generally not what we want
      //log(`${this.info()}: _renderModel about to requireSlot: `, this.spec.name, Object.keys(model));
      (await this.requireSlot(slotName)).render({model});
    }
  }
  */
  setSlot(slot) {
    this._setState({slot: slot});
    this._initializeRender(slot);
    super.setSlot(slot);
  }
  _clearSlot() {
    this._setState({slot: null});
    super._clearSlot();
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