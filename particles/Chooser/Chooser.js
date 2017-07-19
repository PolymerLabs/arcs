/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

"use strict";

var host = `[chooser]`;
var productStyles = '';

importScripts('../../../particles/shared/product-templates.js');

defineParticle(({DomParticle}) => {

  let styles = `
<style>
  ${host} {
    padding: 0 16px;
    margin-top: 16px;
    background-color: #f4f4f4;
    border-top: 4px solid silver;
  }
  ${host} [chevron] {
    color: silver;
    transform: translate3d(50%, -17px, 0);
    height: 0;
  }
  ${host} [head] {
    /*display: flex;
    align-items: center;*/
    padding: 16px 0;
    color: #555555;
    font-size: 0.8em;
  }
  ${host} button {
    padding: 4px 12px;
    border-radius: 16px;
    border: 1px solid silver;
    font-size: 0.75em;
    margin-top: 6px;
    outline: none;
  }
  ${host} [item] {
    padding: 4px 8px;
    background-color: white;
    border-bottom: 8px solid #eeeeee;
  }
</style>
  `;

  let productTemplate = `
<template>
  <div item>
    <div row>
      <div col0>
        <div name title="{{name}}">{{name}}</div>
        <div category>{{category}}</div>
        <div price>{{price}}</div>
        <div seller>{{seller}}</div>
        <div><button events key="{{index}}" on-click="_onChooseValue">Add</button></div>
      </div>
      <div col1>
        <img src="{{image}}">
      </div>
    </div>
  </div>
</template>
  `;

  let template = `
${styles}
${productStyles}
<div chooser>
  <div chevron>▲</div>
  <div head>{{choices.description}}</div>
  <x-list items="{{items}}">${productTemplate}</x-list>
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
      if (result.length > 0) {
        this.relevance = 10;
      }
    }
    _shouldRender(props, state) {
      return Boolean(state.values && state.values.length);
    }
    _render(props, state) {
      return {
        items: state.values.map(({rawData}, index) => {
          return Object.assign({
            index
          }, rawData);
        })
      };
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