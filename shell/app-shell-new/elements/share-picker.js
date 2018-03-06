// code
import Xen from '../../components/xen/xen.js';
// elements
// strings
import Icons from '../icons.css.js';

const Main = Xen.html`
<style>
  ${Icons}
  :host {
    display: block;
    padding: 8px;
    background-color: white;
    user-select: none;
  }
  item {
    display: flex;
    flex-direction: row;
    align-items: center;
    cursor: pointer;
    padding: 16px;
    margin: 16px;
  }
  icon {
    font-size: 48px;
    padding: 8px;
    margin-right: 32px;
    background-color: whitesmoke;
    border-radius: 100%;
  }
  h3, h5 {
    font-weight: normal;
    margin: 0;
  }
  [selected] {
    background-color: whitesmoke;
    border-radius: 8px;
  }
</style>
<div>
  <item selected$="{{share0}}" on-click="_onSelect" key="0">
    <div>
      <icon style="color: green;">lock</icon>
    </div>
    <div>
       <h3>Private Arc</h3>
       <h5>Information in this Arc is only available by accessing it directly.</h5>
    </div>
  </item>
  <item selected$="{{share1}}" on-click="_onSelect" key="1">
    <div>
      <icon style="color: darkgoldenrod;">person</icon>
    </div>
    <div>
       <h3>Personal Arc</h3>
       <h5>Information in this Arc is used to make suggestions for you, but not your friends.</h5>
    </div>
  </item>
  <item selected$="{{share2}}" on-click="_onSelect" key="2">
    <div>
      <icon style="color: violet;">people</icon>
    </div>
    <div>
       <h3>Public Arc</h3>
       <h5>Information in this Arc is used to make suggestions for you and your friends.</h5>
    </div>
  </item>
</div>

`;

class SharePicker extends Xen.Base {
  static get observedAttributes() { return ['share']; }
  get template() {
    return Main;
  }
  _willReceiveProps({share}, state) {
    state.share = share;
  }
  _render({}, {share}) {
    const render = {
      share,
      share0: share === 0,
      share1: share === 1,
      share2: share === 2
    };
    return render;
  }
  _onSelect(e) {
    const share = Number(e.currentTarget.getAttribute('key'));
    this._setIfDirty({share});
    this._fire('share', share);
  }
}

SharePicker.log = Xen.logFactory('SharePicker', '#bb4d00');
customElements.define('share-picker', SharePicker);