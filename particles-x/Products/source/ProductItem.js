/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({UiParticle, resolver, html}) => {

  const template = html`
<div item show-product>
  <style>
    [show-product] {
      padding: 16px 0;
    }
    div[slotid="annotation"] {
      font-size: 0.7em;
    }
    [row] {
      display: flex;
      /* align-items: center; */
    }
    [col0] {
      flex: 1;
      overflow: hidden;
      line-height: 115%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    [col1] {
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      text-align: center;
      background-size: contain;
    }
    img {
      max-width: 100%;
      max-height: 320px;
      margin: 0 auto;
    }
    [name] {
      margin-bottom: 4px;
      /* margin-top: 16px; */
    }
    [category] {
      font-size: 0.7em;
      color: #cccccc;
    }
    [price] {
      padding-right: 8px;
      color: #333333;
      font-size: 14px;
    }
    [price]:empty {
      display :none;
    }
    [seller] {
      /* font-size: 0.8em; */
      color: #cccccc;
      font-size: 14px;
    }
    [thumb] {
      width: 64px;
      height: 64px;
      box-sizing: border-box;
      /* border: 1px solid rgba(0,0,0,.08); */
      background-position: center center;
      background-size: cover;
    }
  </style>
  <div row>
    <div col0>
      <div name title="{{name}}">{{name}}</div>
      <div row>
        <div price>{{price}}</div>
        <div seller>{{seller}}</div>
      </div>
    </div>
    <div col1>
      <!-- TODO(sjmiles): why is there a 'src' attribute here? -->
      <div thumb xen:style="{{styleBackground}}" src="{{resolvedImage}}" >
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
        return Object.assign({
            resolvedImage,
            styleBackground: `background-image:url(${resolvedImage})`,
            // TODO(sjmiles): subid required by renderer, not used in template (iirc, verify!)
            subid: this.idFor(product)
          },
          product
        );
      }
    }
  };

});
