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
    return result.values();
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
        let values = this.states.get('values');
        if (values.length <= 0) {
          this.releaseSlot('action');
        } else {
          let slot = await this.requireSlot('action');
          this._render(slot, {
            values,
            chooseValue: event => views.get('resultList').store(values[event.data.key])
          });
        }
      });
    }
    _render(slot, model) {
      let html = 'Choose:<br>';
      html = model.values.reduce((html, value, i) => {
        return `${html}${value.name} <button events key="${i}" on-click="chooseValue">Choose me!</button><br>`;
      }, html);
      slot.render(html);
      // TODO(sjmiles): experimenting with automatic event setup
      // _listen and _findHandlerNames are tentative    
      //this._listen(slot, model, 'chooseValue');
      this._listen(slot, model, this._findHandlerNames(html));
    }
    _listen(slot, model, handlers) {
      handlers.forEach(name => {
        console.log('eventHandler: ', name);
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
