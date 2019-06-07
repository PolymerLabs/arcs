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
  <img style="max-width: 240px;" src="{{imageUrl}}" alt="Image to classify"><br>
  <div>
    <div>Label: </span><span>{{label}}</div>
    <div>Confidence: </span><span>{{probability}}</div>
  </div>
</div>
  `;

  const url = resolver(`ImageClassifier/../../assets/waltbird.jpg`);
  const modelUrl = 'https://tfhub.dev/google/imagenet/mobilenet_v1_100_224/classification/1';
  const labelUrl = resolver(`ImageClassifier/../../assets/ImageNetLabels.txt`);

  return class extends DomParticle {
    get template() {
      return template_;
    }

    render({}, state) {
      // formerly update
      if (!state.loaded) {
        state.loaded = true;
        this.loadModel(modelUrl, {fromTFHub: true});
      }
      this.getModelLabels();

      // render proper
      let {response} = state;
      response = response || {label: '<working>', probability: '<working>'};
      return {
        label: response.className,
        probability: response.probability,
        imageUrl: url
      };
    }

    async loadModel(modelUrl, options) {
      log('Loading Model...');
      const model = await this.service({call: 'tf.loadGraphModel', modelUrl, options});
      await this.service({call: 'tf.warmUp', model});
      log('Model Loaded');
      this.setState({model});

      this.classify(url);
    }

    async classify(imageUrl) {
      if (this.state.model === undefined || this.state.model === null) {
        log('Model needs to be loaded!');
        return;
      }

      log('Preprocessing...');
      const imgReference = await this.service({call: 'tf.imageToTensor', imageUrl});
      const normalized = await this.service({call: 'tf.normalize', input: imgReference, range: [0, 255]});
      const interpolated = await this.service({call: 'tf.resizeBilinear', images: normalized, size: [224, 224], alignCorners: true});
      const resized = await this.service({call: 'tf.reshape', input: interpolated, newShape: [-1, 224, 224, 3]});

      log('Classifying Model...');
      const yHat = await this.service({call: 'tf.predict', model: this.state.model, inputs: resized});

      log('Classified. Interpreting results...');
      await this.getModelLabels();
      const predictions = await this.service({call: 'tf.getTopKClasses', yHat, labels: this.state.labels, topK: 5});
      log(predictions);

      this.setState({response: predictions[0]});
    }

    async getModelLabels() {
      if (!this.state.labels) {
        const document = await fetch(labelUrl).then((r) => r.text());
        const labels = document.split('\n');
        this.setState({labels});
      }
    }
  };

});
