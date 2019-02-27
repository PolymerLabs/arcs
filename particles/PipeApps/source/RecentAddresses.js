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
      return html`<div slotid="assistance"></div>`;
    }
    update({recentEntities}, state) {
      if (recentEntities) {
        const address = this.query(recentEntities);
        this.updateVariable('address', {address});
      }
    }
    query(entities) {
      const addresses = entities.filter(entity => entity.rawData.type === 'address');
      const sorted = addresses.sort((a, b) => (b.rawData.timestamp || 0) - (a.rawData.timestamp || 0));
      const result = sorted[0] || Object;
      return JSON.stringify(result.rawData);
    }
  };
});
