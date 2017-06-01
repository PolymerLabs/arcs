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
  [chooser] {
    border: 1px solid silver;
    padding: 4px;
  }
  [chooser] [head] {
    color: white;
    background-color: #00897B;
    display: flex;
    align-items: center;
    padding: 8px 16px;
  }
  [chooser] [row] {
    display: flex;
    align-items: center;
    padding: 8px 16px;
  }
  [chooser] [disc] {
    display: inline-block;
    margin-right: 16px;
    box-sizing: border-box;
    width: 32px;
    height:32px;
    border-radius:40px;
    background-color:gray;
  }
  [chooser] [icon] {
    display:inline-block;
    width:24px;
    height:24px;
    padding:4px;
    color: white;
  }
</style>
<div chooser>
  <div>
    <div head>
      <span>Recommendations based on <span>{{person}}</span>'s Wishlist</span>
    </div>
    <x-list items="{{items}}">
      <template>
        <div row>
          <span disc>
            <img icon src="../../../particles/Chooser/product.svg">
          </span>
          <span style="flex:1;">{{name}}</span>
          <button events key="{{index}}" on-click="_onChooseValue">Add</button>
        </div>
      </template>
    </x-list>
  </div>
  <!-- include slot below to cause various problems -->
  <div XXXslotid="action"></div>
</div>
    `.trim();

  return class Chooser extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props) {
      let result = [...difference(props.choices, props.resultList)];
      this._setState({
        values: result
      });
      if (result.length > 0) this.relevance = 10
    }
    _render(props, state) {
      if (state.values && state.values.length) {
        return {
          person: 'Claire',
          items: state.values.map((value, index) => {return {name: value.name, index}})
        };
      }
    }
    _onChooseValue(e, state) {
      this._views.get('resultList').store(state.values[e.data.key]);
    }
  };

  function difference(a, b) {
    let result = new Map();
    a.forEach(value => result.set(JSON.stringify(value.name), value));
    b.map(a => JSON.stringify(a.name)).forEach(value => result.delete(value));
    return result.values();
  }

});