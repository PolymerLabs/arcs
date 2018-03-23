// elements
// components
// for particle use
// deprecated!
// code libs
import Xen from '../components/xen/xen.js';
import IconStyle from '../components/icons.css.js';

// globals
/* global shellPath */

// templates
const html = Xen.html;
const template = html`
  <style>
    ${IconStyle}
    :host {
      display: block;
    }
    [barSpacer] {
      height: var(--bar-small-height);
      background-color: yellow;
    }
    [scrim] {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      opacity: 0.8;
      background-color: white;
      z-index: -1;
      pointer-events: none;
    }
    [scrim][open] {
      z-index: 9000;
      pointer-events: auto;
    }
    [bar] {
      position: fixed;
      z-index: 10000;
      right: 0;
      bottom: 0;
      left: 0;
      box-sizing: border-box;
      max-width: var(--bar-max-width);
      height: var(--bar-max-height);
      transform: translate3d(0, calc(var(--bar-max-height) - var(--bar-peek-height)), 0);
      margin: 0 auto;
      background-color: white;
      box-shadow: 0px 0px 32px 3px rgba(0,0,0,0.13);
      transition: transform 200ms ease-out;
    }
    [bar][state="hint"] {
      transform: translate3d(0, calc(var(--bar-max-height) - var(--bar-hint-height)), 0);
    }
    [bar][state="over"] {
      transform: translate3d(0, calc(var(--bar-max-height) - var(--bar-small-height)), 0);
    }
    [bar][state="open"] {
      transform: translate3d(0, 0, 0);
    }
    [touchbar] {
      margin-top: -40px;
      height: 40px;
      background-color: transparent;
      /*border: 1px solid rgba(0,0,0,0.01);*/
    }
    [toolbar] {
      display: flex;
      align-items: center;
      height: 56px;
      box-sizing: border-box;
      border: 1px solid rgba(0,0,0,0.05);
    }
    [toolbar] > * {
      padding: 12px 16px;
    }
    [modal] {
      padding: 32px;
      border: 1px solid orange;
      z-index: 0;
    }
    [modal]:hover {
      position: relative;
      z-index: 0;
    }
  </style>

  <div scrim open$="{{scrimOpen}}" on-click="_onBarEscape"></div>
  <div modal>Behind?</div>
  <slot></slot>
  <div barSpacer></div>
  <div bar state$="{{barState}}" open$="{{barOpen}}" over$="{{barOver}}">
    <div touchbar on-click="_onTouchbarClick"></div>
    <div toolbar on-click="_onBarClick" on-mouseenter="_onBarEnter" on-mouseleave="_onBarLeave">
      <icon>location_searching</icon>
      <span style="flex: 1;"></span>
      <icon>search</icon>
      <icon>settings</icon>
    </div>
    <slot name="suggestions" slot="suggestions"></slot>
  </div>
`;

const log = Xen.logFactory('AppBar', '#ac6066');

class AppBar extends Xen.Debug(Xen.Base, log) {
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      barState: 'peek'
    };
  }
  _update(props, state, oldProps, oldState) {
  }
  _render({}, state) {
    const renderModel = {
      scrimOpen: Boolean(state.barOpen)
    };
    return [state, renderModel];
  }
  _consumeConfig(state, config) {
  }
  _onBarEscape() {
    this._setState({barState: 'peek'});
  }
  _onTouchbarClick() {
    const {barState} = this._state;
    if (barState !== 'over') {
      this._setState({barState: 'open'});
    }
  }
  _onBarClick() {
    this._setState({barState: this._state.barState === 'open' ? 'peek' : 'open'});
  }
  _onBarEnter(e) {
    if ((e.target === e.currentTarget) && (this._state.barState === 'peek')) {
      this._setState({barState: Math.random() > 0.2 ? 'over' : 'hint'});
    }
  }
  _onBarLeave(e) {
    if ((e.target === e.currentTarget) && (this._state.barState === 'over') && (window.innerHeight - e.clientY) > 0) {
      this._setState({barState: 'peek'});
    }
  }
}

customElements.define('app-bar', AppBar);
