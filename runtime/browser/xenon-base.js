let XenonStaterMixin = Base => class extends Base {
  constructor() {
    super();
    //this._pendingProps = Object.create(null);
    this._props = this._getInitialProps() || Object.create(null);
    //this._lastProps = Object.create(null);
    this._state = this._getInitialState() || Object.create(null);
    this._lastState = Object.create(null);
    //this.__configureAccessors();
    //this.__lazyAcquireProps();
  }
  _getInitialProps() {
  }
  _getInitialState() {
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
      //console.warn(this.localName + (this.id ? '#' + this.id : '') + ': validated');
      //Object.assign(this._props, this._pendingProps);
      // TODO(sjmiles): React doesn't call `_willReceiveProps` if `setProps` wasn't called
      // (https://github.com/facebook/react/issues/3610#issuecomment-90632210)
      // ... have to find another way to update state on state.
      //if (this._propsInvalid) {
        // TODO(sjmiles): should/can have different timing from rendering?
        //this._willReceiveProps(this._props, this._state);
        //this._propsInvalid = false;
      //}
      // TODO(sjmiles): invented to provide a place to update state on state,
      // as discussed above ... does it break the world
      // this._willReceiveState(this._props, this._state);
      //if (this._shouldUpdate(this._lastProps, this._lastState, this._props, this._state)) {
        // TODO(sjmiles): consider throttling render to rAF
        //this._doMount();
        this._update(this._props, this._state);
      //}
    } catch(x) {
      console.error(x);
    }
    // nullify validator _after_ methods so state changes don't reschedule validation
    // TODO(sjmiles): can/should there ever be state changes fom inside _update()? In React no, in Xenon yes (until I have a good reason not too). 
    this._validator = null;
    // save the old props and state
    // TODO(sjmiles): don't need to create these for default _shouldUpdate
    //this._lastProps = Xenon.mix(null, this._props);
    //this._lastState = Object.assign(Object.create(null), this._state);
    this._didUpdate(this._props, this._state);
  }
  /*
  _willReceiveProps(props, state) {
  }
  _willReceiveState(props, state) {
  }
  _shouldUpdate(oldProps, oldState, props, state) {
    return true;
  }
  */
  _update(props, state) {
  }
  _didUpdate(props, state) {
  }
};

module.exports = XenonStaterMixin;