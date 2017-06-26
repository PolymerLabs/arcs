// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let styles = `
<style>
  [show-products] [head] {
    color: #888888;
    font-weight: bold;
    /*background-color: #00897B;*/
    display: flex;
    align-items: center;
    padding: 8px 16px;
  }
  [show-products] [interleaved] {
    /*margin: -8px 0 8px 64px;*/
    font-size: 0.7em;
    font-style: italic;
    color: blue;
  }
</style>
  `;

  let productStyles = `
<style>
  [show-products] [item] {
    padding: 4px 0;
    /*
    use LR margin to add space on either side of the border line,
    use LR padding to have the border fully justified
    */
    margin: 0 24px;
    border-bottom: 1px solid #eeeeee;
  }
  [show-products] [row] {
    display: flex;
    align-items: center;
  }
  [show-products] [col0] {
    flex: 1;
    overflow: hidden;
  }
  [show-products] [col0] > * {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 1px 0;
  }
  [show-products] [col1] {
    width: 164px;
    height: 128px;
    box-sizing: border-box;
    text-align: center;
    background: url(../assets/products/book.png) no-repeat center;
    background-size: contain;
  }
  [show-products] [category] {
    font-size: 0.7em;
    color: #cccccc;
  }
  [show-products] [price] {
    color: #333333;
  }
  [show-products] [seller] {
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
        <div slotid$="{{itemSlotId}}"></div>
      </div>
      <div col1></div>
    </div>
  </div>
</template>
  `;

  let template = `
${styles}
${productStyles}
<div show-products>
  <div>
    <div slotid="preamble"></div>
    <div head>
      <span>Your shortlist</span>
    </div>
    <x-list items="{{items}}">${productTemplate}</x-list>
    <interleaved-list>
      <div slotid="annotation"></div>
    </interleaved-list>
  </div>
  <div slotid="action"></div>
</div>

    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props) {
      this._setState({
        // TODO(sjmiles): arcana: translates object-with-name-getter to POJO-with-name-property
        items: props.list.map(({name}, i) => {
          return {
            name,
            price: '$14.99',
            seller: 'de-nile.com',
            category: 'product',
            itemSlotId: `action-${i}`
          };
        })
      });
    }
    _render(props, state) {
      if (state.items && state.items.length) {
        return {
          items: state.items
        };
      }
    }
  };

});
