/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({DomParticle, html, log}) => {

  const template = html`

<style>
  [favorite-food] {
    padding: 4px 0;
    font-size: 14px;
  }
  [row] {
    display: flex;
    align-items: center;
  }
  [icon-favorite] {
    color: #1A73E8;
    font-size: 14px;
    width: 14px;
    height: 14px;
  }
  [label] {
    color: #1A73E8;
    font-family: 'Google Sans';
    margin-left: 8px;
  }
</style>

<div favorite-food id="{{subId}}">{{items}}</div>

<template have-favorite-food>
  <div row>
    <icon icon-favorite>favorite</icon>
    <span label>They have <span>{{owner}}</span>'s favorite food <b>{{food}}</b>.</span>
  </div>
</template>

    `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    update({restaurant, foods, names}, state) {
      if (foods && names) {
        this.findFoodOwnerName(foods[0], names);
      }
      if (restaurant && foods && !state.foods) {
        this.findFoodItems(restaurant, foods);
      }
    }
    shouldRender({}, {foods}) {
      return foods && foods.length;
    }
    render({restaurant}, {foods, name}) {
      foods.forEach(food => food.owner = name);
      return {
        subId: restaurant.id,
        items: {
          $template: 'have-favorite-food',
          models: foods
        }
      };
    }
    async findFoodOwnerName(food, names) {
      if (food) {
        const results = await this.boxQuery(names, food.fromKey);
        const foodOwner = results[0];
        if (foodOwner) {
          this.state = {name: foodOwner.userName};
        }
      }
    }
    async findFoodItems(restaurant, foodShares) {
      const allFoods = await this.derefShares(foodShares);
      const foods = allFoods
        // select only foods matching this restaurant
        .filter(food => this.hasFood(restaurant.name, food.food))
        // extract POJO
        .map(food => food.dataClone())
        ;
      this.state = {foods};

    }
    hasFood(restaurant, food) {
      // Totally ridiculous heuristic: first letter in name matches first letter of food.
      const firstLetters = (restaurant || '').toLowerCase().split(' ').map(w => w.substr(0, 1));
      return firstLetters.includes((food || '').toLowerCase().substr(0, 1));
    }
  };

});