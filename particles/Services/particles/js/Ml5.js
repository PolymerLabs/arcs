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

  const url = resolver(`Ml5/../../assets/waltbird.jpg`);

  return class extends DomParticle {
    get template() {
      return template;
    }
    update({}, state) {
      // TODO(sjmiles): update() is called during SpecEx, while
      // render() is not. We'll put our processing code in render()
      // to avoid being expensive at SpecEx time.
    }
    render({}, state) {
      // formerly update
      if (!state.classified) {
        state.classified = true;
        this.classify(url);
      }
      // render proper
      let {response} = state;
      response = response || {label: '<working>', probability: '<working>'};
      return {
        label: response.label,
        probability: response.probability,
        imageUrl: url
      };
    }
    async classify(imageUrl) {
      const response = await this.service({call: 'ml5.classifyImage', imageUrl});
      this.setState({response});
    }
  };

});
