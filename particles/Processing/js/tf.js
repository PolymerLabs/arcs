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

self.Tf = class {
  constructor(scope) {
    this.scope = scope;
  }
  async call(name, args) {
    args.call = name;
    return this.scope.service(args);
  }
  async dispose({ref}) {
    await this.call('tf.dispose', {ref});
  }
  async loadGraphModel(modelUrl, options) {
    return {
      ref: await this.call('tf.loadGraphModel', {modelUrl,  options})
    };
  }
  async loadLayersModel(modelUrl, options) {
    return {
      ref: await this.call('tf.loadLayersModel', {modelUrl,  options})
    };
  }
  async warmUp({ref: model}) {
    await this.call({call: 'tf.warmUp', model});
  }
  async predict({ref: model}, {ref: inputs}) {
    return {
      ref: await this.call('tf.predict', {model, inputs})
    };
  }
  async imageToTensor({url}) {
    return {
      ref: await this.call('tf.imageToTensor', {imageUrl: url})
    };
  }
  async resizeBilinear({ref: images}, size, options) {
   const ref = await this.call('tf.resizeBilinear', {
     images,
     size: size.map(s => s.dim),
     alignCorners: options ? options.alignCorners : false
    });
    return {ref};
  }
  async expandDims({ref: input}, {ref: axis}) {
    return {
      ref: await this.call('tf.expandDims', {input, axis})
    };
  }
  async normalize({ref: input}, range) {
    return {
       ref: await this.call('tf.normalize', {input, range: range.map(r => r.dim)})
    };
  }
  async reshape({ref: input}, shape) {
    return {
       ref: await this.call('tf.reshape', {input, shape: shape.map(s => s.dim)})
    };
  }
  async getTopKClasses({ref: yHat}, labels, topK) {
    return this.call('tf.getTopKClasses', {yHat, labels: labels.map(l => l.label), topK});
  }
};

self.TfMixin = Base => class extends Base {
  constructor() {
    super();
    this.tf = new self.Tf(this);
  }
  // TODO(sjmiles): experimental: move this bit to dom-particle-base if it's successful
  async set(name, value) {
    const handle = this.handles.get(name);
    if (handle) {
      // TODO(sjmiles): cannot test class of `handle` because I have no
      // references to those classes, i.e. `handle is Singleton`, throws
      // because Singleton is undefined.
      if (handle.type.isEntity) {
        const entity = value.entityClass ? value : new (handle.entityClass)(value);
        return handle.set(entity);
      }
      else if (handle.type.isCollection) {
        if (Array.isArray(value)) {
          await this.clearHandle(name);
          await this.appendRawDataToHandle(name, value);
        }
      }
    }
  }
};
