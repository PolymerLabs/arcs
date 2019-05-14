/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, log, html, resolver}) => {

  // TODO(sjmiles): es6 `import` not supported yet in workers, `import_` is an MVP attempt
  // to model `import` using `importScripts`

  // `namespace` is a global that should be valued after importing the script
  // `path` is absolute, or relative to this module
  const import_ = (namespace, path) => {
    if (typeof self[namespace] === 'undefined') {
      importScripts(resolver(`$here/${path}`));
    }
    return self[namespace];
  };

  // import our Tf proxy-to-service
  const Tf = import_('Tf', '../../lib/tf.js');

  const template = html`

<div style="padding: 8px;">
  <h2>TensorFlowJS Linear Regression</h2>
  <h4>training (<span>{{fits}}</span> calls to .fit)</h4>
  <pre>{{training}}</pre>
  <h4>inputs</h4>
  <pre>{{query}}</pre>
  <h4>outputs</h4>
  <pre>{{outputs}}</pre>
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    update({}, state) {
      if (!state.run) {
        state.run = true;
        state.training = [
          [1, 1],
          [2, 3],
          [3, 5],
          [4, 7],
        ];
        state.query = 5;
        state.fits = 100;
        this.run(state);
      }
    }
    async run({training, query, fits}) {
      const tf = new Tf(this);
      const model = await tf.sequential();
      const response = await tf.linearRegression(model, training, fits, query);
      tf.dispose(model);
      this.setState({response});
    }
    render({}, {training, query, fits, response}) {
      return {
        training: JSON.stringify(training),
        query,
        fits,
        outputs: response || 'training...'
      };
    }
  };

});
