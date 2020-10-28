/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiTransformationParticle}) => {
  return class MultiplexSlotsParticle extends UiTransformationParticle {
    constructor() {
      super();
      this._handleIds = new Set();
    }

    combineHostedTemplate(slotName, hostedSlotId, content) {
      if (content.template) {
        this._setState({template: content.template});
      }
      this._setState({templateName: content.templateName});
    }

    async setHandles(handles) {
      const arc = await this.constructInnerArc();
      const hostedParticle = await handles.get('particle0').fetch();

      this.setState({arc, hostedParticle, type: handles.get('foos').type});

      super.setHandles(handles);
    }

    async willReceiveProps({foos}) {
      const arc = this._state.arc;
      const hostedParticle = this._state.hostedParticle;
      const type = this._state.type;
      for (const [index, foo] of foos.entries()) {
        if (this._handleIds.has(this.idFor(foo))) {
          // The element already exists.
          continue;
        }
        const fooHandle = await arc.createHandle(type.getContainedType(), 'foo' + index);
        this._handleIds.add(this.idFor(foo));
        const hostedSlotName = [...hostedParticle.slotConnections.keys()][0];
        const slotName = [...this.spec.slotConnections.values()][0].name;
        const slotId = await arc.createSlot(this, slotName);
        const recipe = `
          schema Foo
            value: Text

          particle ${hostedParticle.name} in '${hostedParticle.implFile}'
            foo: reads Foo
            ${hostedSlotName}: consumes Slot

          recipe
            handle1: use '${fooHandle._id}'
            slot1: slot '${slotId}'
            ${hostedParticle.name}
              foo: reads handle1
              ${hostedSlotName}: consumes slot1
        `;

        try {
          await arc.loadRecipe(recipe, this);
          fooHandle.set(foo);
        } catch (e) {
          console.log(e);
        }
      }

      this._setState({renderModel: {items: UiTransformationParticle.propsToItems(foos)}});
    }
  };
});
