class XenElement extends HTMLElement {
  constructor() {
    super();
    this._mounted = false;
    this._root = this;
  }
  connectedCallback() {
    this.mount();
  }
  mount() {
    if (!this._mounted) {
      this._mounted = true;
      this.doMount();
      this.didMount();
    }
  }
  doMount() {
  }
  didMount() {
  }
}

module.exports = XenElement;