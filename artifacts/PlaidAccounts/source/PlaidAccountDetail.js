// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let host = 'plaid-account-detail';

  let template = `
<style>
  [${host}] {
    font-size: 0.9em;
    padding: 36px 16px 16px 16px;
  }
  [${host}] [section] {
    padding: 8px 8px 8px 0;
  }
  [${host}] [item] {
    border-bottom: 1px dotted silver;
    cursor: pointer;
    display: flex;
    align-items: center;
  }
  [${host}] [amount] {
    font-family: monospace;
    font-size: 1.3em;
    color: green;
  }
</style>

<div ${host}>
  <h3>{{name}}</h3>
  <div>{{accounts}}</div>
  <template transactions>
    <div item on-click="_onSelect" key="{{index}}">
      <div date section><span>{{date}}</span></div>
      <div name section style="flex: 1;"><b>{{name}}</b></div>
      <div amount section style="{{amountStyle}}"><span>{{amount}}</span></div>
    </div>
  </template>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    willReceiveProps({selected, transactions}) {
      let items = null;
      if (selected && transactions) {
        items = transactions.filter(t => t.account == selected.rawData.id).map((t, i) => {
          return {
            index: i,
            name: t.name,
            date: t.date,
            amount: Math.abs(t.amount).toFixed(2),
            amountStyle: t.amount > 0 ? 'color: #CC0000' : 'color: green'
          };
        });
      }
      this._setState({items});
    }
    shouldRender(props, state) {
      return Boolean(state.items);
    }
    render({selected}, {items}) {
      return {
        name: selected.metaName,
        accounts: {
          $template: 'transactions',
          models: items
        }
      };
    }
  };

});
