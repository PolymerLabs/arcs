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

defineParticle(({DomParticle}) => {

  const host = `[chooser]`;

  const productStyles = `
    <style>
      ${host} > x-list [row] {
        display: flex;
        align-items: center;
      }
      ${host} > x-list [col0] {
        flex: 1;
        overflow: hidden;
        line-height: 115%;
      }
      ${host} > x-list [col0] > * {
      }
      ${host} > x-list [col1] {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 148px;
        height: 128px;
        box-sizing: border-box;
        text-align: center;
        background-size: contain;
      }
      ${host} > x-list [col1] > img {
        max-width: 128px;
        max-height: 96px;
      }
      ${host} > x-list [name] {
        font-size: 0.95em;
      }
      ${host} > x-list [category] {
        font-size: 0.7em;
        color: #cccccc;
      }
      ${host} > x-list [price] {
        color: #333333;
      }
      ${host} > x-list [seller] {
        font-size: 0.8em;
        color: #cccccc;
      }
    </style>
      `;

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
  <!-- annotation slot will be provided, as soon as SlotComposer and MapRemoteSlots strategy support it. ->
  <!-- div slotid="annotation" subid$="{{subId}}" -->
  </div>
</template>
  `;

  let template = `
${styles}
${productStyles}
<div chooser>
  <div chevron>▲</div>
  <div head>{{choices.description}}</div>
  <x-list items="{{items}}">
    ${productTemplate}
  </x-list>
</div>
    `.trim();

  return class Chooser extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props) {
      let result = [...difference(props.choices, props.resultList)];
      if (result.length > 0) {
        this.relevance = 10;
      }
      this._setState({
        values: result
      });
    }
    _shouldRender(props, state) {
      return Boolean(state.values && state.values.length);
    }
    _render(props, state) {
      return {
        items: state.values.map(({rawData}, index) => {
          return Object.assign({
            subId: rawData.name.replace(/ /g,'').toLowerCase(),
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
