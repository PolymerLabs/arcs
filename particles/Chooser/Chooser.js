/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

var { Particle, ViewChanges, StateChanges, SlotChanges } = require("../../runtime/particle.js");
var tracing = require("../../tracelib/trace.js");

function difference(a, b) {
  var result = new Map();
  a.forEach(value => result.set(JSON.stringify(value.data), value));
  b.map(a => JSON.stringify(a.data)).forEach(value => result.delete(value));
  return result.values();
}

class Chooser extends Particle {
  setViews(views) {
    this.when([new ViewChanges(views, ['choices', 'resultList'], 'change')], async e => {
      var inputList = await views.get('choices').toList();
      var outputList = await views.get('resultList').toList();

      var result = [...difference(inputList, outputList)];
      this.emit('values', result);
    });

    this.when([new StateChanges('values'), new SlotChanges()], async e => {
      if (this.states.get('values').length > 0) {
        var slot = await this.requireSlot('action');
        slot.render(this.states.get('values')[0].data.name + '<button events on-click=clack>CLICK ME YO</button>');
        slot.clearEventHandlers('clack');
        slot.registerEventHandler('clack', a => views.get('resultList').store(this.states.get('values')[0]));        
        if (inputList.length > 0) {
          // say that I need an 'action' slot to continue
          var slot = await this.requireSlot('action'); // vs. this.whenSlot('action')
          let names = inputList.map(entity => entity.data.name);
          slot.render(`
<div>
Choose one:<br>
  <div style="padding-left: 12px">
  ${names.join('<br>')}
  </div>
</div>
        `.trim());
      } else {
        this.releaseSlot('action');
      }
    });
  }
}

module.exports = Chooser;
