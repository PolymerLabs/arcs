/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

/* global defineParticle */

defineParticle(({DomParticle, html}) => {

  const tmpl = html`
    <div style="padding: 16px;">
      <h2>Arcs Image Processing Demo</h2>
      <h3>Capture an image with your webcamera</h3>
      <camera-input on-capture="onCapture"></camera-input>
      <br><br>
      <img src="{{url}}">
      <br><br>
      <div slotid="imageView"></div>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return tmpl; }
    render(props, state) {
      // if (!state.inputUrl) {
      //   state.inputUrl = 'https://$particles/Processing/assets/kitten.jpg';
      // }
      return state;
    }
    onCapture(data) {
      const {pixels, width, height, url} = data.data.value;
      this.setState({url: url, blob: {
          blob: new Uint8Array(pixels.buffer),
          width: width,
          height: height
        }});
      this.updateVariable('image', {url});
    }
  };

});
