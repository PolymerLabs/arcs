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

  const host = 'person-list';

  const template = html`
<div ${host}>
  <style>
    [${host}] [section] {
      padding: 8px;
    }
    [${host}] [item] {
      border-bottom: 1px dotted silver;
      cursor: pointer;
      display: flex;
      align-items: center;
    }
    [${host}] [balance] {
      font-size: 1.4em;
      color: green;
    }
  </style>
  <div>{{people}}</div>
  <template people>
    <div item section on-click="_onSelect" key="{{index}}">
      <div>{{name}}</div>
    </div>
  </template>
</div>
  `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    willReceiveProps(props) {
      const people = props.people.map((a, i) => {
        return {
          index: i,
          name: a.name
        };
      });
      this._setState({people});
    }
    shouldRender(props, state) {
      return Boolean(state.people);
    }
    render(props, state) {
      return {
        people: {
          $template: 'people',
          models: state.people
        }
      };
    }
  };

});
