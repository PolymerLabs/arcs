// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html}) => {

  let host = `ask-and-answer`;
  let colors = {question: 'red', answer: 'green'};

  return class extends DomParticle {
    getTemplate(slotName) {
      if (slotName == 'question' || slotName == 'answer') {
        return html`
<style>
  [${host}] [${slotName}] {
    color: ${colors[slotName]};
  }
</style>
<div ${host}><div ${slotName} title="{{${slotName}}}">{{${slotName}}}</div></div>
`;
      } else if (slotName == 'hints') {
        let templates = {};
        ['A', 'B', 'C', 'D', 'E'].forEach(subid => templates[subid] = `<span>Hint ${subid}</span>`);
        return templates;
      }

      console.error(`Unsupported slot ${slotName}`);
    }
    shouldRender(props) {
      return !!props.thing;
    }
    render({thing}) {
      if (thing) {
        switch (this.currentSlotName) {
          case 'question':
            return {[this.currentSlotName]: `Do you want a ${thing.name}?`};
          case 'answer':
            return {[this.currentSlotName]: `I want a ${thing.name} very much!`};
          case 'hints':
            return {items: []};
          default:
            log.error(`Unexpected slot name ${this.currentSlotName}`);
        }
      }
    }
  };
});
