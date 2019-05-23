/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {dynamicScript} from '../platform/dynamic-script-web.js';
import {requireTf} from './tfjs-service.js';
import {Reference, ResourceManager} from './resource-manager.js';
import {logFactory} from '../platform/log-web.js';
import {Services} from '../runtime/services.js';
import {loadImage} from '../platform/image-web.js';

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

/** @see https://github.com/tensorflow/tfjs-models/tree/master/mobilenet#making-a-classification */
type MobilenetImageInput = ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement; // | tf.Tensor3D;

interface ImageInferenceParams {
  model: Reference;
  image?: MobilenetImageInput;
  imageUrl?: string;
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
const load = async ({version = 1, alpha = 1.0}: MobilenetParams): Promise<Reference> => {
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
 * @return A list (or single item) of `ClassificationPrediction`s, which are "label, confidence" tuples.
 */
const classify = async ({model, image, imageUrl, topK = 1}: ImageInferenceParams & {topK: number}): Promise<ClassificationPrediction[] | ClassificationPrediction> => {
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
const extractEmbeddings = async ({model, image, imageUrl}: ImageInferenceParams): Promise<MobilenetEmbedding> => {
  const model_ = ResourceManager.deref(model) as MobilenetClassifier;
  const img = await getImage(image, imageUrl);

  log('inferring...');
  const inference = await model_.infer(img);
  log('embedding inferred.');

  return {version: model_.version, alpha: model_.alpha, feature: inference};
};


/** Clean up model resources. */
const dispose = ({reference}) => ResourceManager.dispose(reference);

/**
 * Helper method that uses a DOM image element or loads the image from a URL.
 *
 * @param image An image that Mobilnet will accept
 * @param imageUrl A URL string to an image.
 *
 * @see MobilenetImageInput
 * @throws Error if both parameters are falsy.
 */
const getImage = async (image: MobilenetImageInput | undefined, imageUrl: string | undefined): Promise<MobilenetImageInput | undefined> => {
  if (!image && !imageUrl) {
    throw new Error('Must specify at least one: a DOM Image element or Image URL!');
  }

  log('loading image...');
  return !image && imageUrl ? await loadImage(imageUrl): image;
};

Services.register('mobilenet', {
  load,
  classify,
  extractEmbeddings,
  dispose,
});
