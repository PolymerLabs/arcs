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

const log = logFactory('tfjs-service');

interface Disposable {
  dispose(): void;
}

interface Inferrable {
  predict(input, options: object): Promise<unknown>;
}

abstract class TfModel {

  public abstract async load(modelUrl, options): Promise<Reference>;

  public async predict(model, inputs, config): Promise<number[]> {
    const tf = await requireTf();

    log('Referencing model');
    const model_  = await rmgr.deref(model) as Inferrable;

    log('Predicting');
    const yHat = await model_.predict(inputs, config);

    return await tensorToOutput(yHat);
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


const tensorToOutput = async (tensor) => {
  return await tensor.array();
};


Services.register('graph-model', new GraphModel());
Services.register('layer-model', new LayersModel());

