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

defineParticle(({UiParticle, html, log}) => {

  return class extends UiParticle {
    update({recentEntities}, state) {
      if (recentEntities) {
        const json = this.query(recentEntities);
        this.set('suggestion', {json});
        state.person = json;
      }
    }
    render(inputs, {person}) {
      return {person};
    }
    query(entities) {
      const people = entities.filter(entity => entity.type === 'person');
      const sorted = people.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const result = sorted[0] || Object;
      return JSON.stringify(result);
    }
  };

});
