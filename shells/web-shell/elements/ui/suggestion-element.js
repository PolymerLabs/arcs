/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../../lib/components/xen.js';

const template = Xen.Template.html`
  <style>
    :host {
      display: flex;
      align-items: center;
      padding: 6px;
      line-height: 20px;
      font-size: 14px;
      letter-spacing: 0.25px;
      color: black;
      cursor: pointer;
      transition: all 150ms;
    }
    [outer] {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: var(--suggestion-wrap);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    [inner] {
      background: rgba(3,169,244,0.05);
      border: 1px solid rgba(0,0,0,.1);
      border-radius: 24px;
      min-height: 40px;
      position: relative;
      transition: all 0.3s ease-in-out;
      width: 100%;
    }
    [client] {
      background-color: #fefefe;
      border-radius: 24px;
      padding: 10px 20px;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: all 150ms;
    }
    [outer]:hover [client] {
      background-color: #E6E6E6;
      color: black;
    }
    :host([inline]) [inner] {
      width: auto;
    }
    :host([inline]) [client] {
      -webkit-animation-name: glowing;
      -webkit-animation-fill-mode: forwards;
      -webkit-animation-duration: 1.8s;
      -webkit-animation-timing-function: ease-in-out;
      -webkit-animation-iteration-count: 2;
      text-align: center;
    }
    @-webkit-keyframes glowing {
      0% {
        background: rgba(255,242,204,0.05);
        box-shadow: 0 0 20px rgba(255,242,204, 0);
      }
      25% {
        background: rgba(255,242,204,0.5);
        box-shadow: 0 0 40px rgba(255,242,204, 0.8);
      }
      50% {
        background: rgba(255,242,204,1.0);
        box-shadow: 0 0 80px rgba(255,242,204, 1);
      }
      75% {
        background: rgba(255,242,204,1.0);
        box-shadow: 0 0 40px rgba(255,242,204, 0.8);
      }
      100% {
        background: rgba(255,242,204,0.8);
        box-shadow: 0 0 40px rgba(255,242,204, 1);
      }
    }
  </style>

  <div outer>
    <div inner>
      <div client>
        <slot on-mouseover="_onMouseover" on-mouseout="_onMouseout"></slot>
      </div>
    </div>
  </div>
`;

export class SuggestionElement extends Xen.Async {
  static get observedAttributes() {
    return ['plan'];
  }
  get template() {
    return template;
  }
  update({plan}, state) {
    if (plan) {
      this.setAttribute('hash', plan.hash);
    }
  }
  _didRender() {
    this.setAttribute('title', this.innerText);
    // observe clicks at the host
    this.onclick = () => this._onClick();
  }
  _onClick() {
    this._fire('plan-choose', this.props.plan, this, {bubbles: true});
  }
  _onMouseover() {
    this._hover(true);
  }
  _onMouseout() {
    this._hover(false);
  }
  _hover(selected) {
    const {plan} = this.props;
    this._fire('plan-hover', {hash: plan && plan.hash, selected}, document);
  }
}

customElements.define('suggestion-element', SuggestionElement);
