/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, html, log}) => {

  return class extends DomParticle {
    get template() {
      return `<span>{{json}}</span>`;
    }
    update({query}, state) {
      if (query) {
        this.classify(query.name);
      }
    }

    async classify(text) {
      this.startBusy();
      const rawResponse =
          await this.service({call: 'textclassifier.classifyText', text});
      const response = JSON.parse(rawResponse);
      // response consists of start and end indice of classified texts.
      const json = JSON.stringify(
          response && response.results &&
          response.results
          .map(
              x => (x && x.entities && x.entities.length
                && (text.substring(x.startIndex, x.endIndex) + ':' +
                  x.entities.join(','))) || '')
          .join(' ') ||
          '');
      this.updateSingleton('output', {json});
      this.doneBusy();
    }
  };
});

