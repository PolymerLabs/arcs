// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
/* global defineParticle */

"use strict";

defineParticle(({DomParticle, log}) => {

  return class extends DomParticle {
    update({account, transactions, accountTransactions}, state) {
      const handle = this.handles.get('accountTransactions');
      if (handle && account && transactions) {
        if (state.accountid !== account.id) {
          state.accountid = account.id;
          accountTransactions && accountTransactions.forEach(x => handle.remove(x));
          const filtered = transactions.filter(x => x.account === account.id);
          log('filtered transactions: ', filtered.map(x => x.name));
          filtered.forEach(x => handle.store(x));
        }
      }
    }
  };

});
