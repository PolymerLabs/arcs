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
import {Consumer, Mapper} from '../runtime/hot.js';
import {loadImage} from '../platform/image-web.js';
import {tf} from '../platform/tf-node.js';

const log = logFactory('tfjs-service');

interface Disposable {
  dispose(): void;
}

interface Inferrable {
  readonly inputs: object[]; // @see `TensorInfo` https://github.com/tensorflow/tfjs-core/blob/master/src/tensor_types.ts
  predict(input, options: object): Promise<unknown>;
}

/**
 * @see tf.io.LoadOptions https://github.com/tensorflow/tfjs-core/blob/5be798096108e9186cf37537e6f1b69185223024/src/io/types.ts#L358
 */
interface LoadOptions {
  requestInit?: RequestInit;
  onProgress?: Consumer<number>;
  fetchFunc?: Mapper<string| Request, Promise<Response>>;
  strict?: boolean;
  weightPathPrefix?: string;
  fromTFHub?: boolean;
}

abstract class TfModel implements Services {

  public abstract async load(modelUrl, options: LoadOptions): Promise<Reference>;

  public async predict(model: Reference, inputs: Reference, config): Promise<number[]> {
    const tf = await requireTf();
    log('Referencing model and input...');
    const model_  = rmgr.deref(model) as Inferrable;
    const inputs_ = rmgr.deref(inputs);

    log('Predicting');
    const yHat = await model_.predict(inputs_, config);

    return await tensorToOutput(yHat);
  }

  public async warmUp(model): Promise<void> {
    throw Error('Not Implemented');
  }

  private _getInputShape(model: Inferrable): number[] | number[][] {
    const inputs = model.inputs;
    throw Error('Not Implemented');
  }

  public dispose({reference}): void {
    rmgr.dispose(reference);
  }
}


class GraphModel extends TfModel {
  public async load(modelUrl, options?): Promise<Reference> {
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
  async load(modelUrl, options?): Promise<Reference> {
    const tf = await requireTf();
    const model = await tf.loadLayersModel(modelUrl, options);
    return rmgr.ref(model);
  }
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
    .div(normOffset);

  return rmgr.ref(normalized);
};

const resizeBilinear = async ({images, size, alignCorners}): Promise<Reference> => {
  const tf = await requireTf();
  const images_ = rmgr.deref(images);

  const resized = await tf.resizeBilinar(images_, size, alignCorners);
  return rmgr.ref(resized);
};

const tensorToOutput = async (tensor) => {
  return await tensor.array();
};


Services.register('graph-model', new GraphModel());
Services.register('layer-model', new LayersModel());

Services.register('preprocess', {
  imageToTensor,
  normalize,
});

Services.register('tf-image', {
  resizeBilinear,
});
