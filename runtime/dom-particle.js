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

import XenStateMixin from '../shell/components/xen/xen-state.js';

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
  /** @method willReceiveProps(props, state, oldProps, oldState)
   * Override if necessary, to do things when props change.
   */
  willReceiveProps() {
  }
  /** @method update(props, state, oldProps, oldState)
   * Override if necessary, to modify superclass config.
   */
  update() {
  }
  /** @method shouldRender(props, state, oldProps, oldState)
   * Override to return false if the Particle won't use
   * it's slot.
   */
  shouldRender() {
    return true;
  }
  /** @method render(props, state, oldProps, oldState)
   * Override to return a dictionary to map into the template.
   */
  render() {
    return {};
  }
  setState(state) {
    this._setState(state);
  }
  setIfDirty(state) {
    this._setIfDirty(state);
  }
  _willReceiveProps(...args) {
    this.willReceiveProps(...args);
  }
  _update(...args) {
    this.update(...args);
    if (this.shouldRender(...args)) { // TODO: should shouldRender be slot specific?
      this.relevance = 1; // TODO: improve relevance signal.
    }
    this.config.slotNames.forEach(s => this.renderSlot(s, ['model']));
  }
  /** @method get config()
   * Override if necessary, to modify superclass config.
   */
  get config() {
    // TODO(sjmiles): getter that does work is a bad idea, this is temporary
    return {
      views: this.spec.inputs.map(i => i.name),
      // TODO(mmandlis): this.spec needs to be replaced with a particle-spec loaded from
      // .manifest files, instead of .ptcl ones.
      slotNames: [...this.spec.slots.values()].map(s => s.name)
    };
  }
  _info() {
    return `---------- DomParticle::[${this.spec.name}]`;
  }
  async setViews(views) {
    this.handles = views;
    this._views = views;
    let config = this.config;
    this.when([new ViewChanges(views, config.views, 'change')], async () => {
      await this._handlesToProps(views, config);
    });
    // make sure we invalidate once, even if there are no incoming views
    this._invalidate();
  }
  async _handlesToProps(views, config) {
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
  renderSlot(slotName, contentTypes) {
    const stateArgs = this._getStateArgs();
    let slot = this.getSlot(slotName);
    if (!slot) {
      return; // didn't receive StartRender.
    }
    contentTypes.forEach(ct => slot._requestedContentTypes.add(ct));
    // TODO(sjmiles): redundant, same answer for every
    if (this.shouldRender(...stateArgs)) {
      let content = {};
      if (slot._requestedContentTypes.has('template')) {
        content['template'] = this.getTemplate(slot.slotName);
      }
      if (slot._requestedContentTypes.has('model')) {
        content['model'] = this.render(...stateArgs);
      }
      slot.render(content);
    } else if (slot.isRendered) {
      // Send empty object, to clear rendered slot contents.
      slot.render({});
    }
  }
  fireEvent(slotName, {handler, data}) {
    if (this[handler]) {
      // TODO(sjmiles): remove `this._state` parameter
      this[handler]({data}, this._state);
    }
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
