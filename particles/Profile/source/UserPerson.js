/*
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({DomParticle, log}) => {

  return class extends DomParticle {
    update({user, names, avatars, person}) {
      if (user) {
        const neo = person || {};
        neo.id = user.id;
        neo.location = user.location;
        if (avatars) {
          const avatar = this.boxQuery(avatars, user.id)[0];
          neo.avatar = avatar && avatar.url || '';
        }
        if (names) {
          const name = this.boxQuery(names, user.id)[0];
          neo.name = name && name.userName || '';
        }
        log(neo);
        this.updateVariable('person', neo);
      }
    }
  };

});
