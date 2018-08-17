// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

/* global defineParticle */

defineParticle(({DomParticle, resolver, log}) => {

  let host = `episode-item`;

  const template = `
    <style>
      [${host}] {
        display: flex;
      }
    </style>
    <div ${host} style="display: flex; align-items: center; margin-bottom: 16px;">
      <div col style="margin-right: 16px; width: 224px; box-sizing: border-box;"><img src="{{image}}" style="width: 224px;"></div>
      <div col>
        <div style="color: #333; font-size:1.2em; Xfont-weight: bold; padding-bottom: 4px;">Episode <span>{{number}}</span></div>
        <div style="color: #333; font-size:1.2em; Xfont-weight: bold; padding-bottom: 4px;">{{name}}</div>
        <div style="color: #666; padding-bottom: 4px;">{{airdate}}</div>
        <div style="color: #666; padding-bottom: 4px;">Runtime <span>{{runtime}}</span>m</div>
      </div>
      <!--<div ${host} unsafe-html="{{summary}}"></div>-->
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({episode}) {
      if (episode) {
        log('rendering', episode.name);
        const model = episode.dataClone();
        if (!model.image) {
          model.image = resolver('TVEpisodeItem/../data/TV.png');
        }
        return model;
      }
    }
  };
});