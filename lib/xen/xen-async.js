/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import Xen from './xen.js';

const XenAsyncMixin = Base => class extends Base {
  // shorthand for adding state,
  // `this.state = state` is equivalent to `this._setState(state)`
  set state(state) {
    this._setState(state);
  }
  get state() {
    return this._state;
  }
  get props() {
    return this._props;
  }
  // store result `await operation()` into state[name],
  // making sure to only invoke `operation` once even if
  // `awaitState` is called multiple times
  async awaitState(name, operation) {
    const state = this._state;
    const semaphore = `_await_${name}`;
    //console.warn('awaitState', name, state[semaphore]);
    if (!state[semaphore]) {
      state[semaphore] = true;
      const value = await operation();
      this.state = {[name]: value, [semaphore]: false};
    }
  }
  // underscore relief
  fire(...args) {
    this._fire(...args);
  }
  _getInitialState() {
    return this.getInitialState && this.getInitialState();
  }
  _update(props, state, oldProps, oldState) {
    return this.update && this.update(props, state, oldProps, oldState);
  }
  _render(props, state, oldProps, oldState) {
    if (this.shouldRender(props, state, oldProps, oldState)) {
      return this.render && this.render(props, state, oldProps, oldState);
    }
  }
  shouldRender() {
    return true;
  }
  render(props, state) {
    return state;
  }
  // event->state utility
  onState(e, data) {
    this._setState({[e.type]: data});
  }
};

Xen.AsyncMixin = XenAsyncMixin;
Xen.Async = XenAsyncMixin(Xen.Base);

export {Xen, XenAsyncMixin};
