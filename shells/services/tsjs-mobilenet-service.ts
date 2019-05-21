/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


'use strict';

import {logFactory} from '../../build/platform/log-web.js';
import {Services} from '../../build/runtime/services.js';
import {dynamicScript} from './dynamic-script.js';
import {requireTf} from './tfjs-service.js';
import {ResourceManager, Reference} from './ResourceManager.js';

const log = logFactory('tfjs-mobilenet-service');

const modelUrl = 'https://unpkg.com/@tensorflow-models/mobilenet@1.0.1/dist/mobilenet.min.js';


/**
 * A tuple that determines the type and structure of MobileNet
 *
 * `version` can be either `1` or `2`.
 * `alpha` controls the width of the network, trading accuracy for performance.
 *
 * @see https://github.com/tensorflow/tfjs-models/tree/master/mobilenet#loading-the-model
 */
interface MobilenetParams {
  version: number;
  alpha: number;
}

interface ClassificationPrediction {
  className: string;
  probability: number;
}

interface Classifier {
  classify(...args): ClassificationPrediction[];
  infer(...args): number[];
}

interface MobilenetClassifier extends Classifier, MobilenetParams {}

/**
 * A Tuple of model parameters and a fixed length vector.
 *
 * The length of the vector is determined by the `version` and `alpha` of the ML model. Thus, the embedding and model
 * version should be grouped.
 */
interface MobilenetEmbedding extends MobilenetParams {
  feature: number[];
}

/**
 * Load the `MobileNet` image classifier.
 *
 * Dynamically loads MobileNet and its dependencies (e.g. `tfjs`).
 *
 * @param version Model version. Choose between 1 or 2. Default: 2
 * @param alpha Model fidelity ratio. Choose between performant (~0) or highly accurate (~1). Default: 1
 * @return a reference number to the model, maintained by the `ResourceManager`.
 */
const load = async ({version = 2, alpha = 1}: MobilenetParams): Promise<Reference> => {
  log('Loading tfjs');
  const tf = await requireTf();
  log('Loading MobileNet');
  await dynamicScript(modelUrl);
  const model = await tf.mobilenet.load(version, alpha);
  model.version = version;
  model.alpha = alpha;
  return ResourceManager.ref(model);
};

/**
 * Find the top k images classes given an input image and a model.
 *
 * @param model A classification model reference
 * @param img An image DOM element or 3D tensor
 * @param topK The number of predictions to return.
 * @return A list of `ClassificationPrediction`s, which are label, confidence tuples.
 */
const classifiy = async ({model, img, topK = 3}): Promise<ClassificationPrediction[]>=> {
  const model_: Classifier = ResourceManager.deref(model) as Classifier;
  log('Classifying...');
  return await model_.classify(img, topK);
};

/**
 * Produce a concept vector or image embeddings given a model and an image.
 *
 * @param model A classification model reference
 * @param img A image DOM element or 3d tensor
 * @return A `MobilenetEmbedding`
 * @see MobilenetEmbedding
 */
const extractEmbeddings = async ({model, img}): Promise<MobilenetEmbedding> => {
  const model_ = ResourceManager.deref(model) as MobilenetClassifier;
  log('Inferring...');
  const inference = await model_.infer(img);
  return {version: model_.version, alpha: model_.alpha, feature: inference};
};

Services.register('mobilenet', {
  load,
  classifiy,
  extractEmbeddings,
});
