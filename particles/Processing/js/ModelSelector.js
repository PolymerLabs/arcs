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
    <input style="width: 80%; padding: 8px;" value="{{inputModelUrl}}" on-change="onModelChange">
    <h4>Input the path/to/labels.txt</h4>
    <input style="width: 80%; padding: 8px;" value="{{inputLabelsUrl}}" on-change="onLabelsChange">
    <button on-click="onSubmit">Submit</button>
    
    <div slotid="resultsView"></div>
  </div>
  `;

  return class extends DomParticle {
    get template() {
      return tmpl;
    }
    render({}, state) {
      if (!state.inputModelUrl) {
        state.inputModelUrl = 'https://$particles/Services/assets/MobileNetV1/model.json';
      }

      if (!state.inputLabelsUrl) {
        state.inputLabelsUrl = 'https://$particles/Services/assets/ImageNetLabels.txt';
      }
      return {
        inputModelUrl: state.inputModelUrl,
        inputLabelsUrl: state.inputLabelsUrl
      };
    }
    onModelChange({data: {value}}) {
      this.setState({inputModelUrl: value});
    }
    onLabelsChange({data: {value}}) {
      this.setState({inputLabelsUrl: value});
    }
    onSubmit() {
      const location = resolver(this.state.inputModelUrl);
      const labelsUrl = resolver(this.state.inputLabelsUrl);
      this.updateSingleton('model', {location, labelsUrl});

    }
  };
});
