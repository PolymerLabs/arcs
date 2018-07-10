// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, resolver, html}) => {

  let host = `[show-product]`;

  let styles = html`
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
    /* align-items: center; */
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
    box-sizing: border-box;
    text-align: center;
    background-size: contain;
  }
  ${host} img {
    max-width: 100%;
    max-height: 320px;
    margin: 0 auto;
  }
  ${host} [name] {
    margin-bottom: 4px;
    /* margin-top: 16px; */
  }
  ${host} [category] {
    font-size: 0.7em;
    color: #cccccc;
  }
  ${host} [price] {
    padding-right: 8px;
    color: #333333;
    font-size: 14px;
  }
  ${host} [price]:empty {
    display:none;
  }
  ${host} [seller] {
    /* font-size: 0.8em; */
    color: #cccccc;
    font-size: 14px;
  }
  ${host} [thumb] {
    width: 64px;
    height: 64px;
    background-position: center center;
    border: 1px solid rgba(0,0,0,.08);
    box-sizing: border-box;
    background-size: cover;
  }
</style>
  `;

  let template = html`
${styles}
  <div item show-product>
    <div row>
      <div col0>
        <div name title="{{name}}">{{name}}</div>
        <div row>
          <div price>{{price}}</div>
          <div seller>{{seller}}</div>
        </div>
      </div>
      <div col1 style="text-align:center;">
        <div thumb style="{{styleBackground}}" src="{{resolvedImage}}" >
      </div>
    </div>
    </div>
  </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return !!props.product;
    }
    render({product}) {
      if (product) {
        let item = Object.assign({}, product.rawData);
        item.resolvedImage = resolver ? resolver(product.image) : product.image;
        item.styleBackground = 'background-image:url('+item.resolvedImage+')';
        return item;
      }
    }
  };
});
