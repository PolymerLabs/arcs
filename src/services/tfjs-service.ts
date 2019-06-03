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
import {requireTf, tf} from '../platform/tf-web.js';
import {Consumer, Mapper} from '../runtime/hot.js';
import {loadImage} from '../platform/image-web.js';

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

  public async predict(model, inputs, config): Promise<number[]> {
    const model_ = await this._getModel(model);

    log('Predicting');
    const yHat = await model_.predict(inputs, config);

    return await tensorToOutput(yHat);
  }

  public async warmUp(model): Promise<void> {

  }

  private async _getModel(model): Promise<Inferrable> {
    const tf = await requireTf();
    log('Referencing model');
    return rmgr.deref(model) as Inferrable;
  }

  private _getInputShape(model: Inferrable): number[] | number[][] {
    const inputs = model.inputs;
    if(inputs.length === 1) {
      return [1];
    }

    return [1, 2];
  }

  public dispose({reference}): void {
    rmgr.dispose(reference);
  }
}


class GraphModel extends TfModel {
  public async load(modelUrl, options): Promise<Reference> {
    const tf = await requireTf();
    const model: Inferrable = await tf.loadGraphModel(modelUrl, options);
    return rmgr.ref(model);
  }

  public dispose({reference}): void {
    const model_ = rmgr.deref(reference) as Inferrable & Disposable;
    model_.dispose();
    super.dispose(reference);
  }

}

class LayersModel extends TfModel {
  async load(modelUrl, options): Promise<Reference> {
    const tf = await requireTf();
    const model = await tf.loadLayersModel(modelUrl, options);
    return rmgr.ref(model);
  }
}

const imageToTensor = async ({imageUrl}): Promise<Reference> => {
  const imgElem = loadImage(imageUrl);
  const imgTensor = tf.brower.fromPixels(imgElem, 3);
  return rmgr.ref(imgTensor);
};

const tensorToOutput = async (tensor) => {
  return await tensor.array();
};


Services.register('graph-model', new GraphModel());
Services.register('layer-model', new LayersModel());

Services.register('preprocess', {
  imageToTensor,
});
