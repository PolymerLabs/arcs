/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Xen} from './components/xen.js';
import IconStyles from './modalities/dom/components/icons.css.js';
import {logsFactory} from '../../build/platform/logs-factory.js';

const {log} = logsFactory('Renderer', 'tomato');

const slotId = id => `[slotid="${queryId(id)}"]`;
const queryId = id => `${id.replace(/[:!]/g, '_')}`;

export const SlotObserver = class {
  constructor(root) {
    this.root = root;
    this.pendingSlots = [];
  }
  dispose() {
    this.disposeParticleOutput();
  }
  disposeParticleOutput() {
    this.root.querySelectorAll(':host > [slotid]').forEach(n => n.innerText = '');
  }
  observe(slot) {
    this.render(slot);
  }
  render(slot) {
    if (typeof slot === 'string') {
      slot = JSON.parse(slot);
    }
    // capture the slot, even if we can't process it yet, only keep the latest slot info per outputId
    const i = this.pendingSlots.findIndex(s => s.outputSlotId === slot.outputSlotId);
    if (i >= 0) {
      this.pendingSlots[i] = slot;
    } else {
      this.pendingSlots.unshift(slot);
    }
    // begin processing slots, unless we are already
    this.processSlots();
  }
  async processSlots() {
    // `renderSlots` is async, so prevent re-entrancy
    if (!this.processSlots.working) {
      this.processSlots.working = true;
      try {
        await this.renderSlots();
      } finally {
        this.processSlots.working = false;
        log('pendingSlots:', this.pendingSlots.length);
        //if (!this.pendingSlots.length) {
        //  log('ALL slots rendered');
        //}
        //if (this.pendingSlots.length) {
        //  log('SLOTS remaining after one pass:', this.pendingSlots.length);
        //}
      }
    }
  }
  async renderSlots() {
    // track slots that didn't render yet
    let skips;
    // if we rendered anything, we should revisit skipped slots
    let haveRendered;
    do {
      // fresh pass
      skips = [];
      haveRendered = false;
      // loop is asynchronous, more pendingSlots could have arrived while awaiting
      while (this.pendingSlots.length) {
        // process these slots
        const slots = this.pendingSlots;
        // allow new slots to enter pending state while we are rendering
        this.pendingSlots = [];
        // try to render each slot, accumulate skipped slots
        for (const slot of slots) {
          if (await this.renderSlot(slot)) {
            haveRendered = true;
          } else {
            skips.push(slot);
          }
        }
      }
      // return left-over slots to pending
      this.pendingSlots = skips;
    // perform another pass if we rendered something and there are still pending slots
    } while (haveRendered && skips.length);
    // pendingSlots will not be empty if none of them will render yet
  }
  async renderSlot(slot) {
    let success;
    if (isEmptySlot(slot)) {
      // empty, just pretend it rendered
      success = true;
    } else {
      success = await this.renderXenSlot(slot);
    }
    log(`render [${slot.particle.name}]: ${success ? `ok` : `skipped`}`);
    //if (!success) {
      //groupCollapsed(`[${slot.particle.name}]: FAILED render`);
      //log(slot);
      //console.groupEnd();
    //}
    // else {
    //   log(`[${slot.particle.name}]: rendered`);
    // }
    return success;
  }
  async renderXenSlot(output) {
    const {outputSlotId, containerSlotName, containerSlotId, slotMap, content: {model}} = output;
    const root = this.root || document.body;
    let slotNode;
    const data = model || Object;
    if (containerSlotId) {
      // TODO(sjmiles):
      // muxed slots have the format [muxerSlotId___muxedSlotId]
      const delim = `___`;
      const muxerSlotId = containerSlotId.includes(delim) && containerSlotId.split(delim)[0];
      if (muxerSlotId) {
        // we use muxerSlot and subId to locate muxed nodes
        const selector = `${slotId(muxerSlotId)}[subid="${data.subid}"]`;
        slotNode = deepQuerySelector(root, selector);
        //console.warn('muxedNode:', muxedNode);
        //log('RenderEx:found multiplexed slot for', containerSlotName, data.subid);
        if (!slotNode) {
          log(`couldn't find muxed slotNode`);
          return false;
        }
      } else {
        slotNode =
          // TODO(sjmiles): memoize containerSlotId => node mappings?
          // slotId's are unique in the tree
          deepQuerySelector(root, slotId(containerSlotId))
          // use `containerSlotName` to catch root slots (not deep!)
          || containerSlotName && root.querySelector(slotId(containerSlotName))
          || root.querySelector(`#${queryId(containerSlotId)}`)
          ;
      }
      //log(rawData);
      if (slotNode && outputSlotId) {
        const domOutputSlotId = `${queryId(outputSlotId)}`;
        let node = slotNode.querySelector(`#${domOutputSlotId}`);
        if (node) {
          //log('RenderEx: using existing node', outputSlotId);
        } else {
          //log('RenderEx: found no node in the container, making one', outputSlotId);
          const dispatcher = (...args) => this.dispatch(...args);
          node = stampDom(output, slotNode, domOutputSlotId, dispatcher);
        }
        if (node && node.xen) {
          let local = data;
          // TODO(sjmiles): this solution to local slot problem under multiplexer is inefficient
          if (data && data.items && data.items.models) {
            const slotModel = {};
            Object.keys(slotMap).forEach(key => {
              slotModel[`${key}_slot`] = queryId(slotMap[key]);
            });
            // `data` may be deeply frozen, so we need to create clones before modifying
            local = {...data};
            local.items = {...local.items};
            // attach the slot(Map)Model to each item
            local.items.models = local.items.models.map(
              model => Object.assign(Object.create(model), slotModel)
            );
          }
          node.xen.set(local);
        }
        return true;
      }
    }
  }
  dispatch(pid, eventlet) {
    log(`caught event [${eventlet.name}] for target [${pid}], dispatch not implemented`);
  }
};

// export const attachRenderer = (composer, containers) => {
//   return composer.slotObserver = new SlotObserver(composer.root);
// };

const isEmptySlot = ({content}) =>
  (!content.template || content.template === '') && (!content.model || !Object.keys(content.model).length);

const deepQuerySelector = (root, selector) => {
  const find = (element, selector) => {
    let result;
    while (element && !result) {
      result =
          (element.matches && element.matches(selector) ? element : null)
          || find(element.firstElementChild, selector)
          || (element.shadowRoot && find(element.shadowRoot.firstElementChild, selector))
          ;
      element = element.nextElementSibling;
    }
    return result;
  };
  return find(root || document.body, selector);
};

const stampDom = (output, slotNode, slotId, dispatch) => {
  const {content: {template}, particle: {name}, slotMap} = output;
  // create container node
  const container = slotNode.appendChild(document.createElement('div'));
  container.id = slotId;
  // just for humans
  container.setAttribute('particle', name);
  // establish shadow root
  const root = container.attachShadow({mode: `open`});
  // provision boilerplate stylesheet
  if (!stampDom.styleTemplate) {
    stampDom.styleTemplate = Xen.Template.createTemplate(`<style>${IconStyles}</style>`);
  }
  Xen.Template.stamp(stampDom.styleTemplate).appendTo(root);
  // custom annotator that takes note of `slotid` bindings so
  // we can convert slotids from local-names to global-ids
  const opts = {annotator: (node, key, notes) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const localId = node.getAttribute('slotid');
      if (localId) {
        Xen.Template.takeNote(notes, key, 'mustaches', 'slotid$', `${localId}_slot`);
        log('annotating slot: ', node.localName, localId);
        return true;
      }
    }
    return false;
  }};
  // build event controller
  const controller = {
    defaultHandler: (handler, e) => {
      const {key, value} = e.currentTarget;
      const eventlet = {name, handler, data: {key, value}};
      if (dispatch) {
        dispatch(output.particle.id, eventlet);
      }
    }
  };
  // stamp template, attach listeners, add to DOM
  container.xen = Xen.Template.stamp(template, opts).events(controller).appendTo(root);
  // install slotids
  const slotModel = {};
  Object.keys(slotMap).forEach(key => {
    slotModel[`${key}_slot`] = queryId(slotMap[key]);
  });
  container.xen.set(slotModel);
  // finished container
  return container;
};
