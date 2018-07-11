// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle}) => {

  let template = `
<template participant>
  <a-entity name$="{{subId}}" position$="{{position}}" scale$="{{scale}}" rotation$="{{rotation}}">
    <a-entity slotid="mouth" subid="{{subId}}"></a-entity>
    <a-entity slotid="topofhead" subid="{{subId}}"></a-entity>
  </a-entity>
</template>

<a-entity>{{participants}}</a-entity>
    `.trim();

  let data = {
    Scott: {
      position: '350 400 -1500',
      scale: '200 200 200',
    },
    Noe: {
      position: '-950 300 -1000',
      rotation: '0 30 0',
      scale: '200 200 200',
    },
    Berni: {
      position: '-180 100 850',
      rotation: '0 180 0',
      scale: '200 200 200',
    },
    Mike: {
      position: '-1000 280 390',
      rotation: '0 90 0',
      scale: '200 200 200',
    },
    Shane: {
      position: '1000 70 -330',
      rotation: '0 270 0',
      scale: '200 200 200',
    },
    Doug: {
      position: '775 75 740',
      rotation: '0 220 0',
      scale: '200 200 200',
    },
  };

  return class extends DomParticle {

    get template() {
      return template;
    }
    render(props, state) {
      if (props.participants) {
        return {
          participants: {
            $template: 'participant',
            models: this.renderParticipants(props.participants)
          }
        };
      }
    }
    renderParticipants(participants) {
      return Object.keys(data).map((p, i) => {
        return {
          subId: p,
          name: p,
          position: data[p].position,
          rotation: data[p].rotation,
          scale: data[p].scale,
        };
      });
    }
  };
});
