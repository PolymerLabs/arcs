// code
import Xen from '../../components/xen/xen.js';
// strings
import icons from '../icons.css.js';

const template = Xen.html`

<style>
  :host {
    display: none;
    position: absolute;
    box-sizing: border-box;
    overflow: hidden;
    top: 52px;
    right: 32px;
    width: 256px;
    height: 200px;
    padding: 8px 0;
    border: 1px solid silver;
    box-shadow: 0px 0px 6px 2px rgba(0,0,0,0.2);
    border-radius: 8px;
    background-color: whitesmoke;
  }
  :host([open]) {
    display: flex;
  }
  div {
    flex: 1;
    box-sizing: border-box;
  }
  menu-item {
    display: flex;
    padding: 6px 16px;
    align-items: center;
  }
  menu-item:hover {
    background-color: silver;
    color: white;
  }
  menu-item > * {
    margin-right: 16px;
  }
  ${icons}
  icon {
    font-size: 16px;
  }
</style>
<div>
  <menu-item on-click="_onShareClick">
    <icon>people</icon><span>Sharing...</span>
  </menu-item>
  <menu-item on-click="_onCastClick">
    <icon>cast</icon><span>Cast</span>
  </menu-item>
</div>
`;

class PopMenu extends Xen.Base {
  get template() {
    return template;
  }
  _close() {
    this._fire('close');
  }
  _onOuterClick() {
    this._close();
  }
  _onShareClick() {
    this._close();
    this._fire('share');
  }
  _onCastClick() {
    this._close();
    this._fire('cast');
  }
}

PopMenu.log = Xen.logFactory('PopMenu', '#bb4d00');
customElements.define('pop-menu', PopMenu);