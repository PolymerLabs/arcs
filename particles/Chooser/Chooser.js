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

  let styles = `
<style>
  [chooser] {
    background-color: #e8e8e8;
    padding: 8px;
  }
  /*[chooser] [content] {
    background-color: white;
  }*/
  [chooser] [head] {
    color: #666666;
    font-weight: bold;
    /*background-color: #00897B;*/
    display: flex;
    align-items: center;
    padding: 8px 16px;
  }
  [chooser] button {
    padding: 4px 12px;
    border: 1px solid silver;
    font-size: 0.75em;
    margin-top: 6px;
  }
</style>
  `;

  let productStyles = `
<style>
  [chooser] [item] {
    padding: 4px 24px;
    border-bottom: 1px solid #fbfbfb;
    background: white;
  }
  [chooser] [row] {
    display: flex;
    align-items: center;
  }
  [chooser] [col0] {
    flex: 1;
    overflow: hidden;
  }
  [chooser] [col0] > * {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 1px 0;
  }
  [chooser] [col1] {
    width: 164px;
    padding-left: 24px;
    box-sizing: border-box;
    text-align: center;
  }
  [chooser] [category] {
    font-size: 0.7em;
    color: #cccccc;
  }
  [chooser] [price] {
    color: #333333;
  }
  [chooser] [seller] {
    font-size: 0.8em;
    color: #cccccc;
  }
</style>
  `;

  let productTemplate = `
<template>
  <div item>
    <div row>
      <div col0>
        <div title="{{name}}">{{name}}</div>
        <div category>{{category}}</div>
        <div price>{{price}}</div>
        <div seller>{{seller}}</div>
        <div><button events key="{{index}}" on-click="_onChooseValue">Add</button></div>
      </div>
      <div col1>
        <img src="../assets/products/book.png">
      </div>
    </div>
  </div>
</template>
  `;

  let template = `
${styles}
${productStyles}
<div chooser>
  <div content>
    <div head>
      <span>Recommendations based on <span>{{person}}</span>'s Wishlist</span>
    </div>
    <x-list items="{{items}}">${productTemplate}</x-list>
  </div>
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
    _render(props, state) {
      if (state.values && state.values.length) {
        return {
          person: 'Claire',
          items: state.values.map((value, index) => {
            return {
              name: value.name,
              price: '$14.99',
              seller: 'de-nile.com',
              category: 'product',
              index
            }
          })
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