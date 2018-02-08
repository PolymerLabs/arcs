/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import assert from '../platform/assert-web.js';
import {
  Particle,
  ViewChanges
} from './particle.js';

import XenStateMixin from './browser/lib/xen-state.js';

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
      views: this.spec.inputs.map(i => i.name),
      // TODO(mmandlis): this.spec needs to be replace with a particle-spec loaded from
      // .manifest files, instead of .ptcl ones.
      slotNames: [...this.spec.slots.values()].map(s => s.name)
    };
  }
  _info() {
    return `---------- DomParticle::[${this.spec.name}]`;
  }
  async setViews(views) {
    this._views = views;
    let config = this.config;
    //let readableViews = config.views.filter(name => views.get(name).canRead);
    //this.when([new ViewChanges(views, readableViews, 'change')], async () => {
    this.when([new ViewChanges(views, config.views, 'change')], async () => {
      await this._updateAllViews(views, config);
    });
    // make sure we invalidate once, even if there are no incoming views
    this._setState({});
  }
  async _updateAllViews(views, config) {
    // acquire (async) list data from views
    let data = await Promise.all(
      config.views
      .map(name => views.get(name))
      .map(view => view.toList ? view.toList() : view.get())
    );
    // convert view data (array) into props (dictionary)
    let props = Object.create(null);
    config.views.forEach((name, i) => {
      props[name] = data[i];
    });
    this._setProps(props);
  }
  _update(props, state) {
    if (this._shouldRender(this._props, this._state)) { // TODO: should _shouldRender be slot specific?
      this.relevance = 1; // TODO: improve relevance signal.
    }
    this.config.slotNames.forEach(s => this.render(s, ['model']));
  }

  render(slotName, contentTypes) {
    let slot = this.getSlot(slotName);
    if (!slot) {
      return; // didn't receive StartRender.
    }
    contentTypes.forEach(ct => slot._requestedContentTypes.add(ct));
    if (this._shouldRender(this._props, this._state)) {
      let content = {};
      if (slot._requestedContentTypes.has('template')) {
        content['template'] = this._initializeRender(slot);
      }
      if (slot._requestedContentTypes.has('model')) {
        content['model'] = this._render(this._props, this._state);
      }
      slot.render(content);
    } else if (slot.isRendered) {
      // Send empty object, to clear rendered slot contents.
      slot.render({});
    }
  }
  fireEvent(slotName, {handler, data}) {
    if (this[handler]) {
      this[handler]({data});
    }
  }
  _initializeRender(slot) {
    return this.getTemplate(slot.slotName);
  }
  setParticleDescription(pattern) {
    if (typeof pattern === 'string') {
      return super.setParticleDescription(pattern);
    }
    assert(!!pattern.template && !!pattern.model, 'Description pattern must either be string or have template and model');
    super.setDescriptionPattern('_template_', pattern.template);
    super.setDescriptionPattern('_model_', JSON.stringify(pattern.model));
  }
}

export default DomParticle;
