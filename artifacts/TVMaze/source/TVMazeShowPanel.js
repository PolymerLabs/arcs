// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

/* global defineParticle */

defineParticle(({DomParticle, html, log}) => {

  const host = `tv-maze-show-panel`;

  const template = html`

<div ${host} hidden="{{hidden}}">
  <style>
    [${host}] {
      padding: 16px;
    }
    [${host}] > [slotid=action] {
      margin-right: 40px;
    }
    [${host}] > [columns] {
      /* display: flex; */
      align-items: start;
      padding-bottom: 8px;
    }
    [${host}] [img] {
      vertical-align: middle;
      padding-right: 8px;
    }
    [${host}] > [description] p {
      margin: 0;
    }
  </style>
  <div slotid="action"></div>
  <div columns>
    <img src="{{image}}">
    <div>
      <b>{{network}}</b>
      <br>
      <span>{{day}}</span> <span>{{time}}</span>
    </div>
  </div>
  <div description style="margin: 16px 0;" unsafe-html="{{description}}"></div>
  <!-- <div style="color: #333; font-size: 1.5em; margin: 16px 0;">Episodes</div> -->
  <div slotid="items"></div>
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({show}) {
      return Boolean(show);
    }
    update({show, boxed, user}) {
      if (show && boxed && user) {
        boxed.forEach(item => {
          if (item.showid === show.showid) {
            const owner = item.getUserID().split('|')[0];
            if (owner !== user.id) {
              log(`${owner} is also watching ${show.name}`);
            }
          }
        });
      }
    }
    render({show}) {
      if ('length' in show) {
        show = show[0];
      }
      const hidden = Boolean(!show);
      if (hidden) {
        show = Object;
      }
      return {
        hidden,
        image: show.image || '',
        description: show.description,
        network: show.network,
        day: show.day ? `${show.day}s` : '(n/a)',
        time: show.time,
        id: show.id
      };
    }
  };
});
