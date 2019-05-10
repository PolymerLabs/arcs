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

const requireTf = async () => {
  if (!window.tf) {
    await dynamicScript(`https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.0.0/dist/tf.min.js`);
  }
  return window.tf;
};

const linearRegression = async ({training, query, fits}) => {
  const tf = await requireTf();

  // Define a model for linear regression.
  const model = tf.sequential();
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
  // Open the browser devtools to see the output
  const t = model.predict(tf.tensor2d([query], [1, 1]));
  //
  const buffer = await t.buffer();
  log(buffer.values);
  return buffer.values;
};

Services.register('tfjs', {
  linearRegression
});