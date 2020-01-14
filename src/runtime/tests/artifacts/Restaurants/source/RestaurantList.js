/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle, html}) => {

  const item = html`

<div item xen:style="{{image}}" style="position: relative;">
  <div scrim></div>
  <div style="flex: 1"></div>

  <div style="flex: 1; display: flex; position: relative; align-items: flex-end;">
    <div style="flex: 1;padding-right: 60px;">
      <div address>{{address}}</div>
      <div id="webtest-title" title>{{name}}</div>
    </div>
    <div style="width: 56px; align-items: flex-end; display: flex; flex-direction: column; padding-bottom: 4px;">
      <div rating>{{rating}}</div>
      <div stars-container>
        <div stars xen:style="{{starStyle}}"></div>
      </div>
    </div>
  </div>
</div>
<div slotid="annotation" subid$="{{id}}" style="padding:4px 0;">

`;

  const selectable = html`
<div selectable-item on-click="_onSelect" key="{{index}}" trigger$="{{name}}">
  ${item}
</div>
  `;

  const host = `master`;

  const template = html`

<div ${host}>
  <style>
    [${host}] {
      overflow: auto;
    }
    [${host}] [selectable-item] {
      cursor: pointer;
      box-sizing: border-box;
      vertical-align: top;
    }

    @media (min-width: 960px) {
      [${host}] [selectable-item]{
        width: 50%;
        display: inline-block;
        padding-left: 4px;
        padding-right: 4px;
      }
      [${host}] {
        padding: 8px 4px;
      }
    }
    @media (min-width: 1280px) {
      [${host}] [selectable-item]{
        width: 33.33%;
        display: inline-block;
      }
    }
    [${host}] [selectable-item]:last-child {
      border-bottom: none;
    }
    [${host}] [item] {
      font-family: 'Google Sans', sans-serif;
      display: flex;
      flex-direction: column;
      color: white;
      background-repeat: no-repeat;
      background-size: cover;
      background-position: bottom;
      width: 100%;
      height: 288px;
      padding: 12px 16px;
      box-sizing: border-box;
    }
    [${host}] [scrim] {
      position: absolute;
      top: 60%;
      right: 0;
      bottom: 0;
      left: 0;
      background: rgba(0, 0, 0, 0) linear-gradient(to bottom, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0.4) 100%) repeat 0 0;
    }
    [${host}] [address] {
      font-size: 14px;
      font-weight: medium;
      opacity: 0.9;
      padding-bottom: 4px;
      line-height: 18px;
      letter-spacing: .25px;
    }
    [${host}] [title] {
      font-size: 24px;
      line-height: 30px;
    }
    [${host}] [rating] {
      font-size: 36px;
      line-height: 36px;
      letter-spacing: 1.3px;
      text-align: center;
      margin-bottom: 2px;
      width: 100%;
    }
    [${host}] [stars-container] {
      display: inline-block;
      width: 56px;
      height: 12px;
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAYCAYAAAAiR3l8AAAAAXNSR0IArs4c6QAAAchJREFUaAXtmE9LAzEUxHdV9FIQBLWC4MGLoCe//2fw1IIXD4IHsXgQPLauM7xsievua7JGQZ1AzL+Xefobk4ZWlYoIiIAIiMBPEGiaZpe1dC7pGtExHLYyzThGPGvpIl0jms0h18AT5GEtXaRrRLM57KQ6gePN2EPGs1/X9TJ1rxcnXaMzlkPOCeTxZjxryWtUuubhKA45BsZXZ9y39ON/xlpxf7yi7Yy14v6f0q27fw2O8inmpt15jI9Qt8P8Cu1T6MfNI67Wh3ii7UvXSJTm8MlApkGSMzSXqK1hnPYKDZ3DvHsvSLpGpySHXgOZBkkmaK5R9zl2ygvWbmDeqxOzXpKuoSjFYdBApkESfkZeoJ5z3FPuMHcL89561ganpGtoSnBwHzHBmMWgE1W1yDWPWtI1oiU4uAYG47wXnLcWtg823l5vbVDwP/6+roE44rxi2xcpr8l5qO2VOQ0xgV1aI13jVILDpm9iDpBqD5UPFD5U+GDhZ+MzGj5w+NBhDMc5RbpG68scNj1irpCHJs9g3oevzmAi57m+xNoMbXLBXumC1ndxWBuBBPwPcUtKTFcgZU9KjHS7BDQWAREQAREQAREQgV9C4B0HvYA7BFwt2gAAAABJRU5ErkJggg==);

      background-size: cover;
    }
    [${host}] [stars] {
      height: 100%;
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHAAAAAYCAYAAAAiR3l8AAAAAXNSR0IArs4c6QAAAcJJREFUaAXtl0FKA0EQRWcCQVCy8RLZupdcQEEEXXmALL2IGz2AW9ciCF7CtUfwBIrgYvx/uqdTMzGTTtMtCL/h09XVVX/gVZgkVaUlAiIgAiLwFwSapjmkcj9Lvo5oCofJjsM4Qz2Ve8nXES3FwbnjE/JE5Z6efMvybd0BeQZ9ec1yDVG+YXhJfHd5hZ7gUXtejHMt+TqSSRx2GeCFmZiNTToptF42TjIzTdbLxqYkKbReNk4yM03Wy8amZD2shym80q6QOx/mcT6F9n3+E/uzj+32WNf1g010sXwdiVIcOs7tjocsoQ8odrF22TP55cAaSL6FOPSQA/QceoW2LdbMe80jB9ZC8i3EoYceoKfQDbRp8W7aa4o4sAeSbwYOoz9i8H32jXm8jMzkxdeMlKxfydcxycFhdIAe/eX6CEIm+tdS6FgF8nUsSnGoKrzmJtA7xMU/8ddejLl4F/MhWI0NEXt8Lzb5EgJWNr4BNkwXrXXTvGE/6i4YQ8xxLbp87M6etlO+RTiEOQDyHXQPHYSkD5jzd7fDu21n9MkXkEpxCPzxgONw2BDE1AxbY3piauQ7JKCzCIiACIiACIiACPwTAj/CZkNVjdR/ZAAAAABJRU5ErkJggg==);
      background-size: cover;
      background-repeat: repeat no-repeat;
    }
  </style>

  <div slotid="modifier"></div>
  <x-list items="{{items}}"><template>${selectable}</template></x-list>

</div>
    `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    willReceiveProps(props) {
      const items = props.list.map(({rawData}, i) => {
        return Object.assign({
          index: i,
          starStyle: `width: ${Math.round(rawData.rating / 5 * 100)}%`,
          image: {backgroundImage: `url("${rawData.photo}")`}
        }, rawData);
      });
      this._setState({items});
    }
    render(props, state) {
      return {
        items: state.items,
        count: state.items ? state.items.length : 0
      };
    }
    _onSelect(e, state) {
      this.handles.get('selected').set(this._props.list[e.data.key]);
    }
  };

});
