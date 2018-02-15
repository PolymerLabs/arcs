// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {

  const item = html`

<div item style%="{{image}}" style="position: relative;">
  <div scrim></div>
  <div style="flex: 1"></div>
  <div address>{{address}}</div>
  <div style="display: flex; position: relative;">
    <div title style="flex: 1;">{{name}}</div>
    <div style="width: 120px; text-align: right;">
      <div rating>{{rating}}</div>
      <div stars-container>
        <div stars style="{{starStyle}}"></div>
      </div>
    </div>
  </div>
</div>

`;

  const selectable = html`
<div selectable-item on-click="_onSelect" key="{{index}}">
  ${item}
</div>
  `;

  const host = `master`;

  const template = html`
<style>
  [${host}] {
    overflow: auto;
  }
  [${host}] [header] {
    padding: 10px 6px;
    border-bottom: 1px solid #bbb;
  }
  [${host}] [selectable-item] {
    border-bottom: 1px dotted silver;
    cursor: pointer;
    box-sizing: border-box;
  }
  [${host}] [selectable-item]:last-child {
    border-bottom: none;
  }
  [${host}] [item] {
    display: flex;
    flex-direction: column;
    color: white;
    text-shadow: 0px 0px 10px rgba(0, 0, 0, 1);
    background-repeat: no-repeat;
    background-size: cover;
    background-position: bottom;
    /* this autosizes to width with correct AR, but it doesn't support flexing :( */
    /*
    padding-bottom: 60%;
    */
    width: 100%;
    height: 336px;
    padding: 24px;
    box-sizing: border-box;
  }
  [${host}] [scrim] {
    position: absolute;
    top:0;
    right: 0;
    bottom: 0;
    left: 0;
    background: rgba(0, 0, 0, 0) linear-gradient(to bottom, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0.6) 100%) repeat 0 0;
  }
  [${host}] [address] {
    font-size: 18px;
    opacity: 0.9;
    padding: 24px 0;
  }
  [${host}] [title] {
    font-size: 36px;
  }
  [${host}] [rating] {
    font-size: 54px;
  }
  [${host}] [stars-container] {
    display: inline-block;
    width: 100px;
    height: 20px;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAQAAADYBBcfAAAA70lEQVR4AdXUIQjCQBTGcYNgMAt2BGGdZbHY28BeLKvaBIPJYLHYMf/tbX2w9V62OgZj2wljjKHP3W5FvK/cHe8Hd+/gRmpgfgalwVHa1UKWlCyHwAuKizFkQowiZmIKt6gqW1Po1dAzglioJlYnZIbFGgeXM3fCFgy5c8bFYY3F7B2eUL1y+jgqrp7hinfEIetAGc7X5rAhkRkJm86uYhMJLMLWPgc7Ae56vCM3Ad76QF+AvhYyJW/Ky2aWM9XBVV1acGXOlaJer3TwUJUF2E2Xg2rnoINPUvaMW3cesyflqYMPFsJvsOAhQ/P8E3wB75uY7oxINXcAAAAASUVORK5CYII=);
    background-size: contain;
  }
  [${host}] [stars] {
    height: 100%;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAQAAADYBBcfAAAA60lEQVR4AdXTIQjCQBTGcYNgMAt2BGGdZbHY28BeLAv/ok0wmAwWix37elsfbL2XrY7B2HbCGGPobW9bUr5yd7wf3L3HTdTI/BTkPAqypmA9Bt5Q3AZDZkQoImZD4R5VZj8UuhV0B0EMVB2jE7LAYIuFzZUnQQMGPLliY7HFYPEJL6heuXxdFVtm2No3YpF2oBSrtTnsiFtYzK6zq5iEGhZiiuPgoIGHHnPkoYGPPtDTQE+EzMnq8qJeZcwluKlKc+4suZNX+40ET2WZj1l32S9PThJ0SDgybZxMOZLgSPDFSvNbVrwEKOcP4Rt15kTMQuVR7QAAAABJRU5ErkJggg==);
    background-size: cover;
    background-repeat: repeat no-repeat;
  }
</style>

<div ${host}>
  <div slotid="modifier"></div>
  <div header>Found <span>{{count}}</span> item(s).</div>
  <x-list items="{{items}}"><template>${selectable}</template></x-list>
</div>
    `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    _willReceiveProps(props) {
      let items = props.list.map(({rawData}, i) => {
        return Object.assign({
          index: i,
          starStyle: `width: ${Math.round(100 - rawData.rating / 5 * 100)}%`,
          image: {backgroundImage: `url("${rawData.photo}")`}
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
