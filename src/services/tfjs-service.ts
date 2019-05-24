/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {dynamicScript} from '../platform/dynamic-script-web.js';
import {Reference, ResourceManager as rmgr} from './resource-manager.js';
import {logFactory} from '../platform/log-web.js';
import {Services} from '../runtime/services.js';

const log = logFactory('tfjs-service');

const TF_VERSION = '1.1.2';
const tfUrl = `https://unpkg.com/@tensorflow/tfjs@${TF_VERSION}/dist/tf.min.js?module`;

/** Dynamically loads and returns the `tfjs` module. */
export const requireTf = async () => {
  if (!window['tf']) {
    await dynamicScript(tfUrl);
  }
  return window['tf'];
};

// Map some TF API to a Service

const sequential = async (): Promise<Reference> => {
  // lazy-load TensorFlow
  const tf = await requireTf();
  // Define a model
  const model = tf.sequential();
  return rmgr.ref(model);
};

const linearRegression = async ({model: modelRef, training, query, epochs}) => {
  // lazy-load TensorFlow
  const tf = await requireTf();

  // @ts-ignore
  // get the referenced model
  const model: tf.LayersModel = rmgr.deref(modelRef);
  // Define a model for linear regression.
  //const model = tf.sequential();
  model.add(tf.layers.dense({units: 1, inputShape: [1]}));
  // Prepare the model for training: Specify the loss and the optimizer.
  model.compile({loss: 'meanSquaredError', optimizer: 'sgd'});
  // Generate some synthetic data for training.
  const x = training.map(e => e[0]);
  const y = training.map(e => e[1]);
  const l = training.length;
  log(x, y, l);
  const xs = tf.tensor2d(x, [l, 1]);
  const ys = tf.tensor2d(y, [l, 1]);
  epochs = epochs || 500;
  // Train the model using the data.
  for (let i=0; i<epochs; i++) {
    await model.fit(xs, ys);
  }
  // Use the model to do inference on a data point the model hasn't seen before:
  const t = model.predict(tf.tensor2d([query], [1, 1]));
  // extract results
  const buffer = await t.buffer();
  log(buffer.values);
  return buffer.values;
};


const dispose = ({reference}) => rmgr.dispose(reference);

Services.register('tfjs', {
  linearRegression,
  sequential,
  dispose,
});

