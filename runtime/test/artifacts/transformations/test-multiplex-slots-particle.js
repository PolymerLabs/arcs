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

    willReceiveProps(props) {
      this._setState({renderModel: {items: TransformationDomParticle.propsToItems(props.foos)}});
    }

    combineHostedTemplate(slotName, hostedSlotId, content) {
      if (content.template) {
        this._setState({template: content.template});
      }
    }

    async setViews(views) {
      let arc = await this.constructInnerArc();
      this.on(views, 'foos', 'change', async e => {
        this._handlesToProps(views, this.config);

        let foosView = views.get('foos');
        let foosList = await foosView.toList();
        for (let [index, foo] of foosList.entries()) {
          if (this._handleIds.has(foo.id)) {
            // The element already exists.
            continue;
          }
          let fooView = await arc.createHandle(foosView.type.primitiveType(), 'foo' + index);
          this._handleIds.add(foo.id);
          let hostedParticle = await views.get('particle').get();
          let hostedSlotName = [...hostedParticle.slots.keys()][0];
          let slotName = [...this.spec.slots.values()][0].name;
          let slotId = await arc.createSlot(this, slotName, hostedParticle.name, hostedSlotName);

          let recipe = `
            schema Foo
              Text value

            particle ${hostedParticle.name} in '${hostedParticle.implFile}'
              ${hostedParticle.name}(in Foo foo)
              consume ${hostedSlotName}

            recipe
              use '${fooView._id}' as v1
              slot '${slotId}' as s1
              ${hostedParticle.name}
                foo <- v1
                consume ${hostedSlotName} as s1
          `;

          try {
            await arc.loadRecipe(recipe, this);
            fooView.set(foo);
          } catch (e) {
            console.log(e);
          }
        }
      });
    }
  };
});
