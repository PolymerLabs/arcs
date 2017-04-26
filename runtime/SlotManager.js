SlotManager = {
  init() {
    if (global.document) {
      this._content = {};
      this._slotDom = {root: document.body};
      this._targetSlots = {};
      this._pendingSlotRequests = {};
    }
  },
  registerSlot(particleid) {
    let slotid = particleid === 10 ? 'root' : 'action';
    return new Promise((resolve, reject) => {
      if (this._slotDom[slotid]) {
        resolve();
      } else {
        this._pendingSlotRequests[slotid] = resolve;
      }
    }).then(() => {
      this._targetSlots[particleid] = slotid;
    });
  },
  renderSlot(particleid, content) {
    if (global.document) {
      let slotid = this._targetSlots[particleid];
      let slot = this._slotDom[slotid];
      // TODO(sjmiles): cache the content in case the containing
      // particle re-renders
      this._content[slotid] = content;
      if (slot) {
        slot.innerHTML = content;
        this._findSlots(slot);
      }
    }
  },
  _findSlots(dom) {
    let slots = dom.querySelectorAll("[slotid]");
    Array.prototype.forEach.call(slots, slot => {
      let slotid = slot.getAttribute('slotid');
      this._slotDom[slotid] = slot;
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