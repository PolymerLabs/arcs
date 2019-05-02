/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, html, log, resolver}) => {
  const tmpl = html`
  <div style="padding: 16px;">
    <h3>Neural Style Transfer</h3>
    <h4>Input the path/to/style-transfer/model/</h4>
    <input style="width: 80%; padding: 8px;" value="{{inputModelUrl}}" on-change="onChange">
    <h5 style="margin: 8px 0;">Please choose the folder where the model is located, <it>not</it> the model itself.</h5>
    <button on-click="onSubmit">Submit</button>
    <br>
  </div>
  `;

  return class extends DomParticle {
    get template() {
      return tmpl;
    }
    render({}, state) {
      if (!state.inputModelUrl) {
        state.inputModelUrl = 'https://$particles/Processing/assets/models/udnie';
      }
      return {
        inputModelUrl: state.inputModelUrl
      };
    }
    onChange({data: {value}}) {
      this.setState({inputModelUrl: value});
    }
    onSubmit() {
      const url = resolver(this.state.inputModelUrl);
      this.updateVariable('model', {url});
    }
  };
});
