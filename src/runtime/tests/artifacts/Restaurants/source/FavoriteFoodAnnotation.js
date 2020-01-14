/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle, html}) => {

  const host = `favorite-food`;

  const template = html`

<div ${host} id="{{subId}}">
  <style>
    [${host}] {
      padding: 0 16px;
    }
    [${host}] > * {
      vertical-align: middle;
    }
    [${host}] [icon-favorite] {
      color: #1A73E8;
      font-size: 14px;
    }
    [${host}] [label] {
      color: #1A73E8;
      font-family: 'Google Sans';
      font-size: 14px;
      margin-left: 8px;
    }
  </style>

  <div>{{haveFavoriteFood}}</div>

  <template have-favorite-food>
    <div>
      <icon icon-favorite>favorite</icon>
      <span label>They have your favorite food <b>{{food}}</b>!</span>
    </div>
  </template>

</div>

    `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return props.restaurants && props.food;
    }
    render(props, state) {
      const list = props.restaurants;
      const food = props.food && props.food.food || '';
      return {
        items: list.map(restaurant => this._renderHaveFood(restaurant, food))
      };
    }
    _renderHaveFood(restaurant, food) {
      const restaurantId = restaurant.id;
      const restaurantName = restaurant.name || '';

      // Totally ridiculous heuristic:
      // They have food if first letters in name match first letter of food.
      const firstLetter = restaurantName.toLowerCase().split(' ').map(w => w.substr(0, 1));
      const haveFood = firstLetter.includes(food.toLowerCase().substr(0, 1));

      //console.log("have food", firstLetter, food, haveFood);

      return {
        subId: restaurantId,
        haveFavoriteFood: {
          $template: 'have-favorite-food',
          models: haveFood ? [{food}] : []
        }
      };
    }
  };

});
