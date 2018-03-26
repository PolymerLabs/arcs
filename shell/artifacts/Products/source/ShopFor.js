/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, resolver}) => {

  const host = `[chooser]`;

  const productStyles = `
    <style>
      ${host} > x-list [row] {
        display: flex;
        align-items: center;
      }
      ${host} > x-list [col0] {
        flex: 1;
        overflow: hidden;
        line-height: 115%;
      }
      ${host} > x-list [col0] > * {
      }
      ${host} > x-list [col1] {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 148px;
        height: 128px;
        box-sizing: border-box;
        text-align: center;
        background-size: contain;
      }
      ${host} > x-list [col1] > img {
        max-width: 128px;
        max-height: 96px;
      }
      ${host} > x-list [name] {
        font-size: 0.95em;
      }
      ${host} > x-list [category] {
        font-size: 0.7em;
        color: #cccccc;
      }
      ${host} > x-list [price] {
        color: #333333;
      }
      ${host} > x-list [seller] {
        font-size: 0.8em;
        color: #cccccc;
      }
    </style>
      `;

    let styles = `
<style>
  ${host} {
    padding: 0 16px;
    margin-top: 16px;
    background-color: #f4f4f4;
    border-top: 4px solid silver;
  }
  ${host} [head] {
    /*display: flex;
    align-items: center;*/
    padding: 16px 0;
    color: #555555;
    font-size: 0.8em;
  }
  ${host} button {
    padding: 4px 12px;
    border-radius: 16px;
    border: 1px solid silver;
    font-size: 0.75em;
    margin-top: 6px;
    outline: none;
  }
  ${host} [item] {
    padding: 4px 8px;
    background-color: white;
    border-bottom: 8px solid #eeeeee;
  }
</style>
  `;

  let productTemplate = `
<template>
  <div item>
    <div row>
      <div col0>
        <div name title="{{name}}">{{name}}</div>
        <div category>{{category}}</div>
        <div price>{{price}}</div>
        <div seller>{{seller}}</div>
        <div><button events key="{{index}}" on-click="_onChooseValue">{{action}}</button></div>
      </div>
      <div col1>
        <img src="{{image}}">
      </div>
    </div>
    <div slotid="annotation" subid="{{subId}}">
  </div>
</template>
  `;

  let template = `
${styles}
${productStyles}
<p>Shopping for <span>{{person}}</span>'s <span>{{occasion}}</span> on <span>{{occasionDate}}</span>.</p>
<p>Desired delivery date: <input type="date" value="{{shipDate}}" on-change="_onChangeDelivery"></p>
<div chooser>
  <x-list items="{{items}}">
    ${productTemplate}
  </x-list>
</div>
    `.trim();

  return class ShopFor extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return props.choices && props.choices.length
    }
    render(props, state) {
      let model = {
        items: props.choices.map(({rawData, id}, index) => {
          return Object.assign(Object.assign({}, rawData), {
            subId: id,
            image: resolver ? resolver(rawData.image) : rawData.image,
            index
          });
        }),
        person: props.person.name,
        occasion: props.person.occasion,
        occasionDate: props.person.date
      };

      const today = new Date();
      if (new Date(model.occasionDate) < today) {
        const occasionDate = today;
        occasionDate.setDate(occasionDate.getDate() + 14);
        model.occasionDate = occasionDate.toDateString();
      } else {
        model.occasionDate = new Date(model.occasionDate).toDateString();
      }

      if (!props.desiredShipping) {
        let shipDate = new Date();
        shipDate.setDate(shipDate.getDate() + 7);

        this._updateDesiredShipping(shipDate);
        model.shipDate = shipDate.toISOString().slice(0, 10);
      } else {
        const shipDate = new Date(props.desiredShipping.desiredShippingDate);
        model.shipDate = shipDate.toISOString().slice(0, 10);
      }

      for (let product of model.items) {
        const isInBasket = props.basket.find(basketProduct => product.name == basketProduct.name);
        const action = isInBasket ? 'Added' : 'Add';
        product.action = action;
      }

      return model;
    }
    _onChooseValue(e, state) {
      const choice = this._props.choices[e.data.key];
      const selected = this._props.basket.find(basketProduct => choice.name == basketProduct.name);
      if (selected) {
        this._views.get('basket').remove(selected);
      } else {
        this._views.get('basket').store(choice);
      }
    }
    _onChangeDelivery(e, state) {
      const shipDate = new Date(e.data.value+'T00:00:00');
      this._updateDesiredShipping(shipDate);
    }
    _updateDesiredShipping(desiredShippingDate) {
      const shippingView = this._views.get('desiredShipping');
      const DesiredShipping = shippingView.entityClass;
      shippingView.set(new DesiredShipping({desiredShippingDate: desiredShippingDate.toISOString()}));
    }
  };
});

