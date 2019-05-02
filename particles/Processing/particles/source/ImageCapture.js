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

defineParticle(({DomParticle, html, resolver, log}) => {

  const template = html`
    <div style="padding: 16px;">
      <h2>Arcs Image Processing Demo</h2>
      <h3>Input an image url</h3>
      <input style="width: 80%; padding: 8px;" on-change="onChange" value="{{inputUrl}}">
      <br><br>
      <button on-click="onSubmit">Submit</button>
      <br><br>
      <img src="{{url}}">
      <div slotid="imageView"></div>
      <!-- <image-helper src="{{url}}"></image-helper> -->
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props, state) {
      if (!state.inputUrl) {
        state.inputUrl = 'https://$particles/Processing/assets/kitten.jpg';
      }
      return state;
    }
    onChange({data: {value}}) {
      this.setState({inputUrl: value});
    }
    onSubmit() {
      const url = resolver(this.state.inputUrl);
      this.updateVariable('image', {url});
      this.setState({url});
    }
  };

});
