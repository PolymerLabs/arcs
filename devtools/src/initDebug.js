(() => {
  window._arcDebugHandles = window._arcDebugHandles || [];
  for (let arc of window._arcDebugHandles) {
    arc.initDebug();
  };
  Object.defineProperty(window._arcDebugHandles, 'push', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: function(...args) {
      for (let arc of args) {
        this[this.length] = arc;
        arc.initDebug();
      }
      return this.length;
    }
  });
})();
