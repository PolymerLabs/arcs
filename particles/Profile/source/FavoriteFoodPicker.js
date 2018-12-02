// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html, resolver}) => {

  const host = `favorite-food-picker`;

  const foods = {
    Hotdogs: '1f32d',
    Tacos: '1f32e',
    Burritos: '1f32f',
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
  [${host}] {
    padding: 24px;
    text-align: center;
  }
  [${host}] > [foods] {
    display: inline-block;
  }
  [${host}] > [foods] > div {
    display: inline-block;
    width: 88px;
    height: 88px;
    padding: 16px;
    color: silver;
    border-radius: 16px;
    text-align: center;
  }
  [${host}] > [foods] > div[selected] {
    background: #eeeeee;
    color: gray;
  }
  [${host}] > [foods] > div > * {
    display: block;
  }
  [${host}] > [foods] > div img {
    display: block;
    width: 64px;
    margin: 0 auto 16px;
  }
</style>

<div ${host}>
  <div selector>
    My favorite Food
  </div>
  <div foods>{{foods}}</div>
  <template foodTemplate>
    <div value="{{name}}" selected$="{{selected}}" on-click="onSelectFood">
      <img src="{{src}}">
      <div>{{name}}</div>
    </div>
  </template>
</div>

    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props, state) {
      const favorite = props.food && props.food.food;
      const path = resolver('FavoriteFoodPicker');
      const models = Object.keys(foods).map(name => {
        return {
          name: name,
          src: `${path}/../assets/noto-emoji-128/emoji_u${foods[name]}.png`,
          selected: name === favorite
        };
      });
      return {
        foods: {$template: 'foodTemplate', models}
      };
    }
    setFavoriteFood(food) {
      const foodHandle = this.handles.get('food');
      foodHandle.set(new foodHandle.entityClass({food}));
    }
    _onFavoriteFoodChanged(e, state) {
      this.setFavoriteFood(e.data.value);
    }
    onSelectFood(e) {
      this.setFavoriteFood(e.data.value);
    }
  };

});
