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

  const template = html`
    <style>
      [tile] {
        /* responsive tile width*/
        width: var(--tile-size, 200px);
        /* force aspect-ratio using div-padding trick, so
           the box will be properly sized even if there is no image. */
        height: 0;
        padding-bottom: 140%;
        /**/
        background-repeat: no-repeat;
        background-size: contain;
        overflow: hidden;
      }
      h3 {
        margin: 0;
        padding: 8px;
        -webkit-text-stroke: 1px #333;
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

    <div tile xen:style="{{style}}" trigger$="{{trigger}}">
      <!-- <h3>{{name}}</h3>
      <div unsafe-html="{{overview}}"></div> -->
    </div>
  `;

  return class extends SimpleParticle {
    get template() {
      return template;
    }
    render({result}) {
      if (result) {
        const {name, poster_path, overview} = result;
        const bg = poster_path ? `https://xenonjs.com/services/http/php/tmdb-image.php?w342${poster_path}` : null;
        return {
          style: bg ? {backgroundImage: `url("${bg}")`, color: 'white'} : {},
          name,
          //overview,
          trigger: name
        };
      } else {
        //log('result data missing');
      }
    }
  };
});
