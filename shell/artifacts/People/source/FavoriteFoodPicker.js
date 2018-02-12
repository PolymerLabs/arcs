// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let host = `favorite-food-picker`;

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
    My favorite food is:
    <select on-change="_onFavoriteFoodChanged">
      ${['Pizza', 'Bacon', 'Lobster', 'Tim Tam', 'Kale']
        .map(i => `<option value="${i}" selected$={{selected${i}}}>${i}</option>`).join('')}
    </select>
  </div>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _render(props, state) {
      let food = props.food && props.food && props.food.food || '';
      return {
        [`selected${food}`]: true
      }
    }
    _onFavoriteFoodChanged(e, state) {
      const food = this._views.get('food');

      food.set(new food.entityClass({food: e.data.value}));
    }
  };

});
