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

const {Particle, ViewChanges, StateChanges, SlotChanges} = require("./particle.js");

class DomParticle extends Particle {
  setViews(views) {
    this.when([new ViewChanges(views, this._watchedViews, 'change')], e => {
      this._viewsUpdated(views);
    });
    this.when([new StateChanges(this._watchedStates), new SlotChanges()], e => {
      this._renderViews(views, this._slotName);
    });
  }
  async _renderViews(views, slotName) {
    let model = this._buildRenderModel(views);
    if (!model) {
      this.releaseSlot(slotName);
    } else {
      let slot = await this.requireSlot(slotName);
      this._state = {
        model,
        views
      };
      this._renderToSlot(slot, model);
    }
  }
  _renderToSlot(slot, model) {
    this._initializeRender(slot);
    slot.render({
      model
    });
  }
  _initializeRender(slot) {
    if (!this._renderInitialized) {
      this._renderInitialized = true;
      slot.render({name: 'main', template: this.template});
      let handlers = this._findHandlerNames(this.template);
      handlers.forEach(name => {
        slot.clearEventHandlers(name);
        slot.registerEventHandler(name, eventlet => {
          if (this[name]) {
            this[name](eventlet, this._state.model, this._state.views);
          }
        });
      });
    }
  }
  _findHandlerNames(html) {
    let handlers = new Map();
    let m;
    let re = /on-.*?=\"([^\"]*)"/gmi;
    while ((m = re.exec(html)) !== null) {
      handlers.set(m[1], true);
    }
    return Array.from(handlers.keys());
  }
}

module.exports = DomParticle;