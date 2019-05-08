/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, log, html, resolver}) => {

  const template = html`
<div>
  <img style="max-width: 240px;" src="{{imageUrl}}"><br>
  <div>
    <div>Label: </span><span>{{label}}</div>
    <div>Confidence: </span><span>{{probability}}</div>
  </div>
</div>
  `;

  const url = `http://localhost/projects/ml5-examples/javascript/ImageClassification/images/waltbird.jpg`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    async service(request) {
      if (!this.capabilities.serviceRequest) {
        console.warn(`${this.spec.name} has no service support.`);
      }
      return new Promise(resolve => {
        this.capabilities.serviceRequest(this, request, response => resolve(response));
      });
    }
    update({}, state) {
      if (!state.classified) {
        state.classified = true;
        this.classify(url);
      }
    }
    async classify(imageUrl) {
      const response = await this.service({service: 'ml5', invoke: 'classifyImage', imageUrl});
      this.setState({response});
    }
    render({}, {response}) {
      response = response || {label: '<working>', probability: '<working>'};
      return {
        label: response.label,
        probability: response.probability,
        imageUrl: url
      };
    }
  };

});
