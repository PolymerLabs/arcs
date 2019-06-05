/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Reference, ResourceManager as rmgr} from './resource-manager.js';
import {logFactory} from '../platform/log-web.js';
import {Services} from '../runtime/services.js';
import {requireTf} from '../platform/tf-web.js';
import {loadImage} from '../platform/image-web.js';
import {tf} from '../platform/tf-node.js';

const log = logFactory('tfjs-service');

interface Disposable {
  dispose(): void;
}

/**
 * @see `TensorInfo` https://github.com/tensorflow/tfjs-core/blob/master/src/tensor_types.ts
 */
interface Inferrable {
  readonly inputs: object[];
  predict(input, options: object): Promise<unknown>;
}

type TfTensor = tf.Tensor | tf.Tensor[] | tf.NamedTensorMap;

export interface ClassificationPrediction {
  className: string;
  probability: number;
}

abstract class TfModel implements Services {

  public abstract async load({modelUrl, options}): Promise<Reference>;

  public async predict({model, inputs, config}): Promise<Reference> {
    const tf = await requireTf();

    log('Referencing model and input...');
    const model_  = rmgr.deref(model) as tf.InferenceModel;
    const inputs_ = rmgr.deref(inputs) as TfTensor;

    log('Predicting');
    const yHat = await model_.predict(inputs_, config) as TfTensor;

    return rmgr.ref(yHat);
  }

  public async warmUp({model}): Promise<void> {
    log('Warming up model...');
    const tf = await requireTf();
    const model_  = rmgr.deref(model) as tf.InferenceModel;

    const zeros = model_.inputs
      .map(i => i.shape ? i.shape : [])
      .map((sh) => sh.map(x => Math.abs(x)))
      .map((sh) => tf.zeros(sh || [1]));

    const zeroInput = zeros.length === 1 ? zeros[0] : zeros;

    await model_.predict(zeroInput, {});
    log('Model warm.');
  }

  public dispose({reference}): void {
    rmgr.dispose(reference);
  }
}


class GraphModel extends TfModel {
  public async load({modelUrl, options}): Promise<Reference> {
    const tf = await requireTf();
    const model = await tf.loadGraphModel(modelUrl, options);
    return rmgr.ref(model);
  }

  public dispose({reference}): void {
    const model_ = rmgr.deref(reference) as Inferrable & Disposable;
    model_.dispose();
    super.dispose(reference);
  }

}

class LayersModel extends TfModel {
  async load({modelUrl, options}): Promise<Reference> {
    const tf = await requireTf();
    const model = await tf.loadLayersModel(modelUrl, options);
    return rmgr.ref(model);
  }
  // train(...)
}

const imageToTensor = async ({imageUrl}): Promise<Reference> => {
  const tf = await requireTf();
  const imgElem = await loadImage(imageUrl);
  const imgTensor = await tf.browser.fromPixels(imgElem, 3);
  return rmgr.ref(imgTensor);
};

const _zip = (a: unknown[], b: unknown[]) => b.length < a.length ? _zip(b, a) : a.map((e, i) => [e, b[i]]);

const normalize = async ({input, range=[0, 255]}): Promise<Reference> => {
  const tf = await requireTf();
  const input_ = rmgr.deref(input) as tf.Tensor;

  const max_ = Math.max(...range);
  const min_ = Math.min(...range);
  const mid = (max_ - min_) / 2 + min_;

  const normOffset = tf.scalar(mid);

  const normalized = input_.toFloat()
    .sub(normOffset)
    .div(normOffset) as tf.Tensor3D;

  return rmgr.ref(normalized);
};

const reshape = async ({input, newShape, shape}) => {
  const tf = await requireTf();
  const input_ = rmgr.deref(input);
  const resized = await tf.reshape(input_, newShape || shape);
  return rmgr.ref(resized);
};

const expandDims = async ({input, x, axis = 0}) => {
  const tf = await requireTf();
  const input_ = rmgr.deref(input || x);
  const expanded = tf.expandDims(input_, axis);
  return rmgr.ref(expanded);
};

const resizeBilinear = async ({images, size, alignCorners}): Promise<Reference> => {
  const tf = await requireTf();
  const images_ = rmgr.deref(images);

  const resized = await tf.image.resizeBilinear(images_, size, alignCorners);
  return rmgr.ref(resized);
};

const tensorToOutput = async (tensor) => {
  return await tensor.array();
};

const getTopKClasses = async ({input, y, yHat, labels, topK=3}): Promise<ClassificationPrediction[]> => {
  const input_ = rmgr.deref(input || y || yHat) as tf.Tensor2D;

  const softmax = input_.softmax();
  const values = await softmax.data();
  softmax.dispose();

  const valuesAndIndices = [];
  for (let i = 0; i < values.length; i++) {
    valuesAndIndices.push({value: values[i], index: i});
  }
  valuesAndIndices.sort((a, b) => {
    return b.value - a.value;
  });
  const topkValues = new Float32Array(topK);
  const topkIndices = new Int32Array(topK);
  for (let i = 0; i < topK; i++) {
    topkValues[i] = valuesAndIndices[i].value;
    topkIndices[i] = valuesAndIndices[i].index;
  }

  const topClassesAndProbs = [];
  for (let i = 0; i < topkIndices.length; i++) {
    log(topkIndices[i]);
    topClassesAndProbs.push({
      className: labels[topkIndices[i]],
      probability: topkValues[i]
    });
  }
  return topClassesAndProbs;
};


Services.register('graph-model', new GraphModel());
Services.register('layer-model', new LayersModel());

Services.register('preprocess', {
  normalize,
  reshape,
  expandDims,
});

Services.register('postprocess', {
  getTopKClasses,
});

Services.register('tf-image', {
  resizeBilinear,
  imageToTensor,
});


