/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({SimpleParticle, html, resolver}) => {

  const notoPath = `/../../../particles/Profile/assets/noto-emoji-128/emoji_u`;
  const allFoods = {
    Hotdogs: '1f32d',
    Tacos: '1f32e',
    Corn: '1f33d',
    Rice: '1f35a',
    Udon: '1f35c',
    Spaghetti: '1f35d',
    Bread: '1f35e',
    Fries: '1f35f',
    Cookies: '1f36a',
    Chocolate: '1f36b',
    Flan: '1f36e',
    Beer: '1f37a',
    Burrito: '1f32f',
    Popcorn: '1f37f',
    Tomato: '1f345',
    Eggplant: '1f346',
    Watermelon: '1f349',
    Hamburger: '1f354',
    Pizza: '1f355',
    Beef: '1f356',
    Chicken: '1f357',
    Sushi: '1f363',
    Icecream: '1f368',
    Donuts: '1f369',
    Bento: '1f371',
    Eggs: '1f373',
  };

  const template = html`

<style>
  [favorite-food-picker] {
    padding: 24px;
    text-align: center;
  }
  [foods] {
    display: inline-block;
  }
  [foods] > div {
    display: inline-block;
    width: 88px;
    height: 88px;
    padding: 16px;
    color: silver;
    border-radius: 16px;
    text-align: center;
    transition: all 100ms ease-in;
  }
  [foods] > div[selected] {
    background: #eeeeee;
    color: gray;
  }
  [foods] > div > * {
    display: block;
  }
  [foods] > div img {
    display: block;
    width: 64px;
    margin: 0 auto 16px;
  }
</style>

<div favorite-food-picker>
  <div selector>My Favorite Foods</div>
  <div foods>{{foods}}</div>
  <template foodTemplate>
    <div value="{{name}}" selected$="{{selected}}" on-click="onSelectFood">
      <img src="{{src}}">
      <div>{{name}}</div>
    </div>
  </template>
</div>

    `.trim();

  const nar = [];

  return class extends SimpleParticle {
    get template() {
      return template;
    }
    render({foods}) {
      const root = resolver('FavoriteFoodPicker');
      const models = Object.keys(allFoods).map(name => {
        return {
          name,
          src: `${root}${notoPath}${allFoods[name]}.png`,
          selected: Boolean(this.likesFood(foods, name))
        };
      });
      return {
        foods: {$template: 'foodTemplate', models}
      };
    }
    onSelectFood(e) {
      const name = e.data.value;
      const food = this.likesFood(this.props.foods, name);
      const foodsHandle = this.handles.get('foods');
      if (food) {
        foodsHandle.remove(food);
      } else {
        foodsHandle.add(new foodsHandle.entityClass({food: name}));
      }
    }
    likesFood(foods, name) {
      return (foods || nar).find(({food}) => food === name);
    }
  };

});
