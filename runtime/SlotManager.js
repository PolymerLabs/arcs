SlotManager = {
  init() {
    if (global.document) {
      this._content = {};
      this._slotDom = {root: document.body};
    }
  },
  renderSlot(slotid, content) {
    if (global.document) {
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
      }
    });
  }
};

SlotManager.init();

module.exports = SlotManager;