// HTMLImports compatibility stuff, delete soonish
if (typeof document !== 'undefined' && !('currentImport' in document)) {
  Object.defineProperty(document, 'currentImport', {
    get() {
      const script = this.currentScript;
      let doc = script.ownerDocument || this;
      // this code for CEv1 compatible HTMLImports polyfill (aka modern)
      if (window['HTMLImports']) {
        doc = window.HTMLImports.importForElement(script);
        doc.URL = script.parentElement.href;
      }
      return doc;
    }
  });
}
