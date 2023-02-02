/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Services} from '../runtime/services.js';
import {loadImage} from '../platform/image-web.js';
import {logsFactory} from '../platform/logs-factory.js';

const {log} = logsFactory('ml5-service');

const requireMl5 = async () => {
  if (!window.hasOwnProperty('ml5')) {
    // @ts-ignore TS1323 dynamic import
    await import('https://unpkg.com/ml5@0.2.3/dist/ml5.min.js');
  }
  return window['ml5'];
};

const classifyImage = async ({imageUrl}) => {
  log('classifying...');
  const ml5 = await requireMl5();
  const image = await loadImage(imageUrl);
  const classifier = await ml5.imageClassifier('MobileNet');
  const results = await classifier.classify(image);
  const result = results.shift();
  log('classifying done.');
  return {
    label: result.label,
    probability: result.confidence.toFixed(4)
  };
};

Services.register('ml5', {
  classifyImage
});
