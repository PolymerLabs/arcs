/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

/* global defineParticle */

defineParticle(({SimpleParticle, html, log}) => {

  // TODO(sjmiles): encode expected aspect-ratio using div-padding trick, this way the box will be properly sized
  // even if there is no image.
  // The old way: `<img ${host} src="{{image}}" style="width:100%;">`;
  const template = html`
    <style>
      [show-tile] {
        width: var(--tile-size, 200px);
        padding-bottom: 140%;
        background-repeat: no-repeat;
        background-size: contain;
      }
      :host {
        --tile-size: var(--tile-width, calc(100vw - 42px));
      }
      @media (min-width: 440px) {
        :host {
          --tile-size: var(--tile-width, calc(50vw - 42px));
        }
      }
      @media (min-width: 560px) {
        :host {
          --tile-size: var(--tile-width, calc(33vw - 42px));
        }
      }
      @media (min-width: 800px) {
        :host {
          --tile-size: var(--tile-width, calc(25vw - 42px));
        }
      }
      @media (min-width: 1100px) {
        :host {
          --tile-size: var(--tile-width, calc(20vw - 42px));
        }
      }
      @media (min-width: 1400px) {
        :host {
          --tile-size: var(--tile-width, calc(15vw - 42px));
        }
      }
    </style>
    <div show-tile trigger$="{{trigger}}" style%="{{image}}"></div>
  `;

  return class extends SimpleParticle {
    get template() {
      return template;
    }
    // TODO(sjmiles): bad things happen if shouldRender is enabled, run this by @mmandlis
    //shouldRender({show}) {
    //  return Boolean(show);
    //}
    render({show}) {
      if (show) {
        return {
          image: {backgroundImage: `url("${show.image}")`},
          trigger: show.name
        };
      } else {
        //log('show data missing');
      }
    }
  };
});
