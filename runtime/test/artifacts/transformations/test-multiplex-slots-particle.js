// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({TransformationDomParticle}) => {
  return class MultiplexSlotsParticle extends TransformationDomParticle {
    constructor() {
      super();
      this._handleIds = new Set();
    }

    combineHostedTemplate(slotName, hostedSlotId, content) {
      if (content.template) {
        this._setState({template: content.template});
      }
    }

    async setHandles(handles) {
      let arc = await this.constructInnerArc();
      let hostedParticle = await handles.get('particle').get();

      this.setState({arc, hostedParticle, type: handles.get('foos').type});

      super.setHandles(handles);
    }

    async willReceiveProps({foos}) {
      let arc = this._state.arc;
      let hostedParticle = this._state.hostedParticle;
      let type = this._state.type;
      for (let [index, foo] of foos.entries()) {
        if (this._handleIds.has(foo.id)) {
          // The element already exists.
          continue;
        }
        let fooHandle = await arc.createHandle(type.primitiveType(), 'foo' + index);
        this._handleIds.add(foo.id);
        let hostedSlotName = [...hostedParticle.slots.keys()][0];
        let slotName = [...this.spec.slots.values()][0].name;
        let slotId = await arc.createSlot(this, slotName, hostedParticle.name, hostedSlotName);
        let recipe = `
          schema Foo
            Text value

          particle ${hostedParticle.name} in '${hostedParticle.implFile}'
            in Foo foo
            consume ${hostedSlotName}

          recipe
            use '${fooHandle._id}' as handle1
            slot '${slotId}' as slot1
            ${hostedParticle.name}
              foo <- handle1
              consume ${hostedSlotName} as slot1
        `;

        try {
          await arc.loadRecipe(recipe, this);
          fooHandle.set(foo);
        } catch (e) {
          console.log(e);
        }
      }

      this._setState({renderModel: {items: TransformationDomParticle.propsToItems(foos)}});
    }
  };
});
