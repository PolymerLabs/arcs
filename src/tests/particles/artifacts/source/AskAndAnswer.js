/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({UiParticle, html, log}) => {

  const host = `ask-and-answer`;
  const colors = {question: 'red', answer: 'green'};

  return class extends UiParticle {
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
        const templates = {};
        ['A', 'B', 'C', 'D', 'E'].forEach(subid => templates[`default${subid}`] = `<span>Hint ${subid}</span>`);
        return templates;
      }

      console.error(`Unsupported slot ${slotName}`);
    }
    getTemplateName(slotName) {
      if (slotName == 'hints') {
        const templateNames = {};
        ['A', 'B', 'C', 'D', 'E'].forEach(subid => templateNames[subid] = `default${subid}`);
        return templateNames;
      }
      return super.getTemplateName(slotName);
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
            log(`Error: unexpected slot name ${this.currentSlotName}`);
        }
      }
    }
  };
});
