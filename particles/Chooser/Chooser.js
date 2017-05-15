// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

(({particle: {Particle, ViewChanges, StateChanges, SlotChanges}}) => {

  function difference(a, b) {
    var result = new Map();
    a.forEach(value => result.set(JSON.stringify(value.name), value));
    b.map(a => JSON.stringify(a.name)).forEach(value => result.delete(value));
    return result.values()
  }

  return class Chooser extends Particle {
    setViews(views) {
      this.when([new ViewChanges(views, ['choices', 'resultList'], 'change')], async e => {
        var inputList = await views.get('choices').toList();
        var outputList = await views.get('resultList').toList();
        var result = [...difference(inputList, outputList)];
        this.emit('values', result);
      });
      this.when([new StateChanges('values'), new SlotChanges()], async e => {
        let slotName = 'action';
        let model = this._buildViewModel(views);
        if (!model) {
          this.releaseSlot(slotName);
        } else {
          let slot = await this.requireSlot(slotName);
          this._render(slot, model);
        }
      });
    }
    _buildViewModel(views) {
      let values = this.states.get('values');
      if (values.length) {
        return {
          values,
          chooseValue: event => views.get('resultList').store(values[event.data.key])
        };
      }
    }
    _render(slot, model) {
      let html = `
<div style="border: 1px solid silver; padding: 4px;">
  <div>
    <div style="color: white; background-color: #00897B; display: flex; align-items: center; padding: 8px 16px;">
      <span>Recommendations based on Claire's Wishlist</span>
    </div>
    ${model.values.map((value, i)=>
    `<div row style="display: flex; align-items: center; padding: 8px 16px;">
      <span style="display:inline-block;margin-right:16px;box-sizing:border-box;width:32px;height:32px;border-radius:40px;background-color:gray;">
        <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" style="pointer-events: none; display: block; width: 100%; height: 100%;"><g><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"></path></g></svg>
      </span>
      <span style="flex:1;">${value.name}</span>
      <button events key="${i}" on-click="chooseValue">Add</button>
    </div>`
    ).join('')}
  </div>
  <!-- remove XXX to destroy the universe (recursively and infinitely install chooser into chooser)-->
  <div slotidXXX="action"></div>
</div>
      `.trim();
      slot.render(html);
      // TODO(sjmiles): experimenting with automatic event setup
      this._listen(slot, model, this._findHandlerNames(html));
    }
    _listen(slot, model, handlers) {
      handlers.forEach(name => {
        //console.log('eventHandler: ', name);
        slot.clearEventHandlers(name);
        slot.registerEventHandler(name, model[name]);
      });
    }
    _findHandlerNames(html) {
      let handlers = new Map();
      let m;
      let re = /on-.*?=\"([^\"]*)"/gmi;
      while ((m = re.exec(html)) !== null) {
        handlers.set(m[1], true);
      }
      return Array.from(handlers.keys());
    }
  };

});
