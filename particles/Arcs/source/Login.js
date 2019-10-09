/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle, html, log, resolver}) => {

  const host = 'login';

  const logo = html`
<?xml version="1.0" encoding="UTF-8"?>
<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
    <g id="app_logo_24x24">
      <g id="Group-13-Copy-2">
        <g id="Group-5">
          <circle id="Oval-4" stroke="#000000" stroke-width="2" cx="12" cy="12" r="11"></circle>
          <path d="M16,5 C16.5522847,5 17,5.44771525 17,6 L17,18 C17,18.5522847 16.5522847,19 16,19 C15.4477153,19 15,18.5522847 15,18 L15,6 C15,5.44771525 15.4477153,5 16,5 Z" id="Combined-Shape" fill="#000000"></path>
          <path d="M15.2972712,5.29727116 L16.7114847,6.71148472 L4.307085,19.1158844 C4.17691024,19.2460592 4.0197754,19.3328424 3.85365387,19.376234 C3.68753234,19.4196255 3.51242411,19.4196255 3.34630258,19.376234 C3.18018105,19.3328424 3.02304621,19.2460592 2.89287144,19.1158844 C2.50234715,18.7253601 2.50234715,18.0921952 2.89287144,17.7016709 L15.2972712,5.29727116 Z" id="Combined-Shape-Copy" fill="#000000"></path>
        </g>
      </g>
    </g>
  </g>
</svg>`;

  const template = html`
<div ${host}>
  <style>
    [${host}] {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      /* pointer-events: all; */
    }
    [${host}] > * {
      width: 450px;
      box-sizing: border-box;
    }
    [${host}] [box] {
      border-radius: 8px;
      box-shadow: 0 0 7px rgba(0, 0, 0, 0.4);
      height: 440px;
      padding: 48px 40px 36px;
    }
    [${host}] [logo] {
      line-height: 1.43;
    }
    [${host}] [signin] {
      padding-top: 16px;
      font-size: 24px;
    }
    [${host}] [blurb] {
      font-size: 16px;
      letter-spacing: .1px;
      line-height: 1.5;
      padding-top: 8px;
    }
    [${host}] [username] {
      padding-top: 32px;
      display: flex;
    }
    [${host}] [bar] {
      padding-top: 48px;
      text-align: right;
    }
    [${host}] [postamble] {
      display: flex;
      font-size: 12px;
      padding-top: 16px;
    }
    [${host}] [spacer] {
      flex: 1;
    }
    [${host}] [help] {
      width: 180px;
      display: flex;
      justify-content: space-evenly;
    }
  </style>
  <div box>
    <div logo>${logo}</div>
    <div signin>Sign in to Arcs</div>
    <div blurb>Sign in with your Arcs Account to get your arcs, shares, and other settings on all your devices</div>
    <cx-input username error="Enter a storage key:">
      <input slot="input" id="keyInput" required on-input="onInput">
      <label slot="label" for="keyInput">&nbsp;Storage Key</label>
    </cx-input>
    <div bar>
      <cx-button><button disabled$="{{nextDisabled}}">Next</button></cx-button>
    </div>
  </div>
  <div postamble>
    <span>Lawyer cats mumble mumble</span>
    <span spacer></span>
    <span help>
      <span>Help</span>
      <span>Privacy</span>
      <span>Terms</span>
    </span>
  </div>
</div>
    `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    _getInitialState() {
      return {
        nextDisabled: true
      };
    }
    render(props, state) {
      return state;
    }
    onInput({data: {value}}) {
      this.setState({nextDisabled: value == ''});
      this.set('key', {key: value});
    }
  };

});
