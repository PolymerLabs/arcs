

import Xen from '../components/xen/xen.js';

Xen.Async = class extends Xen.Base {
  // shorthand for adding state,
  // equivalent to `this._setState(state)`
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
  fire(name, detail) {
    this._fire(name, detail);
  }
  _update(props, state, oldProps, oldState) {
    return this.update && this.update(props, state, oldProps, oldState);
  }
  _render(props, state, oldProps, oldState) {
    return this.render && this.render(props, state, oldProps, oldState);
  }
  // event->state utility
  onState(e, data) {
    this._setState({[e.type]: data});
  }
};

export {Xen};
