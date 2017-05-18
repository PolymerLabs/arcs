// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({particle: {Particle, ViewChanges, StateChanges, SlotChanges}}) => {

/*
  Notes on plumbing through the PEC barrier:

  * register an incoming message
    api-channel.js::registerHandler(<msgName>, <values-spec>)
  * register an outgoing message:
    api-channel.js::registerCall(<msgName>, <values-spec>)

  Example: plumbing RenderSlot

    PECOuterPort::this.registerHandler("RenderSlot", {particle: this.Mapped, content: this.Direct});
    PECInnerPort::this.registerCall("RenderSlot", {particle: this.Mapped, content: this.Direct});

  plumbs 'RenderSlot' message which can be sent from the inner-port to
  the outer-port. `this.Mapped` indicates that `particle` object is mapped
  to/from an internal id for transmission, `this.Direct` means the object is
  serialized as is.

  Then, in inner-PEC.js::Slotlet:

    this._pec._apiPort.RenderSlot({content, particle: this._particle});

  invokes RenderSlot on `this._pec` (which must be a PECInnerPort).

  and in outer-PEC.js::OuterPEC:

    this._apiPort.onRenderSlot = ({particle, content}) => {
      this.slotManager.renderSlot(particle, content);
    };

  registers a handler for RenderSlot msg on `this._apiPort` (which must be a PECOuterPort).
*/

  function difference(a, b) {
    var result = new Map();
    a.forEach(value => result.set(JSON.stringify(value.name), value));
    b.map(a => JSON.stringify(a.name)).forEach(value => result.delete(value));
    return result.values()
  }

  class DomParticle extends Particle {
    async _renderViews(views, slotName) {
      let model = this._buildRenderModel(views);
      if (!model) {
        this.releaseSlot(slotName);
      } else {
        let html;// = this._render(model);
        let slot = await this.requireSlot(slotName);
        this._renderToSlot(slot, html, model);
        //
        this._model = model;
        this._model.views = views;
      }
    }
    _renderToSlot(slot, html, model) {
      this._initializeRender(slot);
      slot.render({
        model
      });
    }
    _initializeRender(slot) {
      if (!this._renderInitialized) {
        this._renderInitialized = true;
        slot.render({name: 'main', template: this.template});
        let handlers = this._findHandlerNames(this.template);
        handlers.forEach(name => {
          slot.clearEventHandlers(name);
          slot.registerEventHandler(name, e => {
            if (this[name]) {
              this[name](e, this._model);
            }
          });
        });
      }
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
  }

  return class Chooser extends DomParticle {
    setViews(views) {
      this.when([new ViewChanges(views, ['choices', 'resultList'], 'change')], e => {
        this._viewsUpdated(views);
      });
      this.when([new StateChanges('values'), new SlotChanges()], e => {
        this._renderViews(views, 'action');
      });
    }
    async _viewsUpdated(views) {
      let choices = await views.get('choices').toList();
      let resultList = await views.get('resultList').toList();
      let result = [...difference(choices, resultList)];
      this.emit('values', result);
    }
    get template() {
      return `
<div style="border: 1px solid silver; padding: 4px;">
  <div>
    <div style="color: white; background-color: #00897B; display: flex; align-items: center; padding: 8px 16px;">
      <span>Recommendations based on {{person}}'s Wishlist</span>
    </div>
    <template repeat><span on-click="chooseValue"></span></template>
    {{rows}}
  </div>
  <!-- remove XXX to destroy the universe (recursively and infinitely install chooser into chooser)-->
  <div slotidXXX="action"></div>
</div>
      `.trim();
    }
    _buildRenderModel(views) {
      let values = this.states.get('values');
      if (values.length) {
        return {
          person: 'Claire',
          values,
          rows: values.map((value, i)=>
            `<div row style="display: flex; align-items: center; padding: 8px 16px;">
              <span style="display:inline-block;margin-right:16px;box-sizing:border-box;width:32px;height:32px;border-radius:40px;background-color:gray;">
                <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" style="pointer-events: none; display: block; width: 100%; height: 100%;"><g><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"></path></g></svg>
              </span>
              <span style="flex:1;">${value.name}</span>
              <button events key="${i}" on-click="chooseValue">Add</button>
            </div>`
            ).join('')
        };
      }
    }
    chooseValue(e, model) {
      model.views.get('resultList').store(model.values[e.data.key])
    }
  };

});
