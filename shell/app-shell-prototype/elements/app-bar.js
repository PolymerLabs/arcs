// elements
// components
import './suggestion-element.js';
// for particle use
// deprecated!
// code libs
import Xen from '../../components/xen/xen.js';
import IconStyle from '../../components/icons.css.js';

// globals
/* global shellPath */

// templates
const html = Xen.html;
const template = html`
  <style>
    ${IconStyle}
    :host {
      --bar-max-width: 400px;
      --bar-max-height: 33vh;
      --bar-hint-height: 112px;
      --bar-small-height: 56px;
      --bar-peek-height: 16px;
      --bar-touch-height: 32px;
      --bar-space-height: 48px;
    }
    :host {
      display: block;
    }
    [scrim] {
      position: fixed;
      top: 0;
      right: 0;
      /*bottom: 0;*/
      left: 0;
      height: 100vh;
      opacity: 0;
      background-color: white;
      z-index: -1;
      pointer-events: none;
      transition: opacity 200ms ease-in;
    }
    [scrim][open] {
      z-index: 9000;
      pointer-events: auto;
      opacity: 0.8;
    }
    [barSpacer] {
      height: var(--bar-space-height);
    }
    [touchbar] {
      margin-top: calc(var(--bar-touch-height) * -1);
      height: var(--bar-touch-height);
      background-color: transparent;
      /*border: 1px solid rgba(0,0,0,0.01);*/
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
    ::slotted([slotid=modal]) {
      position: fixed;
      top: 0;
      bottom: 0;
      max-width: var(--max-width);
      width: 100vw;
      margin: 0 auto;
      padding-bottom: var(--bar-space-width);
      box-sizing: border-box;
      pointer-events: none;
      color: black;
    }
    ::slotted([slotid=suggestions]) {
      display: flex;
      flex-direction: column;
      max-height: 356px;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 10px;
    }
  </style>

  <div scrim open$="{{scrimOpen}}" on-click="_onBarEscape"></div>
  <slot name="modal"></slot>
  <slot></slot>
  <!-- adds space at the bottom of the static flow so no actual content is ever covered by the app-bar -->
  <div barSpacer></div>
  <div bar state$="{{barState}}" open$="{{barOpen}}" over$="{{barOver}}" on-mouseenter="_onBarEnter" on-mouseleave="_onBarLeave">
    <div touchbar on-click="_onTouchbarClick"></div>
    <div toolbar on-click="_onBarClick">
      <icon>location_searching</icon>
      <span style="flex: 1;"></span>
      <icon>search</icon>
      <icon>settings</icon>
    </div>
    <slot name="suggestions" slot="suggestions" on-plan-choose="_onPlanChoose"></slot>
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
      scrimOpen: state.barState === 'open'
    };
    return [state, renderModel];
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
      log(e.type);
      this._setState({barState: Math.random() > 0.5 ? 'over' : 'hint'});
    }
  }
  _onBarLeave(e) {
    if ((e.target === e.currentTarget) && (window.innerHeight - e.clientY) > 8) {
      log(e.type);
      switch (this._state.barState) {
        case 'over':
        case 'hint':
          this._setState({barState: 'peek'});
          break;
      }
    }
  }
  _onPlanChoose(e, plan) {
    e.stopPropagation();
    this._fire('plan', plan);
    this._setState({barState: 'peek'});
  }
}

customElements.define('app-bar', AppBar);
