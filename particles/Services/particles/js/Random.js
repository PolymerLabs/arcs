/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, log, html, resolver}) => {
  const handleName = 'randomData';

  return class extends DomParticle {
    /**
     * Sets the 'randomData' handle to a RandomData schema object
     * containing a number value fetched from the Random service.
     */
    async setHandles(handles) {
      const randomDataHandle = handles.get('randomData');

      const randomValue = await this.service({call: 'random.next'});
      const randomDataEntity = new randomDataHandle.entityClass({next: randomValue});
      await randomDataHandle.set(randomDataEntity);
    }
  };
});
