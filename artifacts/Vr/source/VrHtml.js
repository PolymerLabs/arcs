// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html}) => {

  const template = html`
    <aframe-html height="0.25" rotation="0 30 0" position="-3 1.3 -3" html="{{html}}"></aframe-html>
    <aframe-html height="0.25" position="0 1 -3" html="{{html}}"></aframe-html>
    <aframe-html height="0.25" rotation="0 -30 0" position="3 0.8 -3" html="{{html}}"></aframe-html>
  `;

  const content = html`
  <div style="background: #F8F8F8; color: #333; font-size: 24px; padding: 32px; border-radius: 16px;">
    <div style="font-size: 1.3em; margin-bottom: 16px;">ensure that a few checks are consistent through a page reload</div>
    <div style="color: gray;">#1132 opened 28 minutes ago by smalls • Approved</div>
  </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props, state) {
      return {
        html: content
      };
    }
  };

});