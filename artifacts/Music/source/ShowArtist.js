// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, resolver, html}) => {

  const host = `[show-artist]`;

  const styles = html`
  <style>
    ${host} {
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    ${host} [header] {
      min-height: 160px;
      background:
        linear-gradient(to top, rgba(0,0,0,0.5) 0%,rgba(0,0,0,0) 50%,rgba(0,0,0,0) 100%),
        linear-gradient(135deg, #f3c5bd 0%,#e86c57 16%,#ea2803 38%,#ff6600 75%,#c72200 100%);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 16px;
      font-size: 24px;
      color: white;
    }
    ${host} [now-playing] {
      padding: 16px 16px 12px;
    }
    ${host} [now-playing] [list] {
      margin: 0 -8px;
    }
  </style>
  `;

  const template = html`
<div show-artist>
${styles}
  <div header>{{name}}</div>
  <div now-playing>
    From <b>Now playing</b>
    <div list slotid="nowPlayingList"></div>
  </div>
</div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props.artist);
    }
    render({artist}) {
      if (!artist) return;
      return {
        name: artist.name
      };
    }
  };
});
