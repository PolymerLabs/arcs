/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import IconStyles from '../../modalities/dom/components/icons.css.js';
import {Template} from '../../modalities/dom/components/xen/xen-template.js';
import {assert} from '../platform/assert-web.js';

import {Arc} from './arc.js';
import {SlotConnection} from './recipe/slot-connection.js';
import {SlotConsumer, Content, Rendering} from './slot-consumer.js';
import {ProvidedSlotContext} from './slot-context.js';

export interface DomRendering extends Rendering {
  liveDom?: Template;
}

const templateByName = new Map();

// this style sheet is installed in every particle shadow-root
let commonStyleTemplate;

export class SlotDomConsumer extends SlotConsumer {
  private readonly _observer: MutationObserver;

  constructor(arc: Arc, consumeConn?: SlotConnection, containerKind?: string) {
    super(arc, consumeConn, containerKind);

    this._observer = this._initMutationObserver();
  }

  constructRenderRequest(): string[] {
    const request = ['model'];
    const prefixes = [this.templatePrefix];
    if (!SlotDomConsumer.hasTemplate(prefixes.join('::'))) {
      request.push('template');
    }
    return request;
  }

  static hasTemplate(templatePrefix) {
    return [...templateByName.keys()].find(key => key.startsWith(templatePrefix));
  }

  isSameContainer(container, contextContainer) {
    return container.parentNode === contextContainer;
  }

  createNewContainer(contextContainer, subId) {
    assert(contextContainer, 'contextContainer cannot be null');
    const newContainer = document.createElement(this.containerKind || 'div');
    if (this.consumeConn) {
      newContainer.setAttribute('particle-host', this.consumeConn.getQualifiedName());
    }
    contextContainer.appendChild(newContainer);
    //return newContainer;

    // TODO(sjmiles): introduce tree scope
    newContainer.attachShadow({mode: `open`});
    return newContainer.shadowRoot;
  }

  deleteContainer(container) {
    // step out of shadowDOM if container is a shadowRoot
    container = container.host || container;
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }

  formatContent(content: Content, subId: string): Content | undefined {
    assert(this.slotContext instanceof ProvidedSlotContext, 'Content formatting can only be done for provided SlotContext');
    const contextSpec = (this.slotContext as ProvidedSlotContext).spec;
    const newContent: Content = {};

    // Format model.
    if (Object.keys(content).indexOf('model') >= 0) {
      if (content.model) {

        let formattedModel;
        if (contextSpec.isSet && this.consumeConn.getSlotSpec().isSet) {
          formattedModel = this._modelForSetSlotConsumedAsSetSlot(content.model, subId);
        } else if (contextSpec.isSet && !this.consumeConn.getSlotSpec().isSet) {
          formattedModel = this._modelForSetSlotConsumedAsSingletonSlot(content.model, subId);
        } else {
          formattedModel = this._modelForSingletonSlot(content.model, subId);
        }
        if (!formattedModel) return undefined;

        // Merge descriptions into model.
        newContent.model = {...formattedModel, ...content.descriptions};
      } else {
        newContent.model = undefined;
      }
    }

    // Format template name and template.
    if (content.templateName) {
      newContent.templateName = typeof content.templateName === 'string' ? content.templateName : content.templateName[subId];
      if (content.template) {
        newContent.template = typeof content.template === 'string' ? content.template : content.template[newContent.templateName as string];
      }
    }

    return newContent;
  }

  _modelForSingletonSlot(model, subId) {
    assert(!subId, 'subId should be absent for a Singleton Slot');
    return model;
  }

  _modelForSetSlotConsumedAsSetSlot(model, subId) {
    assert(model.items && model.items.every(item => item.subId),
        'model for a Set Slot consumed as a Set Slot needs to have items array, with every element having subId');
    return model.items.find(item => item.subId === subId);
  }

  _modelForSetSlotConsumedAsSingletonSlot(model, subId) {
    assert(model.subId, 'model for a Set Slot consumed as a Singleton Slot needs to have subId');
    return subId === model.subId ? model : null;
  }

  setContainerContent(rendering: DomRendering, content: Content, subId) {
    if (!rendering.container) {
      return;
    }

    if (!content || Object.keys(content).length === 0) {
      this.clearContainer(rendering);
      rendering.model = null;
      return;
    }

    this._setTemplate(rendering, this.templatePrefix, content.templateName, content.template);
    rendering.model = content.model;

    this._onUpdate(rendering);
  }

  clearContainer(rendering: DomRendering) {
    if (rendering.liveDom) {
      rendering.liveDom.root.textContent = '';
    }
    rendering.liveDom = null;
  }

  dispose() {
    if (this._observer) {
      this._observer.disconnect();
    }

    this.renderings.forEach(([subId, {container}]) => this.deleteContainer(container));
  }

  static clear(container) {
    container.textContent = '';
  }

  static clearCache() {
    templateByName.clear();
  }

  static findRootContainers(topContainer) {
    const containerBySlotId = {};
    Array.from(topContainer.querySelectorAll('[slotid]')).forEach(container => {
      //assert(this.isDirectInnerSlot(container), 'Unexpected inner slot');
      const slotId = (container as HTMLElement).getAttribute('slotid');
      assert(!containerBySlotId[slotId], `Duplicate root slot ${slotId}`);
      containerBySlotId[slotId] = container;
    });
    return containerBySlotId;
  }

  createTemplateElement(template) {
    return Object.assign(document.createElement('template'), {innerHTML: template});
  }

  get templatePrefix() {
    return this.consumeConn.getQualifiedName();
  }

  _setTemplate(rendering: DomRendering, templatePrefix, templateName, template) {
    if (templateName) {
      rendering.templateName = [templatePrefix, templateName].filter(s => s).join('::');
      if (template) {
        if (templateByName.has(rendering.templateName)) {
          // TODO: check whether the new template is different from the one that was previously used.
          // Template is being replaced.
          this.clearContainer(rendering);
        }
        templateByName.set(rendering.templateName, this.createTemplateElement(template));
      }
    }
  }

  _onUpdate(rendering: DomRendering) {
    this._observe(rendering.container);

    if (rendering.templateName) {
      const template = templateByName.get(rendering.templateName);
      assert(template, `No template for ${rendering.templateName}`);
      this._stampTemplate(rendering, template);
    }

    this._updateModel(rendering);
  }

  _observe(container) {
    assert(container, 'Cannot observe without a container');
    if (this._observer) {
      this._observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['subid']
      });
    }
  }

  _stampTemplate(rendering: DomRendering, template) {
    if (!rendering.liveDom) {
      // TODO(sjmiles): normally I would create this template as part of module startup,
      // but this file is node-test-dependency, and `createTemplate` requires `document`
      // see https://github.com/PolymerLabs/arcs/issues/2827
      if (!commonStyleTemplate) {
        commonStyleTemplate = Template.createTemplate(`<style>${IconStyles}</style>`);
      }
      // provision common stylesheet
      Template.stamp(commonStyleTemplate).appendTo(rendering.container);
      const mapper = this._eventMapper.bind(this, this.eventHandler);
      rendering.liveDom = Template
          .stamp(template)
          .events(mapper)
          .appendTo(rendering.container)
          ;
    }
  }

  _eventMapper(eventHandler, node, eventName, handlerName) {
    node.addEventListener(eventName, event => {
      // TODO(sjmiles): we have an extremely minimalist approach to events here, this is useful IMO for
      // finding the smallest set of features that we are going to need.
      // First problem: click event firing multiple times as it bubbles up the tree, minimalist solution
      // is to enforce a 'first listener' rule by executing `stopPropagation`.
      event.stopPropagation();
      // TODO(sjmiles): affordance for forwarded events (events produced by a template that is lexically
      // scoped to the mapped template [e.g. dom-repeater])
      if (eventName === 'xen:forward') {
        node = event.detail.target;
        handlerName = event.detail.handlerName;
      }
      // collate keyboard information
      const {altKey, ctrlKey, metaKey, shiftKey, code, key, repeat} = event;
      const detail = {
        // TODO(sjmiles): `key` is a data-key (as in key-value pair), may be confusing vs keyboard `keys`
        key: node.key,
        value: node.value,
        keys: {altKey, ctrlKey, metaKey, shiftKey, code, key, repeat}
      };
      eventHandler({
        detail,
        handler: handlerName,
        // TODO(sjmiles): deprecated
        data: detail
      });
    });
  }

  _updateModel(rendering: DomRendering) {
    if (rendering.liveDom) {
      rendering.liveDom.set(rendering.model);
    }
  }

  initInnerContainers(container) {
    Array.from(container.querySelectorAll('[slotid]')).forEach(innerContainer => {
      if (!this.isDirectInnerSlot(container, innerContainer)) {
        // Skip inner slots of an inner slot of the given slot.
        return;
      }
      const slotId = this.getNodeValue(innerContainer, 'slotid');
      const providedContext = this.findProvidedContext(ctx => ctx.id === slotId);
      if (!providedContext) {
        console.warn(`Slot ${this.consumeConn.getSlotSpec().name} has unexpected inner slot ${slotId}`);
        return;
      }
      const subId = this.getNodeValue(innerContainer, 'subid');
      assert(Boolean(subId) === providedContext.spec.isSet,
        `Sub-id ${subId} for slot ${providedContext.name} doesn't match set spec: ${providedContext.spec.isSet}`);
      providedContext.sourceSlotConsumer._initInnerSlotContainer(slotId, subId, innerContainer);
    });
  }

  // get a value from node that could be an attribute, if not a property
  getNodeValue(node, name) {
    // TODO(sjmiles): remember that attribute names from HTML are lower-case
    return node[name] || node.getAttribute(name);
  }

  isDirectInnerSlot(container, innerContainer) {
    if (innerContainer === container) {
      return true;
    }
    const parentOf = elt => elt.parentNode;
    let parentNode = parentOf(innerContainer);
    while (parentNode) {
      if (parentNode === container) {
        return true;
      }
      // only some HTMLNodes have `getAttribute` (i.e. HTMLElement)
      if (parentNode.getAttribute && parentNode.getAttribute('slotid')) {
        // this is an inner slot of an inner slot.
        return false;
      }
      parentNode = parentOf(parentNode);
    }
    // innerContainer won't be a child node of container if the method is triggered
    // by mutation observer record and innerContainer was removed.
    return false;
  }

  _initMutationObserver(): MutationObserver|null {
    if (this.consumeConn) {
      return new MutationObserver(async (records) => {
        this._observer.disconnect();

        const updateContainersBySubId = new Map();
        for (const [subId, {container}] of this.renderings) {
          if (records.some(r => this.isDirectInnerSlot(container, r.target))) {
            updateContainersBySubId.set(subId, container);
          }
        }
        const containers = [...updateContainersBySubId.values()];
        if (containers.length > 0) {
          this._clearInnerSlotContainers([...updateContainersBySubId.keys()]);
          containers.forEach(container => this.initInnerContainers(container));
          this.updateProvidedContexts();

          // Reactivate the observer.
          containers.forEach(container => this._observe(container));
        }
      });
    }
    return null;
  }

  formatHostedContent(content: Content): {} {
    if (content.templateName) {
      if (typeof content.templateName === 'string') {
        content.templateName = `${this.consumeConn.getQualifiedName()}::${content.templateName}`;
      } else {
        // TODO(mmandlis): add support for hosted particle rendering set slot.
        throw new Error('TODO: Implement this!');
      }
    }
    return content;
  }
}
