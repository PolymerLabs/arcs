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

const assert = require('assert');
const Slot = require('./slot.js');

class DomSlot extends Slot {
  constructor(slotid) {
    super(slotid);
    this._dom = null;
  }
  initialize(context, exposedView) {
    this._dom = context;
    this.exposedView = exposedView;
  }
  isInitialized() {
    return Boolean(this._dom);
  }
  // Returns true, if slot's DOM is initialized, and there is no Particle assigned to it.
  isAvailable() {
    return this.isInitialized() && !this.hasParticle();
  }
  uninitialize() {
    this._dom = null;
    this.exposedView = null;
  }
  get content() {
    return this._dom ? this._dom._cachedContent : undefined;
  }
  _setContent(content) {
    // TODO(sjmiles): why assert intialized here but not in other public methods?
    assert(this.isInitialized(), "Dom isn't initialized, cannot set content");
    // TODO(sjmiles): innerHTML is mutable and cannot be used to memoize original content 
    this._dom.innerHTML = this._dom._cachedContent = content;
  }
  // TODO(sjmiles): a `slotInfo` contains an `id` and a device `context` (e.g. a dom node).
  _findInnerSlotInfos() {
    return Array.from(this._dom.querySelectorAll("[slotid]")).map(s => {
      return {
        context: s,
        id: s.getAttribute('slotid')
      }
    });
  }
  render(content, eventHandler) {
    if (this.isInitialized()) {
      this._setContent(content);
      this._addEventListeners(this._findEventGenerators(), eventHandler);
      return this._findInnerSlotInfos();
    }
  }
  _findEventGenerators() {
    return this._dom.querySelectorAll('[events]');
  }
  _addEventListeners(eventGenerators, eventHandler) {
    for (let eventGenerator of eventGenerators) {
      let data = {
        key: eventGenerator.getAttribute('key'),
        value: eventGenerator.value
      };
      for (let {name, value} of eventGenerator.attributes) {
        if (name.startsWith("on-")) {
          let event = name.substring(3);
          let handler = value;
          eventGenerator.addEventListener(event, e => {
            // TODO(sjmiles): require configuration to control `stopPropagation`/`preventDefault`?
            // e.stopPropagation();
            eventHandler({handler, data});
          });
        }
      }
    }
  }
  derender() {
    var infos = this._findInnerSlotInfos();
    this._setContent('');
    return infos;
  }
}

class MockDomSlot extends DomSlot {
  _findInnerSlotInfos() {
    let slots = [];
    let slot;
    let RE = /slotid="([^"]*)"/g;
    while ((slot = RE.exec(this._dom.innerHTML))) {
      slots.push({
        context: {}, 
        id: slot[1]
      });
    }
    return slots;
  }
  _findEventGenerators() {
    // TODO(mmandlis): missing mock-DOM version
    // TODO(sjmiles): mock-DOM is ill-defined, but one possibility is that it never generates events 
    return [];
  }
}

module.exports = global.document ? DomSlot : MockDomSlot;