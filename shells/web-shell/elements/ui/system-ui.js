/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../../lib/components/xen.js';
import GlowableStyle from '../../../lib/modalities/dom/components/glowable.css.js';
import './panel-ui.js';

// templates
const template = Xen.Template.html`
  <style>
    ${GlowableStyle}
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
      pointer-events: none;
      display: block;
    }
    [bar] {
      pointer-events: all;
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
      --suggestion-wrap: normal;
      --content-overflow: auto;
      transform: translate3d(0, 0, 0);
    }
    [bar][state="over"] {
      --content-overflow: auto;
      transform: translate3d(0, 0, 0);
    }
    /* alternate 'over' (only show search) */
    /*
    [bar][state="over"] {
      transform: translate3d(0, calc(100% - var(--bar-over-height)), 0);
    }
    */
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

// barStates
//   peek: tiny bit peeking out (collapsed)
//   over: temporary mini-view when hovered
//   hint: temporary mini-view (requested by parent when new suggestions are available)
//   open: fully expanded and modal (parent scrim is active)

// props
//   `search` is forwarded to panel-ui
//   `open` owner control over barState `open`

export class SystemUi extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['open', 'search', 'showhint'];
  }
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      showHintFor: 4000,
      barState: 'peek'
    };
  }
  render(props, state) {
    if (!props.open) {
      if (state.pendingBarState) {
        this.state = {barState: state.pendingBarState, pendingBarState: null};
      } else if (state.barState === 'open') {
        this.state = {barState: 'peek'};
      }
    }
    if (props.open) {
      this.state = {barState: 'open'};
    }
    // TODO(sjmiles): owner is expected to latch showHint
    // to false shortly after setting it true
    // Probably we should handshake hint state instead
    if (props.showhint && state.barState !== 'hint' && state.barState !== 'open') {
      this.setBarState('hint');
    }
    return [props, state];
  }
  collapseBar() {
    this.setBarState('peek');
  }
  // TODO(sjmiles): do this work in render
  setBarState(barState) {
    // `open` barState is controlled by owner, we have to request changes
    if (!this.props.open && barState === 'open') {
      this.fire('open', true);
    } else if (this.props.open && barState !== 'open') {
      this.fire('open', false);
      this.state = {pendingBarState: barState};
    } else {
      this.state = {barState};
      this.debounceHintHide(barState);
    }
  }
  debounceHintHide(barState) {
    // if action is null, any pending debounce is turned off
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
  // implements mouse-over view
  onBarEnter(e) {
    switch (this.state.barState) {
      case 'peek':
      case 'hint':
        this.setBarState('over');
        break;
    }
  }
  onBarLeave(e) {
    // don't effect a `leave` if the pointer went off the bottom of the page
    // TODOS(sjmiles): can lead to sticky bar if the pointer re-enters outside bar
    if ((window.innerHeight - e.clientY) > 10) {
      switch (this.state.barState) {
        case 'over':
        case 'hint':
          this.collapseBar();
          break;
      }
    }
  }
  // request from child element to open panel
  onPanelOpen(e, open) {
    this.setBarState(open ? 'open' : 'peek');
  }
  onContentsClick(e) {
    // `contents` is explicitly empty space below panel-ui
    // (i.e. if panel-ui does stopPropagation())
    this.collapseBar();
  }
  onForward(e, data) {
    this.fire(e.type, data);
  }
}

customElements.define('system-ui', SystemUi);
