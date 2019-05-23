/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {logFactory} from '../platform/log-web.js';
import {Runnable} from '../runtime/hot.js';
import {Services} from '../runtime/services.js';
import {loadImage} from './tfjs-service.js';

const log = logFactory('ml5-service');

const requireMl5: Runnable = async () => {
  if (!window.hasOwnProperty('ml5')) {
    // @ts-ignore TS1323 dynamic import
    await import('https://unpkg.com/ml5@0.2.3/dist/ml5.min.js');
  }
};

const classifyImage = async ({imageUrl}) => {
  log('classifying...');
  await requireMl5();
  const image = await loadImage(imageUrl);
  const classifier = await window['ml5'].imageClassifier('MobileNet');
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
