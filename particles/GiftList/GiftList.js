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
  [gift-list] [row] {
    display: flex; 
    align-items: center; 
    padding: 8px 16px;
  }
  [gift-list] [disc] {
    display: inline-block;
    margin-right: 16px;
    box-sizing: border-box;
    width: 32px;
    height:32px;
    border-radius:40px;
    background-color:gray;
  }
  [gift-list] [icon] {
    display:inline-block;
    width:24px;
    height:24px;
    padding:4px;
    color: white;
  }
</style>

<div gift-list>
  <div>
    <div head>
      <span>Buying Gifts</span>
    </div>
    <div style="padding: 8px; line-height: 1.6em;">
      <div>for <model-select person on-change="_onPersonChange" options="{{people}}"></select></div>
      <div>occasion <model-select occasion on-change="_onOccasionChange" options="{{occasions}}"></select></div>
      <div>due <input type="date"></div>
    </div>
    <x-list items="{{items}}">
      <template>
        <div row>
          <span disc>
            <img icon src="../assets/product.svg">
          </span>
          <span style="flex:1;">{{name}}</span>
          <button events key="{{index}}" on-click="_onChooseValue">Do</button>
        </div>
      </template>
    </x-list>
  </div>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _viewsUpdated(props) {
      this._setState({
        values: props.list
      });
    }
    _render(props, state) {
      if (state.values && state.values.length) {
        return {
          person: 'Claire',
          people: [{value: 'Claire'}],
          occasions: [{value: 'Birthday'}],
          items: state.values.map((value, index) => {return {name: value.name, index}})
        };
      }
    }
    _onChooseValue(e, state, views) {
      //views.get('resultList').store(state.values[e.data.key]);
    }
  };

});