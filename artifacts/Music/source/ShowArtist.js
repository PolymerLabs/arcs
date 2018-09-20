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
      border-radius: 16px;
      border: 1px solid #ddd;
      overflow: hidden;
      margin: 8px;
    }
    ${host} [header] {
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
    }
    ${host} [header] [cover] {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: -1;
    }
    ${host} [header] [photo] {
      background-size: cover;
      background-repeat: no-repeat;
      background-position: center center;
    }
    ${host} [header] [scrim] {
      background: linear-gradient(to top, rgba(0,0,0,0.5) 0%,rgba(0,0,0,0) 100%);
    }
    ${host} [header] [name] {
      margin: 4px 0 8px;
    }
    ${host} [header] [description] {
      font-size: 16px;
    }
    ${host} [social] {
      display: flex;
      justify-content: space-between;
      padding: 24px;
    }
    ${host} [social] [like] {
      font-weight: bold;
    }
    ${host} [now-playing] {
      border-top: 1px solid #ddd;
      padding: 24px 24px 16px;
    }
    ${host} [now-playing] [list] {
      margin: 0 -8px;
    }
  </style>
  `;

  const template = html`
<div show-artist>
${styles}
  <div header>
    <div cover photo style={{photoStyle}}></div>
    <div cover scrim></div>
    <div description>{{description}}</div>
    <div name>{{name}}</div>
    <div description>{{detailedDescription}}</div>
  </div>
  <div social>
    <div>5 of your friends like this artist</div>
    <div like>LIKE</div>
  </div>
  <div slotid="nearbyShows"></div>
  <div now-playing>
    From <b>Now playing</b>
    <div list slotid="nowPlayingList"></div>
  </div>
</div>
  `;

  const knowledgeGraphService = 'https://kgsearch.googleapis.com/v1/entities:search?key=AIzaSyDVu27xQSI7fQ-_VvZpCH6sdVMe1mueN54&limit=1';

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return Boolean(props.artist);
    }
    willReceiveProps(props) {
      if (props.artistPlayHistory.length) {
        const mostRecentTimestamp = Math.max(...props.artistPlayHistory.map(r => r.dateTime));
        this.setParticleDescription(
          `You've heard ${props.artist.name} on ${new Date(mostRecentTimestamp).toLocaleDateString()}`);
      }
    }
    render(props, state) {
      if (!props.artist) return;

      if (!state.fetching) {
        this._setState({fetching: true});
        fetch(`${knowledgeGraphService}&query=${encodeURI(props.artist.name)}`)
            .then(async response => this._processResponse(await response.json()));
      }
      
      return {
        name: props.artist.name,
        description: state.description || '',
        imageUrl: state.imageUrl || '',
        detailedDescription: state.detailedDescription || '',
        photoStyle: {
          backgroundImage: state.imageUrl ? `url(${state.imageUrl})` : 'none'
        },
      };
    }

    async _processResponse(response) {
      if (response.error) {
        console.log(response.error);
        return;
      }

      if (response.itemListElement.length === 0) {
        console.log('No results in the knowledge graph.');
        return;
      }
      
      let result = response.itemListElement[0].result;
      this._setState({
        description: result.description,
        imageUrl: result.image && result.image.contentUrl,
        detailedDescription: result.detailedDescription && result.detailedDescription.articleBody
      });
    }
  };
});
