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

defineParticle(({UiParticle, resolver, html}) => {

  const host = `[show-product]`;

  const styles = html`
  <style>
    ${host} {
      padding: 16px 0;
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
      display: flex;
      flex-direction: column;
      justify-content: center;
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
      display :none;
    }
    ${host} [seller] {
      /* font-size: 0.8em; */
      color: #cccccc;
      font-size: 14px;
    }
    ${host} [thumb] {
      width: 64px;
      height: 64px;
      box-sizing: border-box;
      /* border: 1px solid rgba(0,0,0,.08); */
      background-position: center center;
      background-size: cover;
    }
  </style>
  `;

  const template = html`
<div item show-product>
${styles}
  <div row>
    <div col0>
      <div name title="{{name}}">{{name}}</div>
      <div row>
        <div price>{{price}}</div>
        <div seller>{{seller}}</div>
      </div>
    </div>
    <div col1>
      <div thumb xen:style="{{styleBackground}}">
    </div>
  </div>
  </div>
</div>
  `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props.product);
    }
    render({product}) {
      if (product) {
        const resolvedImage = resolver ? resolver(product.image) : product.image;
        return Object.assign(product, {
          styleBackground: `background-image:url(${resolvedImage})`
        });
      }
    }
  };
});
