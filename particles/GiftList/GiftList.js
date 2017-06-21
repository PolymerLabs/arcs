// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let template = `
<style>
  [gift-list] {
    border: 1px solid silver;
    padding: 4px;
  }
  [gift-list] [head] {
    color: white;
    background-color: #00897B;
    display: flex;
    align-items: center;
    padding: 8px 16px;
  }
  [gift-list] [form] {
    padding: 8px;
    line-height: 1.6em;
  }
  [gift-list] [form] div {
    display: flex;
  }
  [gift-list] [form] div * {
    flex: 4;
  }
  [gift-list] [form] div span {
    flex: 1;
    text-align: right;
    padding-right: 12px;
  }
</style>

<div gift-list>
  <div>
    <div head>
      <span>Buying Gifts</span>
    </div>
    <div form>
      <div><span>for</span><model-select person on-change="_onPersonChange" options="{{people}}"></select></div>
      <div><span>occasion</span><model-select occasion on-change="_onOccasionChange" options="{{occasions}}"></select></div>
      <div><span>due</span><input type="date"></div>
    </div>
  </div>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _render(props, state) {
      return {
        person: 'Claire',
        people: [{value: 'Claire'}],
        occasions: [{value: 'Birthday'}]
      };
    }
  };

});