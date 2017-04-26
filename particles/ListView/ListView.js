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

var Particle = require("../../runtime/particle.js").Particle;
var tracing = require("../../tracelib/trace.js");

class ListView extends Particle {
  setViews(views) {
    // TODO(sjmiles): code to test slot dynamics
    /*
    setTimeout(() => {
      this.releaseSlot('root');
      setTimeout(() => {
        this._renderViews(views);
      }, 2000);
    }, 3000);
    */
    this.on(views, 'list', 'change', async e => {
      this._renderViews(views);
    });
  }
  async _renderViews(views) {
    var inputList = await views.get('list').toList();
    if (inputList.length > 0) {
      let names = inputList.map(entity => entity.data.name);
      // say that I need an 'root' slot to continue
      var slot = await this.requireSlot('root');
      slot.render(`
<div style="border: 1px solid silver; padding: 4px;">    
${names.join('<br>')}
<div slotid="action" style="border: 1px solid gray; padding: 2px;"></div>
</div>
      `.trim());
    } else {
      this.releaseSlot('root');
    }
  }
}

module.exports = ListView;
