// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html}) => {

  const template = html`

<style>
  :host {
    border-radius: 16px;
    border: 1px solid #ddd;
    overflow: hidden;
    margin: 8px;
  }
  [header] {
    position: relative;
    min-height: 35vh;
    padding: 24px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    background: cadetblue;
    color: white;
    font-size: 24px;
    z-index: 0;
  }
  [cover] {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
  }
  [photo] {
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center center;
  }
  [scrim] {
    background: rgba(0, 0, 0, 0) linear-gradient(to bottom, rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 1)) repeat 0 0;
  }
  [name] {
    margin: 4px 0 8px;
  }
  [description] {
    font-size: 16px;
  }
  [now-playing] {
    border-top: 1px solid #ddd;
    padding: 24px 24px 16px;
  }
  [now-playing] [list] {
    margin: 0 -8px;
  }
</style>

<div header>
  <model-img cover photo src="{{imgUrl}}">
    <img>
  </model-img>
  <!-- <model-img cover photo url="{{imgUrl}}"></model-img> -->
  <div cover scrim></div>
  <div description>{{description}}</div>
  <div name>{{name}}</div>
  <div description>{{detailedDescription}}</div>
</div>

<!-- <div slotid="nearbyShows"></div>
<div now-playing>
  From <b>Now playing</b>
  <div list slotid="nowPlayingList"></div>
</div>
<div slotid="extrasForArtist"></div> -->

  `;
  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({artist}) {
      return Boolean(artist);
    }
    // update({artist, artistPlayHistory}) {
    //   if (artistPlayHistory.length && artist) {
    //     let mostRecent = artistPlayHistory[0];
    //     for (const song of artistPlayHistory) {
    //       if (Number(song.dateTime) > Number(mostRecent.dateTime)) mostRecent = song;
    //     }
    //     this.setParticleDescription({
    //         template: `You listened to <b>${mostRecent.song}</b> by <b>${artist.name}</b> ${this.formatTime(Number(mostRecent.dateTime))}`,
    //         model: {}
    //     });
    //   }
    // }
    // formatTime(dateTime) {
    //   const delta = Date.now() - dateTime;
    //   if (delta < 60 * 60 * 1000) {
    //     let minutes =  Math.round(delta / (60 * 1000));
    //     if (minutes === 0) minutes = 1;
    //     return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    //   } else if (delta < 24 * 60 * 60 * 1000) {
    //     const hours =  Math.round(delta / (60 * 60 * 1000));
    //     return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    //   } else {
    //     return `on ${new Date(Number(dateTime)).toLocaleDateString()}`;
    //   }
    // }
    render({artist}) {
      return {
        name: artist.name,
        description: artist.description,
        detailedDescription: artist.detailedDescription || '',
        imgUrl: artist.imageUrl || ''
      };
    }
  };
});
