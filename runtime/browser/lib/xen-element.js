class XenElement extends HTMLElement {
  constructor() {
    super();
    this._mounted = false;
    this._root = this;
    this.__configureAccessors();
    this.__lazyAcquireProps();
  }
  get _class() {
    // TODO(sjmiles): problem accessing class statics under polyfills can be fixed
    // by attaching _class reference to element constructors (not provided)
    return (this.constructor._class || this.constructor);
  }
  __lazyAcquireProps() {
    var a = this._class.observedAttributes;
    a && a.forEach(n=>{
      if (n.toLowerCase() !== n) {
        console.error('Xen: Mixed-case attributes are not yet supported, `' + this.localName + '.observedAttributes` contains `' + n + '`.');
      }
      if (this.hasOwnProperty(n)) {
        var value = this[n];
        delete this[n];
        this[n] = value;
      } else if (this.hasAttribute(n)) {
        this[n] = this.getAttribute(n);
      }
    });
  }
  __configureAccessors(outputStates) {
    // only do this once per prototype
    var p = Object.getPrototypeOf(this);
    if (!p.hasOwnProperty('__$xenPropsConfigured')) {
      p.__$xenPropsConfigured = true;
      var a = this._class.observedAttributes;
      a && a.forEach((n)=>{
        Object.defineProperty(p, n, {
          get() { return this._getProperty(n); },
          set(value) { this._setProperty(n, value); }
        });
      });
      outputStates && outputStates.forEach((n)=>{
        Object.defineProperty(p, n, {
          get() { return this._state[n]; }
        });
      });
    }
  }
  connectedCallback() {
    this._mount();
  }
  _mount() {
    if (!this._mounted) {
      this._mounted = true;
      this._doMount();
      this._didMount();
    }
  }
  _doMount() {
  }
  _didMount() {
  }
}

module.exports = XenElement;