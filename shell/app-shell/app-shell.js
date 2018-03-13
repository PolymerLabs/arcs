// elements
import './elements/shell-ui.js';
import '../components/suggestion-element.js';

// code
import Xen from '../components/xen/xen.js';

// templates
const template = Xen.html`

  <shell-ui>
    <div slotid="toproot"></div>
    <div slotid="root"></div>
    <div slotid="modal"></div>
    <div slotid="suggestions" slot="suggestions"></div>
  </shell-ui>

`;

class AppShell extends Xen.Base {
  static get observedAttributes() {
    return [];
  }
  get host() {
    return this;
  }
  get template() {
    return template;
  }
  _getInitialState() {
    return {};
  }
  _update(props, state) {
    super._update(props, state);
  }
  _render({}, {}) {
    const render = {};
    return render;
  }
  _onData(e, data) {
    const property = e.type.replace(/-/g, '');
    if (this._setIfDirty({[property]: data})) {
      AppShell.log(property, data);
    }
  }
}

AppShell.log = Xen.Base.logFactory('AppShell', '#6660ac');
customElements.define('app-shell', AppShell);

export default AppShell;