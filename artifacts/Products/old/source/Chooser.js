/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, resolver}) => {

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
        width: 64px;
        height: 64px;
        box-sizing: border-box;
        text-align: center;
        background-size: contain;
        outline: 1px solid rgba(0,0,0,.08);
        outline-offset: -1px;
      }
      ${host} > x-list [col1] > img {
        max-width: 64px;
        max-height: 64px;

      }
      ${host} > x-list [name] {

      }
      ${host} > x-list [category] {
        color: #cccccc;
      }
      ${host} > x-list [price] {
        color: #333333;
        font-size: 14px;
      }
      ${host} > x-list [seller] {
        font-size: 14px;
        margin-left: 8px;
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
    transform: translate3d(50%, -18px, 0);
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
    padding: 16px;
    background-color: white;
    border-bottom: 16px solid #eeeeee;
  }
</style>
  `;

  let productTemplate = `
<template>
  <div item>
    <div row>
      <div col0>
        <div name title="{{name}}">{{name}}</div>

        <div> <span price>{{price}}</span><span seller>{{seller}}</span></div>

        <div><button events key="{{index}}" on-click="_onChooseValue">Add</button></div>
      </div>
      <div col1>
        <img src="{{image}}">
      </div>
    </div>
    <div slotid="annotation" subid="{{subId}}">
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
    willReceiveProps(props) {
      let result = [...difference(props.choices, props.resultList)];
      if (result.length > 0) {
        this.relevance = 10;
      }
      this._setState({
        values: result
      });
    }
    shouldRender(props, state) {
      return Boolean(state.values && state.values.length);
    }
    render(props, state) {
      return {
        items: state.values.map(({rawData, id}, index) => {
          return Object.assign(Object.assign({}, rawData), {
            subId: id,
            image: resolver ? resolver(rawData.image) : rawData.image,
            index
          });
        })
      };
    }
    _onChooseValue(e, state) {
      this.handles.get('resultList').store(state.values[e.data.key]);
    }
  };

  function difference(a, b) {
    let result = new Map();
    a.forEach(value => result.set(JSON.stringify(value.name), value));
    b.map(a => JSON.stringify(a.name)).forEach(value => result.delete(value));
    return result.values();
  }
});
