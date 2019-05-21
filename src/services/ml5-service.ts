/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {dynamicImport} from './dynamic-import.js';
import {logFactory} from '../platform/log-web.js';
import {Mapper, Runnable} from '../runtime/hot.js';
import {Services} from '../runtime/services.js';

const log = logFactory('ml5-service');

const requireMl5: Runnable = async () => {
  if (!window.hasOwnProperty('ml5')) {
    await dynamicImport('https://unpkg.com/ml5@0.2.3/dist/ml5.min.js');
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

const loadImage: Mapper<string, Promise<HTMLImageElement>> = async (url) => {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = url;
    image.onload = async () => resolve(image);
  });
};

Services.register('ml5', {
  classifyImage
});
