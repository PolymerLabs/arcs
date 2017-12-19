// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {
  return class MultiplexSlotsParticle extends DomParticle {
    constructor() {
      super();
      this._handleIds = new Set();
    }
    _shouldRender(props) {
      return false;
    }

    async setViews(views) {
      let arc = await this.constructInnerArc();
      this.on(views, 'foos', 'change', async e => {
        var foosView = views.get('foos');
        var foosList = await foosView.toList();
        for (let [index, foo] of foosList.entries()) {
          if (this._handleIds.has(foo.id)) {
            // The element already exists.
            continue;
          }
          let fooView = await arc.createHandle(foosView.type.primitiveType(), "foo" + index);
          this._handleIds.add(foo.id);
          let hostedParticle = await views.get('particle').get();
          let hostedSlotName =  [...hostedParticle.slots.keys()][0];
          let slotName = [...this.spec.slots.values()][0].name;
          let slotId = await arc.createSlot(this, slotName, hostedParticle.name, hostedSlotName);

          this.hostedSlotBySlotId.set(slotId, {subId: foo.value.replace(/ /g,'').toLowerCase()});

          var recipe = `
            schema Foo
              optional
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
  }
});
