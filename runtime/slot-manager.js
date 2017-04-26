SlotManager = {
  init() {
    this._content = {};
    if (global.document) {
      this._slotDom = {root: {insertion: document.body, view: undefined}};
    } else {
      this._slotDom = {root: {insertion: {}, view: undefined}};
    }
    this._targetSlots = {};
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
      this._targetSlots[particleid] = { slotid, view };
    });
  },
  renderSlot(particleid, content) {
    let { slotid, view } = this._targetSlots[particleid];
    let slot = this._slotDom[slotid].insertion;
    let slotView = this._slotDom[slotid].view;
    // TODO(shans): slot should match slotView

    // TODO(sjmiles): cache the content in case the containing
    // particle re-renders
    this._content[slotid] = content;
    if (slot !== undefined) {
      slot.innerHTML = content;
      this._findSlots(slot);
    }
  },
  _findSlots(dom) {
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
      // TODO(shans): should extract view from .. somewhere
      this._slotDom[slotid] = { insertion: slot, view: undefined };
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