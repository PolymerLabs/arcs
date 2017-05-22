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

let templates = new Map();

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
  // Returns true, if slot's DOM is initialized, and there is no Particle associated with it.
  isAvailable() {
    return this.isInitialized() && !this.isAssociated();
  }
  uninitialize() {
    this._dom = null;
    this.exposedView = null;
  }
  get content() {
    return this._dom ? this._dom._cachedContent : null;
  }
  _setContent(content) {
    let html = null;
    if (typeof content === 'string') {
      html = content;
    } else {
      let templateName = content.templateName || 'main';
      if (content.template) {
        templates[templateName] = Object.assign(document.createElement('template'), {
          innerHTML: content.template
        });
      }
      if (content.model) {
        html = this._interpolateModel(templateName, content.model);
      }
      if (content.html) {
        html = content.html;
      }
    }
    if (typeof html === 'string') {
      // TODO(sjmiles): why assert intialized here but not in other public methods?
      assert(this.isInitialized(), "Dom isn't initialized, cannot set content");
      // TODO(sjmiles): innerHTML is mutable and cannot be used to memoize original content 
      this._dom.innerHTML = this._dom._cachedContent = html;
    }
  }
  _interpolateModel(templateName, model) {
    // TODO(sjmiles): HTML-based impl is temporary
    let template = templates[templateName];
    // hack extract html from template
    let div = document.createElement('div');
    div.appendChild(document.importNode(template.content, true));
    let html = div.innerHTML;
    // hack template repeat support
    html = this._interpolateRepeat(html, model);
    // hack mustache interpolation
    return this._interpolateHtml(html, model);
  }
  _interpolateRepeat(html, model) {
    let re = /<template.*?repeat="(.*?)".*?>([\s\S]*?)<\/template>/;
    html = html.replace(re, template => {
      let [full, name, html] = template.match(re);
      let items = model[name];
      let result = '';
      items.forEach(item => {
        result += this._interpolateHtml(html, item);
      });
      return result;
    });
    return html;
  }
  _interpolateHtml(html, model) {
    return html.replace(/{{[^}]*}}/g, match => {
      let key = match.slice(2, -2);
      return (key in model) ? model[key] : '(no data)';
    });
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
          eventGenerator.addEventListener(event, (/*e*/) => {
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
  _setContent(content) {
    let html = content.html || content;
    this._dom.innerHTML = this._dom._cachedContent = html;
  }
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