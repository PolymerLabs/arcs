// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {
  let template = `
<style>
  [list-view] {
    border: 1px solid silver;
    padding: 4px;
  }
  [list-view] [header] {
    color: white;
    background-color: #00897B;
    display: flex;
    align-items: center;
    padding: 8px 16px;
  }
  [list-view] [row] {
    display: flex;
    align-items: center;
    padding: 8px 16px;
  }  
  [list-view] [disc] {
    display: inline-block;
    margin-right: 16px;
    box-sizing: border-box;
    width: 32px;
    height:32px;
    border-radius:40px;
    background-color:gray;
  }
  [list-view] [icon] {
    display:inline-block;
    width:24px;
    height:24px;
    padding:4px;
    color: white;
  }
  [list-view] [icon] svg {
    fill: currentColor;
  }
</style>

<div list-view> 
  <div>
    <div header>
      <span>List</span>
    </div>
    <x-list items="{{items}}">
      <template>
        <div row>
          <span disc>
            <span icon>
              <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet"><g><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"></path></g></svg>
            </span>
          </span>
          <span>{{name}}</span>
          <div slotid$="{{itemSlotId}}"></div>
        </div>
      </template>
    </x-list>
  </div>
  <div slotid="action"></div>
  <div slotid="root"></div>
</div>

    `.trim();
  return class ListView extends DomParticle {
    get template() {
      return template;
    }
    _viewsUpdated(props) {
      // TODO(sjmiles): `props` isn't really implemented yet, only chance to get 
      // props is right here (must put render data into `state`)
      this._setState({
        // TODO(sjmiles): arcana: translates object-with-name-getter to POJO-with-name-property
        items: props.list.map(({name}, i) => {return {name, itemSlotId: `action-${i}`};})
      });
    }
    _render(props, state) {
      return {
        items: state.items
      };
    }
  };

});
