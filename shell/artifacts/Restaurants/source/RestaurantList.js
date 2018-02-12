// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let item = `
<div class="item">
  <div class="info">
    <div class="title"><img class="icon" src="{{icon}}"><span>{{name}}</span></div>
    <div class="address">{{address}}</div>
    <div class="rating-outer">
      <div class="rating" style="{{ratingStyle}}"></div>
    </div>
  </div>
  <div class="cover"><img class="photo" src="{{photo}}"></div>
</div>
<div slotid="annotation" subid="{{id}}">
  `.trim();

  let selectable = `
<div class="selectable-item" on-click="_onSelect" key="{{index}}">
  ${item}
</div>
  `.trim();

  let host = `master`;

  let template = `
<style>
  [${host}] {
    overflow: auto;
  }
  [${host}] .header {
    padding: 10px 6px;
    border-bottom: 1px solid #bbb;
  }
  [${host}] .selectable-item {
    padding: 6px;
    border-bottom: 1px dotted silver;
    cursor: pointer;
  }
  [${host}] .selectable-item:last-child {
    border-bottom: none;
  }
  [${host}] .item {
    display: flex;
  }
  [${host}] .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  [${host}] .title {
    display: flex;
    align-items: center;
  }
  [${host}] .icon {
    width: 16px;
    padding-right: 8px;
  }
  [${host}] .address {
    margin: 6px 0 0 24px;
    color: #666;
    font-size: 0.9em;
    font-weight: 300;
  }
  [${host}] .rating-outer {
    display: inline-block;
    width: 69px;
    height: 14px;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAQAAADYBBcfAAAA70lEQVR4AdXUIQjCQBTGcYNgMAt2BGGdZbHY28BeLKvaBIPJYLHYMf/tbX2w9V62OgZj2wljjKHP3W5FvK/cHe8Hd+/gRmpgfgalwVHa1UKWlCyHwAuKizFkQowiZmIKt6gqW1Po1dAzglioJlYnZIbFGgeXM3fCFgy5c8bFYY3F7B2eUL1y+jgqrp7hinfEIetAGc7X5rAhkRkJm86uYhMJLMLWPgc7Ae56vCM3Ad76QF+AvhYyJW/Ky2aWM9XBVV1acGXOlaJer3TwUJUF2E2Xg2rnoINPUvaMW3cesyflqYMPFsJvsOAhQ/P8E3wB75uY7oxINXcAAAAASUVORK5CYII=);
    background-size: contain;
    margin: 8px 0 0 24px;
  }
  [${host}] .rating {
    height: 100%;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAQAAADYBBcfAAAA60lEQVR4AdXTIQjCQBTGcYNgMAt2BGGdZbHY28BeLAv/ok0wmAwWix37elsfbL2XrY7B2HbCGGPobW9bUr5yd7wf3L3HTdTI/BTkPAqypmA9Bt5Q3AZDZkQoImZD4R5VZj8UuhV0B0EMVB2jE7LAYIuFzZUnQQMGPLliY7HFYPEJL6heuXxdFVtm2No3YpF2oBSrtTnsiFtYzK6zq5iEGhZiiuPgoIGHHnPkoYGPPtDTQE+EzMnq8qJeZcwluKlKc+4suZNX+40ET2WZj1l32S9PThJ0SDgybZxMOZLgSPDFSvNbVrwEKOcP4Rt15kTMQuVR7QAAAABJRU5ErkJggg==);
    background-size: contain;
  }
  [${host}] .cover {
    font-size: 0;
  }
  [${host}] .photo {
    width:80px;
    height: 80px;
    object-fit: cover;
  }
</style>
<div ${host}>
  <div slotid="modifier"></div>
  <div class="header">Found <span>{{count}}</span> item(s).</div>
  <x-list items="{{items}}"><template>${selectable}</template></x-list>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props) {
      let items = props.list.map(({rawData}, i) => {
        return Object.assign({
          index: i,
          ratingStyle: `width: ${rawData.rating / 5 * 100}%`
        }, rawData);
      });
      this._setState({items});
    }
    _render(props, state) {
      return {
        items: state.items,
        count: state.items ? state.items.length : 0
      };
    }
    _onSelect(e, state) {
      this._views.get('selected').set(this._props.list[e.data.key]);
    }
  };

});
