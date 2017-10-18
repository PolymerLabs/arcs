/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
(scope => {

let nob = () => Object.create(null);

let StaterMixin = Base => class extends Base {
  constructor() {
    super();
    this._pendingProps = nob();
    this._props = this._getInitialProps() || nob();
    this._lastProps = nob();
    this._state = this._getInitialState() || nob();
    this._lastState = nob();
  }
  _getInitialProps() {
  }
  _getInitialState() {
  }
  _getProperty(name) {
    return this._pendingProps[name] || this._props[name];
  }
  _setProperty(name, value) {
    // dirty checking opportunity
    if (this._validator || this._wouldChangeProp(name, value)) {
      this._pendingProps[name] = value;
      this._invalidateProps();
    }
  }
  _wouldChangeProp(name, value) {
    return (typeof value === 'object') || (this._props[name] !== value);
  }
  _setProps(props) {
    // TODO(sjmiles): should this be a replace instead of a merge?
    Object.assign(this._pendingProps, props);
    this._invalidateProps();
  }
  _invalidateProps() {
    this._propsInvalid = true;
    this._invalidate();
  }
  _setState(state) {
    Object.assign(this._state, state);
    this._invalidate();
  }
  _async(fn) {
    // TODO(sjmiles): SystemJS throws unless `Promise` is `window.Promise`
    return Promise.resolve().then(fn.bind(this));
    //return setTimeout(fn.bind(this), 10);
  }
  _invalidate() {
    if (!this._validator) {
      //this._log('register _async validate');
      //console.log(this.localName + (this.id ? '#' + this.id : '') + ': invalidated');
      this._validator = this._async(this._validate);
    }
  }
  _validate() {
    // try..catch to ensure we nullify `validator` before return
    try {
      // TODO(sjmiles): should this be a replace instead of a merge?
      Object.assign(this._props, this._pendingProps);
      if (this._propsInvalid) {
        // TODO(sjmiles): should/can have different timing from rendering?
        this._willReceiveProps(this._props, this._state, this._lastProps);
        this._propsInvalid = false;
      }
      if (this._shouldUpdate(this._props, this._state, this._lastProps, this._lastState)) {
        // TODO(sjmiles): consider throttling render to rAF
        this._ensureMount();
        this._update(this._props, this._state, this._lastProps);
      }
    } catch(x) {
      console.error(x);
    }
    // nullify validator _after_ methods so state changes don't reschedule validation
    // TODO(sjmiles): can/should there ever be state changes fom inside _update()? In React no, in Xen yes (until I have a good reason not too).
    this._validator = null;
    // save the old props and state
    // TODO(sjmiles): don't need to create these for default _shouldUpdate
    this._lastProps = Object.assign(nob(), this._props);
    //this._lastState = Object.assign(nob(), this._state);
    this._didUpdate(this._props, this._state);
  }
  _ensureMount() {
  }
  _willReceiveProps(props, state) {
  }
  /*
  _willReceiveState(props, state) {
  }
  */
  _shouldUpdate(props, state, lastProps) {
    return true;
  }
  _update(props, state) {
  }
  _didUpdate(props, state) {
  }
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
  module.exports = StaterMixin;
else
  scope.XenState = StaterMixin;

})(this);
