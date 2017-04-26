const assert = require('assert');

SlotManager = {
  init() {
    this._content = {};
    if (global.document) {
      this._slotDom = {root: {insertion: document.body, view: undefined}};
    } else {
      this._slotDom = {root: {insertion: {}, view: undefined}};
    }
    this._targetSlots = new Map();
    this._pendingSlotRequests = {};
  },
  registerSlot(particleid, slotid, view) {
    return new Promise((resolve, reject) => {
      if (this._slotDom[slotid]) {
        resolve();
      } else {
        this._pendingSlotRequests[slotid] = resolve;
      }
    }).then(() => {
      this._targetSlots.set(particleid, { slotid, view });
    });
  },
  renderSlot(particleid, content) {
    let { slotid, view } = this._targetSlots.get(particleid);
    let slot = this._slotDom[slotid].insertion;
    let slotView = this._slotDom[slotid].view;
    assert(view == slotView);

    // TODO(sjmiles): cache the content in case the containing
    // particle re-renders
    this._content[slotid] = content;
    if (slot !== undefined) {
      slot.innerHTML = content;
      this._findSlots(particleid, slot);
    }
  },
  _findSlots(particleSpec, dom) {
    var slots;
    if (global.document) {
      slots = dom.querySelectorAll("[slotid]");
    } else {
      slots = [];
      var slot;
      var RE = /slotid="([^"]*)"/g;
      while (slot = RE.exec(dom.innerHTML)) {
        slots.push(slot[1]);
      }
    }
    Array.prototype.forEach.call(slots, slot => {
      if (global.document) {
        var slotid = slot.getAttribute('slotid');
      } else {
        var slotid = slot;
      }

      this._slotDom[slotid] = { insertion: slot, view: particleSpec.exposeMap.get(slotid) };
      if (this._content[slotid]) {
        slot.innerHTML = this._content[slotid];
        this._findSlots(slot);
      } else this._provideSlot(slotid);
    });
  },
  _provideSlot(slotid) {
    let pending = this._pendingSlotRequests[slotid];
    pending && pending();
  }
};

SlotManager.init();

module.exports = SlotManager;