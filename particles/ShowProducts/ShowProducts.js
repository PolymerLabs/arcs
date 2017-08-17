// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

var host = `[show-products]`;
var productStyles = '';

importScripts('../../../particles/shared/product-templates.js');

defineParticle(({DomParticle}) => {

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
    padding: 4px 8px;
    background-color: white;
    border-bottom: 1px solid #eeeeee;
  }
  ${host} > x-list [item]:last-child {
    border: none;
  }
  ${host} [interleaved] {
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

  let productTemplate = `
<template>
  <div item>
    <div row>
      <div col0>
        <div name title="{{name}}">{{name}}</div>
        <div category>{{category}}</div>
        <div price>{{price}}</div>
        <div seller>{{seller}}</div>
        <div slotid$="{{itemSlotId}}"></div>
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
<div show-products>
  <div head>
    <span>Your shortlist</span>
  </div>

  <div slotid="preamble"></div>

  <div empty hidden="{{itemsNotEmpty}}">List is empty</div>

  <x-list items="{{items}}">${productTemplate}</x-list>
  <interleaved-list>
    <div slotid="annotation"></div>
  </interleaved-list>
  <interleaved-list>
    <div slotid="annotation2"></div>
  </interleaved-list>
  <interleaved-list>
    <div slotid="annotation3"></div>
  </interleaved-list>

  <div slotid="action"></div>

  <div slotid="postamble"></div>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props) {
      let items = props.list.map(({rawData}, i) => {
        return Object.assign({
          itemSlotId: `item-${i}`
        }, rawData);
      });
      let itemsNotEmpty = items.length > 0;
      this._setState({
        // TODO(sjmiles): rawData provides POJO access, but shortcuts schema-enforcing getters
        items,
        itemsNotEmpty
      });
    }
    _render(props, state) {
      return {
        items: state.items,
        itemsNotEmpty: state.itemsNotEmpty
      };
    }
  };

});
