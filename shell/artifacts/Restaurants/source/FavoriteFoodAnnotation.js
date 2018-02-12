// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let host = `favorite-food`;
  let template = `

<style>
  [${host}] {
    padding: 6px 0;
    text-align: center;
  }
  [${host}] > * {
    vertical-align: middle;
    padding: 6px 0;
  }
</style>

<div ${host} id={{subId}}>{{haveFavoriteFood}}</div>

<template have-favorite-food>
  <span>They have your favorite food <b>{{food}}</b>!</span>
</template>

    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _shouldRender(props) {
      return props.restaurants && props.food;
    }
    _render(props, state) {
      const list = props.restaurants;
      const food = props.food && props.food.food || '';
      return {
        items: list.map(restaurant => this._renderHaveFood(restaurant, food))
      };
    }
    _renderHaveFood(restaurant, food) {
      const restaurantId = restaurant.id;
      const restaurantName = restaurant.name || "";

      // Totally ridiculous heuristic:
      // They have food if first letters in name match first letter of food.
      const firstLetter = restaurantName.toLowerCase().split(' ').map(w => w.substr(0, 1));
      const haveFood = firstLetter.includes(food.toLowerCase().substr(0, 1));

      //console.log("have food", firstLetter, food, haveFood);

      return {
        subId: restaurantId,
        haveFavoriteFood: {
          $template: 'have-favorite-food',
          models: haveFood ? [{ food }] : []
        }
      };
    }
  };

});
