// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, resolver}) => {

  let host = `[show-product]`;

  let styles = `
<style>
  ${host} [item] {
    padding: 4px 8px;
    background-color: white;
    border-bottom: 1px solid #eeeeee;
  }
  ${host} div[slotid="annotation"] {
    font-size: 0.7em;
  }
  ${host} [row] {
    display: flex;
    align-items: center;
  }
  ${host} [col0] {
    flex: 1;
    overflow: hidden;
    line-height: 115%;
  }
  ${host} [col0] > * {
  }
  ${host} [col1] {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 148px;
    height: 128px;
    box-sizing: border-box;
    text-align: center;
    background-size: contain;
  }
  ${host} [col1] > img {
    max-width: 128px;
    max-height: 96px;
  }
  ${host} [name] {
    font-size: 0.95em;
  }
  ${host} [category] {
    font-size: 0.7em;
    color: #cccccc;
  }
  ${host} [price] {
    color: #333333;
  }
  ${host} [seller] {
    font-size: 0.8em;
    color: #cccccc;
  }
</style>
  `;

  let template = `
${styles}
  <div item show-product>
    <div row>
      <div col0>
        <div name title="{{name}}">{{name}}</div>
        <div category>{{category}}</div>
        <div price>{{price}}</div>
        <div seller>{{seller}}</div>
      </div>
      <div col1>
        <img src="{{resolvedImage}}">
      </div>
    </div>
    <div slotid="annotation" subid="{{subId}}">
    </div>
  </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    _shouldRender(props) {
      return !!props.product;
    }
    _render(props) {
      let {product} = props;
      if (product) {
        let item = Object.assign({}, product.rawData);
        item.resolvedImage = resolver ? resolver(product.image) : product.image;
        return item;
      }
    }
  };
});
