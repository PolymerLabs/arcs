// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html}) => {

  const host = `[show-artist]`;

  const styles = html`
  <style>
    ${host} {
      border-radius: 16px;
      border: 1px solid #ddd;
      overflow: hidden;
      margin: 8px;
    }
    ${host} [name] {
      min-height: 35vh;
      background: cadetblue;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 24px;
      font-size: 24px;
      color: white;
      position: relative;
      z-index: 0;
      margin: 4px 0 8px;
    }
  </style>
  `;

  const template = html`
<div show-artist-simple>
${styles}
  <div name>{{name}}</div>
</div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props.artist);
    }
    render(props, state) {
      return {
        name: props.artist.name,
      };
    }
  };
});
