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

defineParticle(({DomParticle, html, log}) => {

  const template = html`
    <div style="padding: 16px;">
      <h2>Arcs Image Processing Demo</h2>
      <h3>Input an image url</h3>
      <input style="width: 80%; padding: 8px;" on-change="onChange">
      <h5 style="margin: 8px 0;">Try: https://behelits.com/projects/ml5-examples/javascript/ImageClassification/images/kitten.jpg</h5>
      <button on-click="onSubmit">Submit</button>
      <br><br>
      <img src="{{url}}">
      <div slotid="imageView"></div>
    </div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props, state) {
      return state;
    }
    onChange({data: {value}}) {
      this.setState({inputUrl: value});
    }
    onSubmit() {
      console.log(this.props);
      const url = this.state.inputUrl;
      this.updateVariable('image', {url});
      this.setState({url});
    }
  };

});
