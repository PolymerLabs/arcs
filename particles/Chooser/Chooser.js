// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({particle: {Particle, ViewChanges, StateChanges, SlotChanges}, DomParticle}) => {

  let template = `
<style>
  [chooser] {
    border: 1px solid silver; 
    padding: 4px;
  }
  [chooser] [head] {
    color: white;
    background-color: #00897B;
    display: flex;
    align-items: center;
    padding: 8px 16px;
  }
  [chooser] [row] {
    display: flex; 
    align-items: center; 
    padding: 8px 16px;
  }
  [chooser] [disc] {
    display: inline-block;
    margin-right: 16px;
    box-sizing: border-box;
    width: 32px;
    height:32px;
    border-radius:40px;
    background-color:gray;
  }
</style>

<div chooser>
  <div>
    <div head>
      <span>Recommendations based on <span>{{person}}</span>'s Wishlist</span>
    </div>
    <x-list items="{{items}}">
      <template>
        <div row>
          <span disc>
            <span style="display:inline-block;width:24px;height:24px;padding:4px;">
              <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" style="pointer-events: none; display: block; width: 100%; height: 100%;"><g><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"></path></g></svg>
            </span>
          </span>
          <span style="flex:1;">{{name}}</span>
          <button events key="{{index}}" on-click="_onChooseValue">Add</button>
        </div>
      </template>
    </x-list>
  </div>
  <!-- remove XXX to destroy the universe (recursively and infinitely install chooser into chooser)-->
  <div slotidXXX="action"></div>
</div>
    `.trim();

  return class Chooser extends DomParticle {
    get template() {
      return template;
    }
    get _watchedViews() {
      return ['choices', 'resultList'];
    }
    get _watchedStates() {
      return 'values';
    }
    get _slotName() {
      return 'action';
    }
    async _viewsUpdated(views) {
      let choices = await views.get('choices').toList();
      let resultList = await views.get('resultList').toList();
      let result = [...difference(choices, resultList)];
      this.emit('values', result);
    }
    _buildRenderModel(views) {
      let values = this.states.get('values');
      if (values.length) {
        return {
          person: 'Claire',
          values,
          items: values.map((value, index) => {return {name: value.name, index}})
        };
      }
    }
    _onChooseValue(e, model, views) {
      views.get('resultList').store(model.values[e.data.key])
    }
  };

  function difference(a, b) {
    let result = new Map();
    a.forEach(value => result.set(JSON.stringify(value.name), value));
    b.map(a => JSON.stringify(a.name)).forEach(value => result.delete(value));
    return result.values()
  }

});