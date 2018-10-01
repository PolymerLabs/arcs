
// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html}) => {
  const host = `[playlists-host]`;
  const styles = html`
  <style>
    ${host} {
      border-top: 1px solid #ddd;
      padding: 16px 24px 8px;
      overflow: auto;
    }
    ${host} [list] {
      margin: 0 -8px;
    }
  </style>
  `;

  const template = html`
<div playlists-host>
${styles}
  <div>Playlists with <span>{{artist}}</span></div>
  <div list slotid="playlistsListing"></div>
</div>
  `;
  return class extends DomParticle {
    get template() {
      return template;
    }
    async willReceiveProps(props, state, lastProps) {
      if (props.artist && props.allPlaylists && props.artistsPlaylists.length === 0) {
        const artistsPlaylists = this.handles.get('artistsPlaylists');
        for (const playlist of props.allPlaylists) {
          if (playlist.artists.some(artist => artist.toLowerCase() === props.artist.name.toLowerCase())) {
            await artistsPlaylists.store(playlist);
          }
        }
      }
    }
    shouldRender(props) {
      return Boolean(props.artist);
    }
    render({artist}) {
      return {
        artist: artist.name
      };
    }
  };
});
