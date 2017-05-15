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

  class MultiChooser extends Particle {
    setViews(views) {
      var tmpChecked = new Set();
      this.when([new ViewChanges(views, ['choices', 'resultList'], 'change')], async e => {
        var inputList = await views.get('choices').toList();
        this.logDebug('choices', views.get('choices'));
        var outputList = await views.get('resultList').toList();

        var result = [...difference(inputList, outputList)];
        this.emit('values', result);
      });

      this.when([new StateChanges('values'), new SlotChanges()], async e => {
        if (this.states.get('values').length > 0) {
          var slot = await this.requireSlot('action');
          var content = 'Choose:<br>';
          for (var i in this.states.get('values')) {
            let value = this.states.get('values')[i];
            let eventName = `clack${i}`;
            content += `<input type='checkbox' events on-click=${eventName}>${value.name}<br>`;
            slot.clearEventHandlers(eventName);
            slot.registerEventHandler(eventName, a => { if(!tmpChecked.delete(value)) { tmpChecked.add(value); }  });
          }
          content += '<button events on-click=\'choose\'>Choose me!</button><br>';
          slot.clearEventHandlers('choose');
          slot.registerEventHandler('choose', a => {
            tmpChecked.forEach(tmp => {views.get('resultList').store(tmp)});
            tmpChecked.clear();
          });
          slot.render(content);
        } else {
          this.releaseSlot('action');
        }
      });
    }
  };
});
