// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle, resolver}) => {

  let host = `[show-products]`;

  let styles = `
<style>
  ${host} {
    padding: 16px;
    background-color: white;
  }
  ${host} > [head] {
    display: flex;
    align-items: center;
    padding: 8px 0;
    color: #aaaaaa;
    font-weight: bold;
  }
  ${host} > x-list [item] {
    /*padding: 4px 8px;*/
    background-color: white;
    border-bottom: 1px solid #eeeeee;
  }
  ${host} > x-list [item]:last-child {
    border: none;
  }
  ${host} div[slotid="annotation"] {
    font-size: 0.7em;
  }
  ${host} [empty] {
    color: #aaaaaa;
    font-size: 14px;
    font-style: italic;
    padding: 10px 0;
  }
</style>
  `;

  var productStyles = `
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

  let productTemplate = `
<template>
  <div item>
    <div slotid="prenotation" subid="{{subId}}"></div>
    <div row>
      <div col0>
        <div name title="{{name}}">{{name}}</div>
        <div category>{{category}}</div>
        <div price>{{price}}</div>
        <div seller>{{seller}}</div>
      </div>
      <div col1>
        <img src="{{image}}">
      </div>
    </div>
    <div slotid="annotation" subid="{{subId}}"></div>
  </div>
</template>
  `;

  let template = `
${styles}
${productStyles}
<div show-products>
  <div head>
    <span>Your shortlist</span>
  </div>
  <div slotid="preamble"></div>
  <div empty hidden="{{haveItems}}">List is empty</div>
  <x-list items="{{items}}">${productTemplate}</x-list>
  <div slotid="action"></div>
  <div slotid="postamble"></div>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props) {
      let items = props.list.map(({id, rawData}) => {
        // TODO(sjmiles): rawData provides POJO access, but shortcuts schema-enforcing getters
        let item = Object.assign({}, rawData);
        item.image = resolver ? resolver(item.image) : item.image;
        item.subId = id;
        return item;
      });
      this._setState({
        renderModel: {
          items,
          haveItems: items.length > 0
        }
      });
    }
    _render(props, state) {
      return state.renderModel;
    }
  };

});
