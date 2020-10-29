/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle, resolver, html, log}) => {

  const host = 'person-bar';

  const template = html`
<div ${host}>
  <style>
    [${host}] {
      background-color: #fbfbfb;
    }
    [${host}] div {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: right;
      padding: 8px 16px;
      cursor: pointer;
    }
    [${host}] img {
      width: 32px;
      height: 32px;
      box-sizing: content-box;
      border-radius: 50%;
      margin-right: -8px;
      position: relative;
    }
    [${host}] img:not([active]) {
      opacity: 0.8;
    }
  </style>
  <div>{{people}}</div>
  <template people>
    <img style="{{order}}" src="{{avatar}}" title="{{name}}" active$="{{active}}">
  </template>
</div>

  `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    willReceiveProps({avatars, people}) {
      if (avatars && people) {
        const count = people.length;
        people = people.map((person, i) => {
          const avatar = this.boxQuery(avatars, person.id)[0];
          return {
            index: i,
            name: person.name,
            avatar: resolver(avatar && avatar.url || 'https://$shell/assets/avatars/user.jpg'),
            //active: Boolean(person.active)
            active: Math.random()<0.9,
            order: `z-index: ${count - i}`
          };
        });
        this._setState({people});
        //setInterval(() => this.willReceiveProps(this._props), 60000);
      }
    }
    render(props, state) {
      return {
        people: {
          $template: 'people',
          models: state.people || []
        }
      };
    }
  };

});
