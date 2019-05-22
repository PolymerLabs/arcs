/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


'use strict';

import {dynamicScript} from './dynamic-script.js';
import {loadImage, requireTf} from './tfjs-service.js';
import {Reference, ResourceManager} from './resource-manager.js';
import {logFactory} from '../platform/log-web.js';
import {Services} from '../runtime/services.js';

const log = logFactory('tfjs-mobilenet-service');

const modelUrl = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@1.0.0';


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
  log('Loading tfjs...');
  const tf = await requireTf();
  log('Loading MobileNet...');
  await dynamicScript(modelUrl);
  const model = await window['mobilenet'].load(version, alpha);
  log('MobileNet Loaded.');
  model.version = version;
  model.alpha = alpha;
  return ResourceManager.ref(model);
};

/**
 * Find the top k images classes given an input image and a model.
 *
 * @param model A classification model reference
 * @param image An image DOM element or 3D tensor
 * @param imageUrl An image URL
 * @param topK The number of predictions to return.
 * @return A list of `ClassificationPrediction`s, which are label, confidence tuples.
 */
const classify = async ({model, image, imageUrl, topK = 1}): Promise<ClassificationPrediction[] | ClassificationPrediction> => {
  const model_: Classifier = ResourceManager.deref(model) as Classifier;

  const img = await getImage(image, imageUrl);

  log('classifying...');
  const predictions = await model_.classify(img, topK);
  log('classified.');

  if (topK === 1) {
    return predictions.shift();
  }

  return predictions;
};

/**
 * Produce a concept vector or image embeddings given a model and an image.
 *
 * @param model A classification model reference
 * @param image An image DOM element or 3D tensor
 * @param imageUrl An image URL
 * @return A `MobilenetEmbedding`
 * @see MobilenetEmbedding
 */
const extractEmbeddings = async ({model, image, imageUrl}): Promise<MobilenetEmbedding> => {
  const model_ = ResourceManager.deref(model) as MobilenetClassifier;
  const img = await getImage(image, imageUrl);

  log('Inferring...');
  const inference = await model_.infer(img);
  log('Embedding inferred.');

  return {version: model_.version, alpha: model_.alpha, feature: inference};
};


/** Clean up model resources. */
const dispose = ({reference}) => ResourceManager.dispose(reference);

const getImage = async <T> (image: T | undefined, imageUrl: string): Promise<HTMLImageElement | T | undefined> => {
  log('Loading image...');
  return !image && imageUrl ? await loadImage(imageUrl): image;
};

Services.register('mobilenet', {
  load,
  classify,
  extractEmbeddings,
  dispose,
});
