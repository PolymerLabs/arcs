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
  return class extends DomParticle {
    /**
     * Sets the 'clockData' handle to a ClockData schema object
     * containing the current time fetched from the Clock service.
     */
    async setHandles(handles) {
      const clockDataHandle = handles.get('clockData');

      const clockValue = await this.service({call: 'clock.now'});
      const clockDataEntity = new clockDataHandle.entityClass({now: clockValue});
      await clockDataHandle.set(clockDataEntity);
    }
  };
});
