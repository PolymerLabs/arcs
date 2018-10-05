
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
        const artistName = props.artist.name.toLowerCase();
        const artistsPlaylists = this.handles.get('artistsPlaylists');
        const cursor = await props.allPlaylists.stream({pageSize: 40});
        const promises = [];
        for (;;) {
          let {value, done} = await cursor.next();
          for (const playlist of value || []) {
            const artists = playlist.artists ? playlist.artists.split('|') : [];
            if (artists.some(artist => artist.toLowerCase() === artistName)) {
              promises.push(artistsPlaylists.store(playlist));
              if (promises.length == 5) {
                cursor.close();
                done = true;
                break;
              }
            }
          }
          if (done) break;
        }
        await Promise.all(promises);
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
