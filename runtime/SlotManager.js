SlotManager = {
  init() {
    if (global.document) {
      this._contentPending = {};
      this._slotDom = {root: document.body};
    }
  },
  renderSlot(slotid, content) {
    if (global.document) {
      let slot = this._slotDom[slotid];
      this._content[slotid] = content;
      if (!slot) {
        // TODO(sjmiles): shouldn't get here as the slot will not be
        // assigned before it's available. All the `pending` is a 
        // stopgap for early code that assigns slots aggressively.
        this._content[slotid] = content;
      } else {
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
      if (this._contentPending[slotid]) {
        slot.innerHTML = this._contentPending[slotid];
        this._findSlots(slot);
      }
    });
  }
};

SlotManager.init();

module.exports = SlotManager;