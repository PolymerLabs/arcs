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

//const assert = require('assert');
const Slot = require('./slot.js');
const Template = require('./browser/xenon-template.js');

// TODO(sjmiles): using Node syntax to import custom-elements (which only happens in browser context)
if (global.document) {
  require('./browser/x-list.js');
  require('./browser/model-select.js');
}

let templates = new Map();

class DomSlot extends Slot {
  constructor(slotid) {
    super(slotid);
    this.dom = null;
  }
  initialize(context, exposedView) {
    this.dom = context;
    this.exposedView = exposedView;
  }
  isInitialized() {
    return Boolean(this.dom);
  }
  uninitialize() {
    this.dom = null;
    this.exposedView = null;
  }
  derender() {
    var infos = this._findInnerSlotInfos();
    this._setContent('');
    return infos;
  }
  // TODO(sjmiles): content getter vs setContent method
  // this getter was used for rendering as html, hopefully
  // will be evacipated soon
  get content() {
    return this.dom ? this.dom._cachedContent : null;
  }
  // TODO(sjmiles): SlotManager calls here
  render(content, eventHandler) {
    if (this.isInitialized()) {
      this._setContent(content, eventHandler);
      //this._addEventListeners(this._findEventGenerators(), eventHandler);
      return this._findInnerSlotInfos();
    }
  }
  _setContent(content, eventHandler) {
    // TODO(sjmiles): these signals are ad hoc
    let html = null;
    // falsey content is a request to teardown rendering
    if (!content) {
      this.dom.textContent = '';
      this._liveDom = null;
    } else if (typeof content === 'string') {
      // legacy html content
      html = content;
    } else {
      // handle multiplexed content object
      let templateName = content.templateName || 'main';
      if (content.template) {
        templates[templateName] = Object.assign(document.createElement('template'), {
          innerHTML: content.template
        });
      }
      if (content.model) {
        if (!this._liveDom) {
          this._stampTemplate(templates[templateName], eventHandler);
        }
        this._liveDom.set(content.model);
      }
      if (content.html) {
        // legacy html content (unused?)
        html = content.html;
      }
    }
    // legacy html content
    if (typeof html === 'string') {
      // TODO(sjmiles): innerHTML is mutable and cannot be used to memoize original content 
      this.dom.innerHTML = /*this.dom._cachedContent =*/ html;
    }
  }
  _stampTemplate(template, eventHandler) {
    let eventMapper = this._eventMapper.bind(this, eventHandler);
    this._liveDom = Template.stamp(template);
    this._liveDom.mapEvents(eventMapper);
    this._liveDom.appendTo(this.dom);
    // TODO(sjmiles): hack to allow subtree elements (e.g. x-list) to marshal events
    this.dom._eventMapper = eventMapper;
  }
  _eventMapper(eventHandler, node, eventName, handlerName) {
    node.addEventListener(eventName, e => {
      eventHandler({
        handler: handlerName,
        data: {
          key: node.key, //getAttribute('key'),
          value: node.value
        }
      });
    });
  }
  _findInnerSlotInfos() {
    return Array.from(this.dom.querySelectorAll("[slotid]")).map(s => {
      return {
        context: s,
        id: s.getAttribute('slotid')
      };
    });
  }

  /*
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
  _findEventGenerators() {
    return this.dom.querySelectorAll('[events]');
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
  */
}

class MockDomSlot extends DomSlot {
  _setContent(content) {
    let html = content.html || content;
    this.dom.innerHTML = this.dom._cachedContent = html;
  }
  _findInnerSlotInfos() {
    let slots = [];
    let slot;
    let RE = /slotid="([^"]*)"/g;
    while ((slot = RE.exec(this.dom.innerHTML))) {
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

// TODO(sjmiles): this decision should be elsewhere
module.exports = global.document ? DomSlot : MockDomSlot;