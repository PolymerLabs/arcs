// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
/* global defineParticle */

"use strict";

defineParticle(({DomParticle, html, log}) => {

  const host = 'plaid-account';

  const styleSheet = html`
<style>
  [${host}] {
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 16px 8px;
  }
  [${host}] > * {
    padding-right: 8px;
  }
  [${host}] > [balance] {
    font-family: Consolas, monospace;
    font-size: 1.4em;
    color: green;
  }
</style>
  `;

  const template = html`

<div ${host}>
${styleSheet}
  <icon>{{icon}}</icon>
  <span>{{name}}</span>
  <span style="flex: 1;"></span>
  <div balance section style="{{balanceStyle}}">$<span>{{balance}}</span></div>
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender({account}) {
      return Boolean(account);
    }
    render({account}) {
      return {
        name: account.metaName,
        icon: account.type == "credit" ? `credit_card` : `account_balance`,
        balance: account.balanceCurrent,
        balanceStyle: (account.type=="credit" ? -1 : 1) * account.balanceCurrent < 0 ? 'color: #CC0000' : 'color: green'
      };
    }
  };

});
