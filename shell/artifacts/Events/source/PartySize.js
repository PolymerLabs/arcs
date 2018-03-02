// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {

  let host = `party-size`;

  let styles = `
<style>
  [${host}] {
    padding: 6px 0;
    text-align: center;
  }
  [${host}] > * {
    vertical-align: middle;
  }
  [${host}] select {
    padding: 6px;
    font-size: 14px;
  }
  [${host}] .x-select {
    display: inline-block;
    position: relative;
  }
  [${host}] .x-select::after {
    content: '▼';
    display: block;
    position: absolute;
    right: 8px;
    bottom: 6px;
    transform: scaleY(0.6);
    pointer-events: none;
  }
  [${host}] .x-select > select {
    position: relative;
    margin: 0;
    padding: 8px 24px 8px 6px;
    border: 0;
    border-bottom: 1px solid #ddd;
    background-color: transparent;
    border-radius: 0;
    font-size: 14px;
    font-weight: 300;
    overflow: hidden;
    outline: none;
    -webkit-appearance: none;
  }
</style>
  `;

  let template = `
${styles}
<div ${host}>
  <div class="x-select">
    <select on-change="_onPartySizeChanged">
      <option value="1" selected$={{selected1}}>1 person</option>
      <option value="2" selected$={{selected2}}>2 people</option>
      ${[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
        .map(i => `<option value="${i}" selected$={{selected${i}}}>${i} people</option>`).join('')}
      <option value="21" selected$={{selected21}}>Larger party</option>
    </select>
  </div>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps({event}, state) {
      if (event && !event.participants) {
        this._setParticipants(2);
      }
    }
    _setParticipants(size) {
      const event = this._props.event;
      event.participants = Number(size);
      this._views.get('event').set(event);
    }
    _shouldRender({event}) {
      return Boolean(event);
    }
    _render({event}) {
      const partySize = event.participants;
      const selected = {};
      for (let i = 1; i <= 21; ++i) {
        selected[`selected${i}`] = Boolean(partySize == i);
      }
      return selected;
    }
    _onPartySizeChanged(e) {
      this._setParticipants(e.data.value);
    }
  };

});
