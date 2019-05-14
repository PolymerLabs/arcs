/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Services} from '../../build/runtime/services.js';
import {dynamicScript} from './dynamic-script.js';
import {logFactory} from '../../build/platform/log-web.js';

const log = logFactory('tfjs-service');

//const tfUrl = `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.0.0/dist/tf.min.js`;
const tfUrl = `https://unpkg.com/@tensorflow/tfjs@1.1.2/dist/tf.min.js?module`;

// TODO(sjmiles): demonstrate simple concept for tracking objects across the PEC

const references = [];
const reference = value => {
  return references.push(value) - 1;
};

const deref = reference => {
  return references[reference];
};

const dispose = reference => {
  delete references[reference];
};

// Utility

const requireTf = async () => {
  if (!window.tf) {
    await dynamicScript(tfUrl);
  }
  return window.tf;
};

// Map some TF API to a Service

const sequential = async () => {
  // lazy-load TensorFlow
  const tf = await requireTf();
  // Define a model
  const model = tf.sequential();
  return reference(model);
};

const linearRegression = async ({model: modelRef, training, query, fits}) => {
  // lazy-load TensorFlow
  const tf = await requireTf();
  // get the referenced model
  const model = deref(modelRef);
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
  fits = fits || 500;
  // Train the model using the data.
  for (let i=0; i<fits; i++) {
    await model.fit(xs, ys);
  }
  // Use the model to do inference on a data point the model hasn't seen before:
  const t = model.predict(tf.tensor2d([query], [1, 1]));
  // extract results
  const buffer = await t.buffer();
  log(buffer.values);
  return buffer.values;
};

Services.register('tfjs', {
  linearRegression,
  sequential,
  dispose
});
