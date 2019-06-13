/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, html, resolver}) => {

  const tmpl = html`
  <div style="padding: 16px;">
    <h3>Select Model</h3>
    <h4>Input the path/to/model.json</h4>
    <input style="width: 80%; padding: 8px;" value="{{inputModelUrl}}" on-change="onChange">
    <button on-click="onSubmit">Submit</button>
  </div>
  `;

  return class extends DomParticle {
    get template() {
      return tmpl;
    }
    render({}, state) {
      if (!state.inputModelUrl) {
        state.inputModelUrl = 'https://$particles/Services/assets/MobileNetV1/MobileNet_v1_100_224.json';
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
      this.updateSingleton('model', {url});
    }
  };
});
