/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Services} from '../../../build/runtime/services.js';
import {logsFactory} from '../../../build/platform/logs-factory.js';

const {log} = logsFactory('textclassifier-service');
const m = (s, d, e) => ( {pattern: s, desc: d, label: e});

const patterns = [
  m('Susan', 'Susan Boyle', 'Singer'),
  m('Simon', 'Simon Cowell', 'Judge'),
  m('Glasgow', null, 'Place'),
  m('Britains Got Talent', null, 'Tv Show'),
  m('I dreamed a dream', 'I Dreamed a Dream', 'Song'),
  m('Les Miserables', 'Les Miserables', 'Play'),
  m('God', 'God', 'Religious Deity'),
  m('Elaine Paige', null, 'Person'),
  m('Blackburn Near Bathgate West Lothian', null, 'Place')
];

/**
 * TODO: Make this real!
 */
const classifyText = async ({text}) => {
  log('classifying...');
  const labels = [];
  for (const {pattern, desc, label} of patterns) {
    if (text.indexOf(pattern) != -1) {
      labels.push((desc ? desc : pattern) + ':' + label);
    }
  }
  return {
    labels: labels
  };
};

Services.register('textclassifier', {
  classifyText
});
