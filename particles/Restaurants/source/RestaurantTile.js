/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({DomParticle, html}) => {

  const template = html`

  <style>
    :host {
      --tile-size: var(--tile-width, calc(100vw - 42px));
    }
    @media (min-width: 720px) {
      :host {
        --tile-size: var(--tile-width, calc(50vw - 42px));
      }
    }
    @media (min-width: 1100px) {
      :host {
        --tile-size: var(--tile-width, calc(33vw - 42px));
      }
    }
  </style>

  <style>
    [item] {
      display: flex;
      flex-direction: column;
      position: relative;
      width: var(--tile-size, 300px);
      height: 288px;
      overflow: hidden;
      padding: 12px;
      box-sizing: border-box;
      color: white;
      font-family: 'Google Sans', sans-serif;
    }
    model-img {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background-repeat: no-repeat;
      background-size: cover;
      background-position: bottom;
    }
    [fade] {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background: rgba(0, 0, 0, 0) linear-gradient(to bottom, rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 1)) repeat 0 0;
    }
    [flexed] {
      flex: 1;
      flex-grow: 0;
      flex-shrink: 0;
    }
    [columns] {
      flex: 1;
      display: flex;
      align-items: flex-end;
      position: relative;
    }
    [col0] {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      padding-right: 16px;
    }
    [col1] {
      overflow-x: hidden;
      text-align: right;
    }
    [address] {
      font-size: 14px;
      font-weight: medium;
      opacity: 0.9;
      padding-bottom: 4px;
      line-height: 18px;
      letter-spacing: 0.25px;
    }
    [title] {
      font-size: 24px;
      line-height: 30px;
    }
    [rating] {
      font-size: 32px;
      line-height: 36px;
      letter-spacing: 1.3px;
      margin-bottom: 2px;
      width: 100%;
    }
    [stars-container] {
      display: inline-block;
      width: 56px;
      height: 12px;
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAYCAYAAAAiR3l8AAAAAXNSR0IArs4c6QAAAchJREFUaAXtmE9LAzEUxHdV9FIQBLWC4MGLoCe//2fw1IIXD4IHsXgQPLauM7xsievua7JGQZ1AzL+Xefobk4ZWlYoIiIAIiMBPEGiaZpe1dC7pGtExHLYyzThGPGvpIl0jms0h18AT5GEtXaRrRLM57KQ6gePN2EPGs1/X9TJ1rxcnXaMzlkPOCeTxZjxryWtUuubhKA45BsZXZ9y39ON/xlpxf7yi7Yy14v6f0q27fw2O8inmpt15jI9Qt8P8Cu1T6MfNI67Wh3ii7UvXSJTm8MlApkGSMzSXqK1hnPYKDZ3DvHsvSLpGpySHXgOZBkkmaK5R9zl2ygvWbmDeqxOzXpKuoSjFYdBApkESfkZeoJ5z3FPuMHcL89561ganpGtoSnBwHzHBmMWgE1W1yDWPWtI1oiU4uAYG47wXnLcWtg823l5vbVDwP/6+roE44rxi2xcpr8l5qO2VOQ0xgV1aI13jVILDpm9iDpBqD5UPFD5U+GDhZ+MzGj5w+NBhDMc5RbpG68scNj1irpCHJs9g3oevzmAi57m+xNoMbXLBXumC1ndxWBuBBPwPcUtKTFcgZU9KjHS7BDQWAREQAREQAREQgV9C4B0HvYA7BFwt2gAAAABJRU5ErkJggg==);
      background-size: cover;
    }
    [stars] {
      height: 100%;
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAYCAYAAAAiR3l8AAAAAXNSR0IArs4c6QAAAcJJREFUaAXtl0FKA0EQRWcCQVCy8RLZupdcQEEEXXmALL2IGz2AW9ciCF7CtUfwBIrgYvx/uqdTMzGTTtMtCL/h09XVVX/gVZgkVaUlAiIgAiLwFwSapjmkcj9Lvo5oCofJjsM4Qz2Ve8nXES3FwbnjE/JE5Z6efMvybd0BeQZ9ec1yDVG+YXhJfHd5hZ7gUXtejHMt+TqSSRx2GeCFmZiNTToptF42TjIzTdbLxqYkKbReNk4yM03Wy8amZD2shym80q6QOx/mcT6F9n3+E/uzj+32WNf1g010sXwdiVIcOs7tjocsoQ8odrF22TP55cAaSL6FOPSQA/QceoW2LdbMe80jB9ZC8i3EoYceoKfQDbRp8W7aa4o4sAeSbwYOoz9i8H32jXm8jMzkxdeMlKxfydcxycFhdIAe/eX6CEIm+tdS6FgF8nUsSnGoKrzmJtA7xMU/8ddejLl4F/MhWI0NEXt8Lzb5EgJWNr4BNkwXrXXTvGE/6i4YQ8xxLbp87M6etlO+RTiEOQDyHXQPHYSkD5jzd7fDu21n9MkXkEpxCPzxgONw2BDE1AxbY3piauQ7JKCzCIiACIiACIiACPwTAj/CZkNVjdR/ZAAAAABJRU5ErkJggg==);
      background-size: cover;
      background-repeat: repeat no-repeat;
    }
  </style>

  <div item>
    <model-img url="{{imgUrl}}"></model-img>
    <div fade></div>
    <div columns>
      <div col0>
        <div address>{{address}}</div>
        <div id="webtest-title" title>{{name}}</div>
      </div>
      <div col1>
        <div rating>{{rating}}</div>
        <div stars-container>
          <div stars xen:style="{{starStyle}}"></div>
        </div>
      </div>
    </div>
  </div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({restaurant}) {
      return Boolean(restaurant);
    }
    render({restaurant}) {
      return Object.assign({
        imgUrl: restaurant.photo,
        starStyle: !restaurant.rating ? `visibility: hidden` : `width: ${Math.round(restaurant.rating / 5 * 100)}%`
      }, restaurant.rawData);
    }
  };

});
