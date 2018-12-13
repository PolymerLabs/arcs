/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
import {Xen} from '../../../lib/xen.js';
import GlowableStyle from '../../../../modalities/dom/components/glowable.css.js';
import './panel-ui.js';

// templates
const template = Xen.Template.html`
  <style>
    :host {
      --bar-max-width: 400px;
      --bar-max-height: 50vh;
      --bar-hint-height: 160px;
      --bar-over-height: 56px;
      --bar-peek-height: 16px;
      --bar-touch-height: 32px;
      --bar-space-height: 48px;
      --avatar-size: 24px;
      --large-avatar-size: 40px;
    }
    :host {
      display: block;
    }
    ${GlowableStyle}
    [bar] {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      height: var(--bar-max-height);
      max-height: var(--bar-hint-height);
      color: black;
      background-color: white;
      box-shadow: 0px 0px 32px 3px rgba(0,0,0,0.13);
      transition: transform 200ms ease-out;
    }
    [bar] > * {
      flex-shrink: 0;
    }
    [bar][state="peek"] {
      transform: translate3d(0, calc(100% - var(--bar-peek-height)), 0);
    }
    [bar][state="hint"] {
      transform: translate3d(0, 0, 0);
    }
    [bar][state="over"] {
      transform: translate3d(0, calc(100% - var(--bar-over-height)), 0);
    }
    [bar][state="open"] {
      --suggestion-wrap: normal;
      --content-overflow: auto;
      max-height: var(--bar-max-height);
      transform: translate3d(0, 0, 0);
    }
    [touchbar] {
     margin-top: calc(var(--bar-touch-height) * -1);
      height: var(--bar-touch-height);
      background-color: transparent;
    }
    [contents] {
      display: flex;
      flex: 1;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      background-color: white;
    }
  </style>
  <div bar glowing$="{{glows}}" glowable state$="{{barState}}" on-mouseenter="onBarEnter" on-mouseleave="onBarLeave" on-click="onBarClick">
    <div touchbar></div>
    <div contents scrolltop="{{scrollTop:contentsScrollTop}}" on-click="onContentsClick">
      <panel-ui on-open="onPanelOpen" search="{{search}}" on-search="onForward">
        <slot></slot>
      </panel-ui>
    </div>
  </div>
`;

const log = Xen.logFactory('SystemUi', '#b6b0ec');

export class SystemUi extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['open', 'search'];
  }
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      showHintFor: 2500,
      intent: 'start',
      barState: 'peek'
    };
  }
  render(props, state, lastProps, lastState) {
    if (!props.open && state.barState === 'open') {
      this.state = {barState: 'peek'};
    }
    return [props, state];
  }
  collapseBar() {
    this.setBarState('peek');
    this.state = {intent: 'auto'};
  }
  setBarState(barState) {
    // TODO(sjmiles): props.open and state.barState are in a race
    // props.open needs to win or state.barState will get clobbered
    // in render()
    // firing the event first seems to do the right thing, but this
    // is brittle and should be fixed properly
    this.fire('open', barState === 'open');
    this.state = {barState};
    this.debounceHintHide(barState);
  }
  debounceHintHide(barState) {
    // if action is null, debounce is turned off
    let action = null;
    if (barState === 'hint') {
      // only leave hint open for a short time, then hide it automagically
      action = () => {
        if (this.state.barState === 'hint') {
          this.collapseBar();
        }
      };
    }
    this._debounce('hintDebounce', action, this.state.showHintFor);
  }
  // onBarClick(e) {
  //   const wasAnchorClick = e.composedPath().find(n => n.localName === 'a');
  //   this.setBarState(wasAnchorClick ? 'peek' : 'open');
  // }
  onBarEnter(e) {
    if (this.state.barState === 'peek') {
      let barState = 'over';
      if (this.props.showhint && this.state.toolState === 'main') {
        barState = 'hint';
      }
      this.setBarState(barState);
    }
  }
  onBarLeave(e) {
    if ((window.innerHeight - e.clientY) > 10) {
      switch (this.state.barState) {
        case 'over':
        case 'hint':
          this.collapseBar();
          break;
      }
    }
  }
  onPanelOpen(e, open) {
    this.setBarState(open ? 'open' : 'peek');
  }
  onContentsClick(e) {
    // empty space below panel-ui, assuming panel-ui does stopPropagation()
    this.collapseBar();
  }
  onForward(e, data) {
    this.fire(e.type, data);
  }
}

customElements.define('system-ui', SystemUi);
