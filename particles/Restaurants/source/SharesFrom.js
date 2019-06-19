/**
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
    update({shares, names}) {
      log(shares, names);
      this.updateDescription(shares && shares[0], names);
    }
    async updateDescription(share, names) {
      let desc = `(no info)`;
      if (share && names) {
        log(this.dataClone(share));
        const key = share.fromKey;
        const name = (await this.boxQuery(names, key))[0];
        if (name) {
          //this.updateSingleton('from', name);
          desc = name.userName;
        } else {
          log(`couldn't find [${key}] in`, names.forEach(item => item.fromKey));
        }
      }
      this.setParticleDescription(desc);
    }
  };

});
