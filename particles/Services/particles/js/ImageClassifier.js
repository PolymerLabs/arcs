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

defineParticle(({DomParticle, log, html, resolver}) => {

  const template_ = html`
<div>
  <h2>Classification with a generic image classifier</h2>
  <img style="max-width: 240px;" src="{{imageUrl}}"><br>
  <div id="progress-bar">{{progress}}</div>
  <div>
    <div>Label: </span><span>{{label}}</div>
    <div>Confidence: </span><span>{{probability}}</div>
  </div>
</div>
  `;

  const url = resolver(`ImageClassifier/../../assets/waltbird.jpg`);
  const modelUrl = 'https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/2';

  return class extends DomParticle {
    get template() {
      return template_;
    }
    update({}, state) {
      // TODO(sjmiles): update() is called during SpecEx, while
      // render() is not. We'll put our processing code in render()
      // to avoid being expensive at SpecEx time.
    }
    render({}, state) {
      // formerly update
      if(!state.loaded) {
        state.loaded = true;
        this.loadModel(modelUrl, {onProgress: this.onLoadProgress, fromTFHub: true});
      }
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

    onLoadProgress(fraction) {
      if (fraction === 1.0 || fraction === 100) {
        document.getElementById('progress-bar').setAttribute('display', 'none');
      }
      const prog = fraction < 1.0 ? fraction * 100.0 : fraction;
      this.setState({progress: prog});
    }

    async loadModel(modelUrl, options) {
      const model = await this.service({call: 'graph-model.load', modelUrl, options});
      this.setState({model});
    }

    async classify(imageUrl) {
      const imgReference = await this.service({call: 'preprocessor.imageToTensor', imageUrl});
      const response = await this.service({call: 'graph-model.predict', model: this.state.model, input: imgReference});
      this.setState({response});
    }
  };

});
