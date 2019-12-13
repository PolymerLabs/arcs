/// BareSpecifier=@webcomponents\webcomponentsjs\bundles\webcomponents-sd-ce
/**
@license @nocompile
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/
(function () {
  /*
  Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
  This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
  The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
  The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
  Code distributed by Google as part of the polymer project is also
  subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
  */
  'use strict';
  var n;function aa(a) {
    var b = 0;return function () {
      return b < a.length ? { done: !1, value: a[b++] } : { done: !0 };
    };
  }function ba(a) {
    var b = "undefined" != typeof Symbol && Symbol.iterator && a[Symbol.iterator];return b ? b.call(a) : { next: aa(a) };
  }function ca(a) {
    for (var b, c = []; !(b = a.next()).done;) c.push(b.value);return c;
  }var da = "undefined" != typeof window && window === this ? this : "undefined" != typeof global && null != global ? global : this;function ea() {}ea.prototype.toJSON = function () {
    return {};
  };
  function p(a) {
    a.__shady || (a.__shady = new ea());return a.__shady;
  }function r(a) {
    return a && a.__shady;
  };var t = window.ShadyDOM || {};t.ra = !(!Element.prototype.attachShadow || !Node.prototype.getRootNode);var fa = Object.getOwnPropertyDescriptor(Node.prototype, "firstChild");t.i = !!(fa && fa.configurable && fa.get);t.T = t.force || !t.ra;t.l = t.noPatch || !1;t.X = t.preferPerformance;t.W = "on-demand" === t.l;t.ha = navigator.userAgent.match("Trident");function u(a) {
    return (a = r(a)) && void 0 !== a.firstChild;
  }function v(a) {
    return a instanceof ShadowRoot;
  }function ha(a) {
    return (a = (a = r(a)) && a.root) && ia(a);
  }
  var w = Element.prototype,
      ja = w.matches || w.matchesSelector || w.mozMatchesSelector || w.msMatchesSelector || w.oMatchesSelector || w.webkitMatchesSelector,
      ka = document.createTextNode(""),
      la = 0,
      na = [];new MutationObserver(function () {
    for (; na.length;) try {
      na.shift()();
    } catch (a) {
      throw ka.textContent = la++, a;
    }
  }).observe(ka, { characterData: !0 });function oa(a) {
    na.push(a);ka.textContent = la++;
  }var pa = !!document.contains;function qa(a, b) {
    for (; b;) {
      if (b == a) return !0;b = b.__shady_parentNode;
    }return !1;
  }
  function ra(a) {
    for (var b = a.length - 1; 0 <= b; b--) {
      var c = a[b],
          d = c.getAttribute("id") || c.getAttribute("name");d && "length" !== d && isNaN(d) && (a[d] = c);
    }a.item = function (e) {
      return a[e];
    };a.namedItem = function (e) {
      if ("length" !== e && isNaN(e) && a[e]) return a[e];for (var f = ba(a), g = f.next(); !g.done; g = f.next()) if (g = g.value, (g.getAttribute("id") || g.getAttribute("name")) == e) return g;return null;
    };return a;
  }function sa(a) {
    var b = [];for (a = a.__shady_native_firstChild; a; a = a.__shady_native_nextSibling) b.push(a);return b;
  }
  function ta(a) {
    var b = [];for (a = a.__shady_firstChild; a; a = a.__shady_nextSibling) b.push(a);return b;
  }function ua(a, b, c) {
    c.configurable = !0;if (c.value) a[b] = c.value;else try {
      Object.defineProperty(a, b, c);
    } catch (d) {}
  }function x(a, b, c, d) {
    c = void 0 === c ? "" : c;for (var e in b) d && 0 <= d.indexOf(e) || ua(a, c + e, b[e]);
  }function va(a, b) {
    for (var c in b) c in a && ua(a, c, b[c]);
  }function z(a) {
    var b = {};Object.getOwnPropertyNames(a).forEach(function (c) {
      b[c] = Object.getOwnPropertyDescriptor(a, c);
    });return b;
  };var wa = [],
      xa;function ya(a) {
    xa || (xa = !0, oa(za));wa.push(a);
  }function za() {
    xa = !1;for (var a = !!wa.length; wa.length;) wa.shift()();return a;
  }za.list = wa;function Aa() {
    this.a = !1;this.addedNodes = [];this.removedNodes = [];this.L = new Set();
  }function Ba(a) {
    a.a || (a.a = !0, oa(function () {
      a.flush();
    }));
  }Aa.prototype.flush = function () {
    if (this.a) {
      this.a = !1;var a = this.takeRecords();a.length && this.L.forEach(function (b) {
        b(a);
      });
    }
  };Aa.prototype.takeRecords = function () {
    if (this.addedNodes.length || this.removedNodes.length) {
      var a = [{ addedNodes: this.addedNodes, removedNodes: this.removedNodes }];this.addedNodes = [];this.removedNodes = [];return a;
    }return [];
  };
  function Ca(a, b) {
    var c = p(a);c.G || (c.G = new Aa());c.G.L.add(b);var d = c.G;return { la: b, C: d, ma: a, takeRecords: function () {
        return d.takeRecords();
      } };
  }function Da(a) {
    var b = a && a.C;b && (b.L.delete(a.la), b.L.size || (p(a.ma).G = null));
  }
  function Ea(a, b) {
    var c = b.getRootNode();return a.map(function (d) {
      var e = c === d.target.getRootNode();if (e && d.addedNodes) {
        if (e = Array.from(d.addedNodes).filter(function (f) {
          return c === f.getRootNode();
        }), e.length) return d = Object.create(d), Object.defineProperty(d, "addedNodes", { value: e, configurable: !0 }), d;
      } else if (e) return d;
    }).filter(function (d) {
      return d;
    });
  };var Fa = /[&\u00A0"]/g,
      Ga = /[&\u00A0<>]/g;function Ha(a) {
    switch (a) {case "&":
        return "&amp;";case "<":
        return "&lt;";case ">":
        return "&gt;";case '"':
        return "&quot;";case "\u00a0":
        return "&nbsp;";}
  }function Ia(a) {
    for (var b = {}, c = 0; c < a.length; c++) b[a[c]] = !0;return b;
  }var Ja = Ia("area base br col command embed hr img input keygen link meta param source track wbr".split(" ")),
      Ka = Ia("style script xmp iframe noembed noframes plaintext noscript".split(" "));
  function La(a, b) {
    "template" === a.localName && (a = a.content);for (var c = "", d = b ? b(a) : a.childNodes, e = 0, f = d.length, g = void 0; e < f && (g = d[e]); e++) {
      a: {
        var h = g;var k = a,
            l = b;switch (h.nodeType) {case Node.ELEMENT_NODE:
            k = h.localName;for (var m = "<" + k, q = h.attributes, y = 0, ma; ma = q[y]; y++) m += " " + ma.name + '="' + ma.value.replace(Fa, Ha) + '"';m += ">";h = Ja[k] ? m : m + La(h, l) + "</" + k + ">";break a;case Node.TEXT_NODE:
            h = h.data;h = k && Ka[k.localName] ? h : h.replace(Ga, Ha);break a;case Node.COMMENT_NODE:
            h = "\x3c!--" + h.data + "--\x3e";break a;default:
            throw window.console.error(h), Error("not implemented");}
      }c += h;
    }return c;
  };var Ma = t.i,
      Na = { querySelector: function (a) {
      return this.__shady_native_querySelector(a);
    }, querySelectorAll: function (a) {
      return this.__shady_native_querySelectorAll(a);
    } },
      Oa = {};function Pa(a) {
    Oa[a] = function (b) {
      return b["__shady_native_" + a];
    };
  }function Qa(a, b) {
    x(a, b, "__shady_native_");for (var c in b) Pa(c);
  }function A(a, b) {
    b = void 0 === b ? [] : b;for (var c = 0; c < b.length; c++) {
      var d = b[c],
          e = Object.getOwnPropertyDescriptor(a, d);e && (Object.defineProperty(a, "__shady_native_" + d, e), e.value ? Na[d] || (Na[d] = e.value) : Pa(d));
    }
  }
  var B = document.createTreeWalker(document, NodeFilter.SHOW_ALL, null, !1),
      C = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT, null, !1),
      Ra = document.implementation.createHTMLDocument("inert");function Sa(a) {
    for (var b; b = a.__shady_native_firstChild;) a.__shady_native_removeChild(b);
  }var Ta = ["firstElementChild", "lastElementChild", "children", "childElementCount"],
      Ua = ["querySelector", "querySelectorAll"];
  function Va() {
    var a = ["dispatchEvent", "addEventListener", "removeEventListener"];window.EventTarget ? A(window.EventTarget.prototype, a) : (A(Node.prototype, a), A(Window.prototype, a));Ma ? A(Node.prototype, "parentNode firstChild lastChild previousSibling nextSibling childNodes parentElement textContent".split(" ")) : Qa(Node.prototype, { parentNode: { get: function () {
          B.currentNode = this;return B.parentNode();
        } }, firstChild: { get: function () {
          B.currentNode = this;return B.firstChild();
        } }, lastChild: { get: function () {
          B.currentNode = this;return B.lastChild();
        } }, previousSibling: { get: function () {
          B.currentNode = this;return B.previousSibling();
        } }, nextSibling: { get: function () {
          B.currentNode = this;return B.nextSibling();
        } }, childNodes: { get: function () {
          var b = [];B.currentNode = this;for (var c = B.firstChild(); c;) b.push(c), c = B.nextSibling();return b;
        } }, parentElement: { get: function () {
          C.currentNode = this;return C.parentNode();
        } }, textContent: { get: function () {
          switch (this.nodeType) {case Node.ELEMENT_NODE:case Node.DOCUMENT_FRAGMENT_NODE:
              for (var b = document.createTreeWalker(this, NodeFilter.SHOW_TEXT, null, !1), c = "", d; d = b.nextNode();) c += d.nodeValue;return c;default:
              return this.nodeValue;}
        }, set: function (b) {
          if ("undefined" === typeof b || null === b) b = "";switch (this.nodeType) {case Node.ELEMENT_NODE:case Node.DOCUMENT_FRAGMENT_NODE:
              Sa(this);(0 < b.length || this.nodeType === Node.ELEMENT_NODE) && this.__shady_native_insertBefore(document.createTextNode(b), void 0);break;default:
              this.nodeValue = b;}
        } } });A(Node.prototype, "appendChild insertBefore removeChild replaceChild cloneNode contains".split(" "));
    A(HTMLElement.prototype, ["parentElement", "contains"]);a = { firstElementChild: { get: function () {
          C.currentNode = this;return C.firstChild();
        } }, lastElementChild: { get: function () {
          C.currentNode = this;return C.lastChild();
        } }, children: { get: function () {
          var b = [];C.currentNode = this;for (var c = C.firstChild(); c;) b.push(c), c = C.nextSibling();return ra(b);
        } }, childElementCount: { get: function () {
          return this.children ? this.children.length : 0;
        } } };Ma ? (A(Element.prototype, Ta), A(Element.prototype, ["previousElementSibling", "nextElementSibling", "innerHTML", "className"]), A(HTMLElement.prototype, ["children", "innerHTML", "className"])) : (Qa(Element.prototype, a), Qa(Element.prototype, { previousElementSibling: { get: function () {
          C.currentNode = this;return C.previousSibling();
        } }, nextElementSibling: { get: function () {
          C.currentNode = this;return C.nextSibling();
        } }, innerHTML: { get: function () {
          return La(this, sa);
        }, set: function (b) {
          var c = "template" === this.localName ? this.content : this;Sa(c);var d = this.localName || "div";d = this.namespaceURI && this.namespaceURI !== Ra.namespaceURI ? Ra.createElementNS(this.namespaceURI, d) : Ra.createElement(d);d.innerHTML = b;for (b = "template" === this.localName ? d.content : d; d = b.__shady_native_firstChild;) c.__shady_native_insertBefore(d, void 0);
        } }, className: { get: function () {
          return this.getAttribute("class") || "";
        }, set: function (b) {
          this.setAttribute("class", b);
        } } }));A(Element.prototype, "setAttribute getAttribute hasAttribute removeAttribute focus blur".split(" "));A(Element.prototype, Ua);A(HTMLElement.prototype, ["focus", "blur"]);window.HTMLTemplateElement && A(window.HTMLTemplateElement.prototype, ["innerHTML"]);Ma ? A(DocumentFragment.prototype, Ta) : Qa(DocumentFragment.prototype, a);A(DocumentFragment.prototype, Ua);Ma ? (A(Document.prototype, Ta), A(Document.prototype, ["activeElement"])) : Qa(Document.prototype, a);A(Document.prototype, ["importNode", "getElementById"]);A(Document.prototype, Ua);
  };var Wa = z({ get childNodes() {
      return this.__shady_childNodes;
    }, get firstChild() {
      return this.__shady_firstChild;
    }, get lastChild() {
      return this.__shady_lastChild;
    }, get childElementCount() {
      return this.__shady_childElementCount;
    }, get children() {
      return this.__shady_children;
    }, get firstElementChild() {
      return this.__shady_firstElementChild;
    }, get lastElementChild() {
      return this.__shady_lastElementChild;
    }, get shadowRoot() {
      return this.__shady_shadowRoot;
    } }),
      Ya = z({ get textContent() {
      return this.__shady_textContent;
    }, set textContent(a) {
      this.__shady_textContent = a;
    }, get innerHTML() {
      return this.__shady_innerHTML;
    }, set innerHTML(a) {
      return this.__shady_innerHTML = a;
    } }),
      Za = z({ get parentElement() {
      return this.__shady_parentElement;
    }, get parentNode() {
      return this.__shady_parentNode;
    }, get nextSibling() {
      return this.__shady_nextSibling;
    }, get previousSibling() {
      return this.__shady_previousSibling;
    }, get nextElementSibling() {
      return this.__shady_nextElementSibling;
    }, get previousElementSibling() {
      return this.__shady_previousElementSibling;
    }, get className() {
      return this.__shady_className;
    },
    set className(a) {
      return this.__shady_className = a;
    } });function $a(a) {
    for (var b in a) {
      var c = a[b];c && (c.enumerable = !1);
    }
  }$a(Wa);$a(Ya);$a(Za);var ab = t.i || !0 === t.l,
      bb = ab ? function () {} : function (a) {
    var b = p(a);b.ja || (b.ja = !0, va(a, Za));
  },
      cb = ab ? function () {} : function (a) {
    var b = p(a);b.ia || (b.ia = !0, va(a, Wa), window.customElements && !t.l || va(a, Ya));
  };var db = "__eventWrappers" + Date.now(),
      eb = function () {
    var a = Object.getOwnPropertyDescriptor(Event.prototype, "composed");return a ? function (b) {
      return a.get.call(b);
    } : null;
  }(),
      fb = function () {
    function a() {}var b = !1,
        c = { get capture() {
        b = !0;return !1;
      } };window.addEventListener("test", a, c);window.removeEventListener("test", a, c);return b;
  }();function gb(a) {
    if (a && "object" === typeof a) {
      var b = !!a.capture;var c = !!a.once;var d = !!a.passive;var e = a.B;
    } else b = !!a, d = c = !1;return { fa: e, capture: b, once: c, passive: d, ea: fb ? a : b };
  }
  var hb = { blur: !0, focus: !0, focusin: !0, focusout: !0, click: !0, dblclick: !0, mousedown: !0, mouseenter: !0, mouseleave: !0, mousemove: !0, mouseout: !0, mouseover: !0, mouseup: !0, wheel: !0, beforeinput: !0, input: !0, keydown: !0, keyup: !0, compositionstart: !0, compositionupdate: !0, compositionend: !0, touchstart: !0, touchend: !0, touchmove: !0, touchcancel: !0, pointerover: !0, pointerenter: !0, pointerdown: !0, pointermove: !0, pointerup: !0, pointercancel: !0, pointerout: !0, pointerleave: !0, gotpointercapture: !0, lostpointercapture: !0, dragstart: !0,
    drag: !0, dragenter: !0, dragleave: !0, dragover: !0, drop: !0, dragend: !0, DOMActivate: !0, DOMFocusIn: !0, DOMFocusOut: !0, keypress: !0 },
      ib = { DOMAttrModified: !0, DOMAttributeNameChanged: !0, DOMCharacterDataModified: !0, DOMElementNameChanged: !0, DOMNodeInserted: !0, DOMNodeInsertedIntoDocument: !0, DOMNodeRemoved: !0, DOMNodeRemovedFromDocument: !0, DOMSubtreeModified: !0 };function jb(a) {
    return a instanceof Node ? a.__shady_getRootNode() : a;
  }
  function kb(a, b) {
    var c = [],
        d = a;for (a = jb(a); d;) c.push(d), d.__shady_assignedSlot ? d = d.__shady_assignedSlot : d.nodeType === Node.DOCUMENT_FRAGMENT_NODE && d.host && (b || d !== a) ? d = d.host : d = d.__shady_parentNode;c[c.length - 1] === document && c.push(window);return c;
  }function lb(a) {
    a.__composedPath || (a.__composedPath = kb(a.target, !0));return a.__composedPath;
  }function mb(a, b) {
    if (!v) return a;a = kb(a, !0);for (var c = 0, d, e = void 0, f, g = void 0; c < b.length; c++) if (d = b[c], f = jb(d), f !== e && (g = a.indexOf(f), e = f), !v(f) || -1 < g) return d;
  }
  function nb(a) {
    function b(c, d) {
      c = new a(c, d);c.__composed = d && !!d.composed;return c;
    }b.__proto__ = a;b.prototype = a.prototype;return b;
  }var ob = { focus: !0, blur: !0 };function pb(a) {
    return a.__target !== a.target || a.__relatedTarget !== a.relatedTarget;
  }function qb(a, b, c) {
    if (c = b.__handlers && b.__handlers[a.type] && b.__handlers[a.type][c]) for (var d = 0, e; (e = c[d]) && (!pb(a) || a.target !== a.relatedTarget) && (e.call(b, a), !a.__immediatePropagationStopped); d++);
  }
  function rb(a) {
    var b = a.composedPath();Object.defineProperty(a, "currentTarget", { get: function () {
        return d;
      }, configurable: !0 });for (var c = b.length - 1; 0 <= c; c--) {
      var d = b[c];qb(a, d, "capture");if (a.O) return;
    }Object.defineProperty(a, "eventPhase", { get: function () {
        return Event.AT_TARGET;
      } });var e;for (c = 0; c < b.length; c++) {
      d = b[c];var f = r(d);f = f && f.root;if (0 === c || f && f === e) if (qb(a, d, "bubble"), d !== window && (e = d.__shady_getRootNode()), a.O) break;
    }
  }
  function sb(a, b, c, d, e, f) {
    for (var g = 0; g < a.length; g++) {
      var h = a[g],
          k = h.type,
          l = h.capture,
          m = h.once,
          q = h.passive;if (b === h.node && c === k && d === l && e === m && f === q) return g;
    }return -1;
  }function tb(a) {
    za();return this.__shady_native_dispatchEvent(a);
  }
  function ub(a, b, c) {
    var d = gb(c),
        e = d.capture,
        f = d.once,
        g = d.passive,
        h = d.fa;d = d.ea;if (b) {
      var k = typeof b;if ("function" === k || "object" === k) if ("object" !== k || b.handleEvent && "function" === typeof b.handleEvent) {
        if (ib[a]) return this.__shady_native_addEventListener(a, b, d);var l = h || this;if (h = b[db]) {
          if (-1 < sb(h, l, a, e, f, g)) return;
        } else b[db] = [];h = function (m) {
          f && this.__shady_removeEventListener(a, b, c);m.__target || vb(m);if (l !== this) {
            var q = Object.getOwnPropertyDescriptor(m, "currentTarget");Object.defineProperty(m, "currentTarget", { get: function () {
                return l;
              }, configurable: !0 });
          }m.__previousCurrentTarget = m.currentTarget;if (!v(l) && "slot" !== l.localName || -1 != m.composedPath().indexOf(l)) if (m.composed || -1 < m.composedPath().indexOf(l)) if (pb(m) && m.target === m.relatedTarget) m.eventPhase === Event.BUBBLING_PHASE && m.stopImmediatePropagation();else if (m.eventPhase === Event.CAPTURING_PHASE || m.bubbles || m.target === l || l instanceof Window) {
            var y = "function" === k ? b.call(l, m) : b.handleEvent && b.handleEvent(m);l !== this && (q ? (Object.defineProperty(m, "currentTarget", q), q = null) : delete m.currentTarget);return y;
          }
        };b[db].push({ node: l, type: a, capture: e, once: f, passive: g, Ea: h });ob[a] ? (this.__handlers = this.__handlers || {}, this.__handlers[a] = this.__handlers[a] || { capture: [], bubble: [] }, this.__handlers[a][e ? "capture" : "bubble"].push(h)) : this.__shady_native_addEventListener(a, h, d);
      }
    }
  }
  function wb(a, b, c) {
    if (b) {
      var d = gb(c);c = d.capture;var e = d.once,
          f = d.passive,
          g = d.fa;d = d.ea;if (ib[a]) return this.__shady_native_removeEventListener(a, b, d);var h = g || this;g = void 0;var k = null;try {
        k = b[db];
      } catch (l) {}k && (e = sb(k, h, a, c, e, f), -1 < e && (g = k.splice(e, 1)[0].Ea, k.length || (b[db] = void 0)));this.__shady_native_removeEventListener(a, g || b, d);g && ob[a] && this.__handlers && this.__handlers[a] && (a = this.__handlers[a][c ? "capture" : "bubble"], b = a.indexOf(g), -1 < b && a.splice(b, 1));
    }
  }
  function xb() {
    for (var a in ob) window.__shady_native_addEventListener(a, function (b) {
      b.__target || (vb(b), rb(b));
    }, !0);
  }
  var yb = z({ get composed() {
      void 0 === this.__composed && (eb ? this.__composed = "focusin" === this.type || "focusout" === this.type || eb(this) : !1 !== this.isTrusted && (this.__composed = hb[this.type]));return this.__composed || !1;
    }, composedPath: function () {
      this.__composedPath || (this.__composedPath = kb(this.__target, this.composed));return this.__composedPath;
    }, get target() {
      return mb(this.currentTarget || this.__previousCurrentTarget, this.composedPath());
    }, get relatedTarget() {
      if (!this.__relatedTarget) return null;this.__relatedTargetComposedPath || (this.__relatedTargetComposedPath = kb(this.__relatedTarget, !0));return mb(this.currentTarget || this.__previousCurrentTarget, this.__relatedTargetComposedPath);
    }, stopPropagation: function () {
      Event.prototype.stopPropagation.call(this);this.O = !0;
    }, stopImmediatePropagation: function () {
      Event.prototype.stopImmediatePropagation.call(this);this.O = this.__immediatePropagationStopped = !0;
    } });
  function vb(a) {
    a.__target = a.target;a.__relatedTarget = a.relatedTarget;if (t.i) {
      var b = Object.getPrototypeOf(a);if (!b.hasOwnProperty("__shady_patchedProto")) {
        var c = Object.create(b);c.__shady_sourceProto = b;x(c, yb);b.__shady_patchedProto = c;
      }a.__proto__ = b.__shady_patchedProto;
    } else x(a, yb);
  }var zb = nb(Event),
      Ab = nb(CustomEvent),
      Bb = nb(MouseEvent);
  function Cb() {
    if (!eb && Object.getOwnPropertyDescriptor(Event.prototype, "isTrusted")) {
      var a = function () {
        var b = new MouseEvent("click", { bubbles: !0, cancelable: !0, composed: !0 });this.__shady_dispatchEvent(b);
      };Element.prototype.click ? Element.prototype.click = a : HTMLElement.prototype.click && (HTMLElement.prototype.click = a);
    }
  }var Db = Object.getOwnPropertyNames(Document.prototype).filter(function (a) {
    return "on" === a.substring(0, 2);
  });function Eb(a, b) {
    return { index: a, H: [], K: b };
  }
  function Fb(a, b, c, d) {
    var e = 0,
        f = 0,
        g = 0,
        h = 0,
        k = Math.min(b - e, d - f);if (0 == e && 0 == f) a: {
      for (g = 0; g < k; g++) if (a[g] !== c[g]) break a;g = k;
    }if (b == a.length && d == c.length) {
      h = a.length;for (var l = c.length, m = 0; m < k - g && Gb(a[--h], c[--l]);) m++;h = m;
    }e += g;f += g;b -= h;d -= h;if (0 == b - e && 0 == d - f) return [];if (e == b) {
      for (b = Eb(e, 0); f < d;) b.H.push(c[f++]);return [b];
    }if (f == d) return [Eb(e, b - e)];k = e;g = f;d = d - g + 1;h = b - k + 1;b = Array(d);for (l = 0; l < d; l++) b[l] = Array(h), b[l][0] = l;for (l = 0; l < h; l++) b[0][l] = l;for (l = 1; l < d; l++) for (m = 1; m < h; m++) if (a[k + m - 1] === c[g + l - 1]) b[l][m] = b[l - 1][m - 1];else {
      var q = b[l - 1][m] + 1,
          y = b[l][m - 1] + 1;b[l][m] = q < y ? q : y;
    }k = b.length - 1;g = b[0].length - 1;d = b[k][g];for (a = []; 0 < k || 0 < g;) 0 == k ? (a.push(2), g--) : 0 == g ? (a.push(3), k--) : (h = b[k - 1][g - 1], l = b[k - 1][g], m = b[k][g - 1], q = l < m ? l < h ? l : h : m < h ? m : h, q == h ? (h == d ? a.push(0) : (a.push(1), d = h), k--, g--) : q == l ? (a.push(3), k--, d = l) : (a.push(2), g--, d = m));a.reverse();b = void 0;k = [];for (g = 0; g < a.length; g++) switch (a[g]) {case 0:
        b && (k.push(b), b = void 0);e++;f++;break;case 1:
        b || (b = Eb(e, 0));b.K++;e++;b.H.push(c[f]);f++;break;case 2:
        b || (b = Eb(e, 0));
        b.K++;e++;break;case 3:
        b || (b = Eb(e, 0)), b.H.push(c[f]), f++;}b && k.push(b);return k;
  }function Gb(a, b) {
    return a === b;
  };var Hb = z({ dispatchEvent: tb, addEventListener: ub, removeEventListener: wb });var Ib = null;function D() {
    Ib || (Ib = window.ShadyCSS && window.ShadyCSS.ScopingShim);return Ib || null;
  }function Jb(a, b, c) {
    var d = D();return d && "class" === b ? (d.setElementClass(a, c), !0) : !1;
  }function Kb(a, b) {
    var c = D();c && c.unscopeNode(a, b);
  }function Lb(a, b) {
    var c = D();if (!c) return !0;if (a.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      c = !0;for (a = a.__shady_firstChild; a; a = a.__shady_nextSibling) c = c && Lb(a, b);return c;
    }return a.nodeType !== Node.ELEMENT_NODE ? !0 : c.currentScopeForNode(a) === b;
  }
  function Mb(a) {
    if (a.nodeType !== Node.ELEMENT_NODE) return "";var b = D();return b ? b.currentScopeForNode(a) : "";
  }function Nb(a, b) {
    if (a) for (a.nodeType === Node.ELEMENT_NODE && b(a), a = a.__shady_firstChild; a; a = a.__shady_nextSibling) a.nodeType === Node.ELEMENT_NODE && Nb(a, b);
  };var Ob = window.document,
      Pb = t.X,
      Qb = Object.getOwnPropertyDescriptor(Node.prototype, "isConnected"),
      Rb = Qb && Qb.get;function Sb(a) {
    for (var b; b = a.__shady_firstChild;) a.__shady_removeChild(b);
  }function Tb(a) {
    var b = r(a);if (b && void 0 !== b.N) for (b = a.__shady_firstChild; b; b = b.__shady_nextSibling) Tb(b);if (a = r(a)) a.N = void 0;
  }function Ub(a) {
    var b = a;a && "slot" === a.localName && (b = (b = (b = r(a)) && b.F) && b.length ? b[0] : Ub(a.__shady_nextSibling));return b;
  }
  function Vb(a, b, c) {
    if (a = (a = r(a)) && a.G) {
      if (b) if (b.nodeType === Node.DOCUMENT_FRAGMENT_NODE) for (var d = 0, e = b.childNodes.length; d < e; d++) a.addedNodes.push(b.childNodes[d]);else a.addedNodes.push(b);c && a.removedNodes.push(c);Ba(a);
    }
  }
  var $b = z({ get parentNode() {
      var a = r(this);a = a && a.parentNode;return void 0 !== a ? a : this.__shady_native_parentNode;
    }, get firstChild() {
      var a = r(this);a = a && a.firstChild;return void 0 !== a ? a : this.__shady_native_firstChild;
    }, get lastChild() {
      var a = r(this);a = a && a.lastChild;return void 0 !== a ? a : this.__shady_native_lastChild;
    }, get nextSibling() {
      var a = r(this);a = a && a.nextSibling;return void 0 !== a ? a : this.__shady_native_nextSibling;
    }, get previousSibling() {
      var a = r(this);a = a && a.previousSibling;return void 0 !== a ? a : this.__shady_native_previousSibling;
    },
    get childNodes() {
      if (u(this)) {
        var a = r(this);if (!a.childNodes) {
          a.childNodes = [];for (var b = this.__shady_firstChild; b; b = b.__shady_nextSibling) a.childNodes.push(b);
        }var c = a.childNodes;
      } else c = this.__shady_native_childNodes;c.item = function (d) {
        return c[d];
      };return c;
    }, get parentElement() {
      var a = r(this);(a = a && a.parentNode) && a.nodeType !== Node.ELEMENT_NODE && (a = null);return void 0 !== a ? a : this.__shady_native_parentElement;
    }, get isConnected() {
      if (Rb && Rb.call(this)) return !0;if (this.nodeType == Node.DOCUMENT_FRAGMENT_NODE) return !1;
      var a = this.ownerDocument;if (pa) {
        if (a.__shady_native_contains(this)) return !0;
      } else if (a.documentElement && a.documentElement.__shady_native_contains(this)) return !0;for (a = this; a && !(a instanceof Document);) a = a.__shady_parentNode || (v(a) ? a.host : void 0);return !!(a && a instanceof Document);
    }, get textContent() {
      if (u(this)) {
        for (var a = [], b = this.__shady_firstChild; b; b = b.__shady_nextSibling) b.nodeType !== Node.COMMENT_NODE && a.push(b.__shady_textContent);return a.join("");
      }return this.__shady_native_textContent;
    }, set textContent(a) {
      if ("undefined" === typeof a || null === a) a = "";switch (this.nodeType) {case Node.ELEMENT_NODE:case Node.DOCUMENT_FRAGMENT_NODE:
          if (!u(this) && t.i) {
            var b = this.__shady_firstChild;(b != this.__shady_lastChild || b && b.nodeType != Node.TEXT_NODE) && Sb(this);this.__shady_native_textContent = a;
          } else Sb(this), (0 < a.length || this.nodeType === Node.ELEMENT_NODE) && this.__shady_insertBefore(document.createTextNode(a));break;default:
          this.nodeValue = a;}
    }, insertBefore: function (a, b) {
      if (this.ownerDocument !== Ob && a.ownerDocument !== Ob) return this.__shady_native_insertBefore(a, b), a;if (a === this) throw Error("Failed to execute 'appendChild' on 'Node': The new child element contains the parent.");if (b) {
        var c = r(b);c = c && c.parentNode;if (void 0 !== c && c !== this || void 0 === c && b.__shady_native_parentNode !== this) throw Error("Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.");
      }if (b === a) return a;Vb(this, a);var d = [],
          e = (c = E(this)) ? c.host.localName : Mb(this),
          f = a.__shady_parentNode;if (f) {
        var g = Mb(a);var h = !!c || !E(a) || Pb && void 0 !== this.__noInsertionPoint;f.__shady_removeChild(a, h);
      }f = !0;var k = (!Pb || void 0 === a.__noInsertionPoint && void 0 === this.__noInsertionPoint) && !Lb(a, e),
          l = c && !a.__noInsertionPoint && (!Pb || a.nodeType === Node.DOCUMENT_FRAGMENT_NODE);if (l || k) k && (g = g || Mb(a)), Nb(a, function (m) {
        l && "slot" === m.localName && d.push(m);if (k) {
          var q = g;D() && (q && Kb(m, q), (q = D()) && q.scopeNode(m, e));
        }
      });d.length && (Wb(c), c.c.push.apply(c.c, d instanceof Array ? d : ca(ba(d))), F(c));u(this) && (Xb(a, this, b), c = r(this), ha(this) ? (F(c.root), f = !1) : c.root && (f = !1));f ? (c = v(this) ? this.host : this, b ? (b = Ub(b), c.__shady_native_insertBefore(a, b)) : c.__shady_native_appendChild(a)) : a.ownerDocument !== this.ownerDocument && this.ownerDocument.adoptNode(a);return a;
    }, appendChild: function (a) {
      if (this != a || !v(a)) return this.__shady_insertBefore(a);
    }, removeChild: function (a, b) {
      b = void 0 === b ? !1 : b;if (this.ownerDocument !== Ob) return this.__shady_native_removeChild(a);if (a.__shady_parentNode !== this) throw Error("The node to be removed is not a child of this node: " + a);Vb(this, null, a);var c = E(a),
          d = c && Yb(c, a),
          e = r(this);if (u(this) && (Zb(a, this), ha(this))) {
        F(e.root);var f = !0;
      }if (D() && !b && c && a.nodeType !== Node.TEXT_NODE) {
        var g = Mb(a);Nb(a, function (h) {
          Kb(h, g);
        });
      }Tb(a);c && ((b = this && "slot" === this.localName) && (f = !0), (d || b) && F(c));f || (f = v(this) ? this.host : this, (!e.root && "slot" !== a.localName || f === a.__shady_native_parentNode) && f.__shady_native_removeChild(a));return a;
    }, replaceChild: function (a, b) {
      this.__shady_insertBefore(a, b);this.__shady_removeChild(b);return a;
    }, cloneNode: function (a) {
      if ("template" == this.localName) return this.__shady_native_cloneNode(a);var b = this.__shady_native_cloneNode(!1);if (a && b.nodeType !== Node.ATTRIBUTE_NODE) {
        a = this.__shady_firstChild;for (var c; a; a = a.__shady_nextSibling) c = a.__shady_cloneNode(!0), b.__shady_appendChild(c);
      }return b;
    }, getRootNode: function (a) {
      if (this && this.nodeType) {
        var b = p(this),
            c = b.N;void 0 === c && (v(this) ? (c = this, b.N = c) : (c = (c = this.__shady_parentNode) ? c.__shady_getRootNode(a) : this, document.documentElement.__shady_native_contains(this) && (b.N = c)));return c;
      }
    }, contains: function (a) {
      return qa(this, a);
    } });var bc = z({ get assignedSlot() {
      var a = this.__shady_parentNode;(a = a && a.__shady_shadowRoot) && ac(a);return (a = r(this)) && a.assignedSlot || null;
    } });function cc(a, b, c) {
    var d = [];dc(a, b, c, d);return d;
  }function dc(a, b, c, d) {
    for (a = a.__shady_firstChild; a; a = a.__shady_nextSibling) {
      var e;if (e = a.nodeType === Node.ELEMENT_NODE) {
        e = a;var f = b,
            g = c,
            h = d,
            k = f(e);k && h.push(e);g && g(k) ? e = k : (dc(e, f, g, h), e = void 0);
      }if (e) break;
    }
  }
  var G = z({ get firstElementChild() {
      var a = r(this);if (a && void 0 !== a.firstChild) {
        for (a = this.__shady_firstChild; a && a.nodeType !== Node.ELEMENT_NODE;) a = a.__shady_nextSibling;return a;
      }return this.__shady_native_firstElementChild;
    }, get lastElementChild() {
      var a = r(this);if (a && void 0 !== a.lastChild) {
        for (a = this.__shady_lastChild; a && a.nodeType !== Node.ELEMENT_NODE;) a = a.__shady_previousSibling;return a;
      }return this.__shady_native_lastElementChild;
    }, get children() {
      return u(this) ? ra(Array.prototype.filter.call(ta(this), function (a) {
        return a.nodeType === Node.ELEMENT_NODE;
      })) : this.__shady_native_children;
    }, get childElementCount() {
      var a = this.__shady_children;return a ? a.length : 0;
    } }),
      ec = z({ querySelector: function (a) {
      return cc(this, function (b) {
        return ja.call(b, a);
      }, function (b) {
        return !!b;
      })[0] || null;
    }, querySelectorAll: function (a, b) {
      if (b) {
        b = Array.prototype.slice.call(this.__shady_native_querySelectorAll(a));var c = this.__shady_getRootNode();return ra(b.filter(function (d) {
          return d.__shady_getRootNode() == c;
        }));
      }return ra(cc(this, function (d) {
        return ja.call(d, a);
      }));
    } }),
      fc = t.X && !t.l ? Object.assign({}, G) : G;Object.assign(G, ec);var gc = window.document;function hc(a, b) {
    if ("slot" === b) a = a.__shady_parentNode, ha(a) && F(r(a).root);else if ("slot" === a.localName && "name" === b && (b = E(a))) {
      if (b.a) {
        ic(b);var c = a.ka,
            d = jc(a);if (d !== c) {
          c = b.b[c];var e = c.indexOf(a);0 <= e && c.splice(e, 1);c = b.b[d] || (b.b[d] = []);c.push(a);1 < c.length && (b.b[d] = kc(c));
        }
      }F(b);
    }
  }
  var lc = z({ get previousElementSibling() {
      var a = r(this);if (a && void 0 !== a.previousSibling) {
        for (a = this.__shady_previousSibling; a && a.nodeType !== Node.ELEMENT_NODE;) a = a.__shady_previousSibling;return a;
      }return this.__shady_native_previousElementSibling;
    }, get nextElementSibling() {
      var a = r(this);if (a && void 0 !== a.nextSibling) {
        for (a = this.__shady_nextSibling; a && a.nodeType !== Node.ELEMENT_NODE;) a = a.__shady_nextSibling;return a;
      }return this.__shady_native_nextElementSibling;
    }, get slot() {
      return this.getAttribute("slot");
    },
    set slot(a) {
      this.__shady_setAttribute("slot", a);
    }, get className() {
      return this.getAttribute("class") || "";
    }, set className(a) {
      this.__shady_setAttribute("class", a);
    }, setAttribute: function (a, b) {
      this.ownerDocument !== gc ? this.__shady_native_setAttribute(a, b) : Jb(this, a, b) || (this.__shady_native_setAttribute(a, b), hc(this, a));
    }, removeAttribute: function (a) {
      this.ownerDocument !== gc ? this.__shady_native_removeAttribute(a) : Jb(this, a, "") ? "" === this.getAttribute(a) && this.__shady_native_removeAttribute(a) : (this.__shady_native_removeAttribute(a), hc(this, a));
    } }),
      qc = z({ attachShadow: function (a) {
      if (!this) throw Error("Must provide a host.");if (!a) throw Error("Not enough arguments.");if (a.shadyUpgradeFragment && !t.ha) {
        var b = a.shadyUpgradeFragment;b.__proto__ = ShadowRoot.prototype;mc(b, this, a);nc(b, b);a = b.__noInsertionPoint ? null : b.querySelectorAll("slot");b.__noInsertionPoint = void 0;if (a && a.length) {
          var c = b;Wb(c);c.c.push.apply(c.c, a instanceof Array ? a : ca(ba(a)));F(b);
        }b.host.__shady_native_appendChild(b);
      } else b = new oc(pc, this, a);return this.__CE_shadowRoot = b;
    }, get shadowRoot() {
      var a = r(this);return a && a.wa || null;
    } });Object.assign(lc, qc);var rc = document.implementation.createHTMLDocument("inert"),
      sc = z({ get innerHTML() {
      return u(this) ? La("template" === this.localName ? this.content : this, ta) : this.__shady_native_innerHTML;
    }, set innerHTML(a) {
      if ("template" === this.localName) this.__shady_native_innerHTML = a;else {
        Sb(this);var b = this.localName || "div";b = this.namespaceURI && this.namespaceURI !== rc.namespaceURI ? rc.createElementNS(this.namespaceURI, b) : rc.createElement(b);for (t.i ? b.__shady_native_innerHTML = a : b.innerHTML = a; a = b.__shady_firstChild;) this.__shady_insertBefore(a);
      }
    } });var tc = z({ blur: function () {
      var a = r(this);(a = (a = a && a.root) && a.activeElement) ? a.__shady_blur() : this.__shady_native_blur();
    } });t.X || Db.forEach(function (a) {
    tc[a] = { set: function (b) {
        var c = p(this),
            d = a.substring(2);c.A || (c.A = {});c.A[a] && this.removeEventListener(d, c.A[a]);this.__shady_addEventListener(d, b);c.A[a] = b;
      }, get: function () {
        var b = r(this);return b && b.A && b.A[a];
      }, configurable: !0 };
  });var uc = z({ assignedNodes: function (a) {
      if ("slot" === this.localName) {
        var b = this.__shady_getRootNode();b && v(b) && ac(b);return (b = r(this)) ? (a && a.flatten ? b.F : b.assignedNodes) || [] : [];
      }
    }, addEventListener: function (a, b, c) {
      if ("slot" !== this.localName || "slotchange" === a) ub.call(this, a, b, c);else {
        "object" !== typeof c && (c = { capture: !!c });var d = this.__shady_parentNode;if (!d) throw Error("ShadyDOM cannot attach event to slot unless it has a `parentNode`");c.B = this;d.__shady_addEventListener(a, b, c);
      }
    }, removeEventListener: function (a, b, c) {
      if ("slot" !== this.localName || "slotchange" === a) wb.call(this, a, b, c);else {
        "object" !== typeof c && (c = { capture: !!c });var d = this.__shady_parentNode;if (!d) throw Error("ShadyDOM cannot attach event to slot unless it has a `parentNode`");c.B = this;d.__shady_removeEventListener(a, b, c);
      }
    } });var vc = z({ getElementById: function (a) {
      return "" === a ? null : cc(this, function (b) {
        return b.id == a;
      }, function (b) {
        return !!b;
      })[0] || null;
    } });var wc = z({ get activeElement() {
      var a = t.i ? document.__shady_native_activeElement : document.activeElement;if (!a || !a.nodeType) return null;var b = !!v(this);if (!(this === document || b && this.host !== a && this.host.__shady_native_contains(a))) return null;for (b = E(a); b && b !== this;) a = b.host, b = E(a);return this === document ? b ? null : a : b === this ? a : null;
    } });var xc = window.document,
      yc = z({ importNode: function (a, b) {
      if (a.ownerDocument !== xc || "template" === a.localName) return this.__shady_native_importNode(a, b);var c = this.__shady_native_importNode(a, !1);if (b) for (a = a.__shady_firstChild; a; a = a.__shady_nextSibling) b = this.__shady_importNode(a, !0), c.__shady_appendChild(b);return c;
    } });var zc = z({ dispatchEvent: tb, addEventListener: ub.bind(window), removeEventListener: wb.bind(window) });var Ac = {};Object.getOwnPropertyDescriptor(HTMLElement.prototype, "parentElement") && (Ac.parentElement = $b.parentElement);Object.getOwnPropertyDescriptor(HTMLElement.prototype, "contains") && (Ac.contains = $b.contains);Object.getOwnPropertyDescriptor(HTMLElement.prototype, "children") && (Ac.children = G.children);Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerHTML") && (Ac.innerHTML = sc.innerHTML);Object.getOwnPropertyDescriptor(HTMLElement.prototype, "className") && (Ac.className = lc.className);
  var H = { EventTarget: [Hb], Node: [$b, window.EventTarget ? null : Hb], Text: [bc], Comment: [bc], CDATASection: [bc], ProcessingInstruction: [bc], Element: [lc, G, bc, !t.i || "innerHTML" in Element.prototype ? sc : null, window.HTMLSlotElement ? null : uc], HTMLElement: [tc, Ac], HTMLSlotElement: [uc], DocumentFragment: [fc, vc], Document: [yc, fc, vc, wc], Window: [zc] },
      Bc = t.i ? null : ["innerHTML", "textContent"];function I(a, b, c, d) {
    b.forEach(function (e) {
      return a && e && x(a, e, c, d);
    });
  }
  function Cc(a) {
    var b = a ? null : Bc,
        c;for (c in H) I(window[c] && window[c].prototype, H[c], a, b);
  }["Text", "Comment", "CDATASection", "ProcessingInstruction"].forEach(function (a) {
    var b = window[a],
        c = Object.create(b.prototype);c.__shady_protoIsPatched = !0;I(c, H.EventTarget);I(c, H.Node);H[a] && I(c, H[a]);b.prototype.__shady_patchedProto = c;
  });function Dc(a) {
    a.__shady_protoIsPatched = !0;I(a, H.EventTarget);I(a, H.Node);I(a, H.Element);I(a, H.HTMLElement);I(a, H.HTMLSlotElement);return a;
  };var Ec = t.W,
      Fc = t.i;function Gc(a, b) {
    if (Ec && !a.__shady_protoIsPatched && !v(a)) {
      var c = Object.getPrototypeOf(a),
          d = c.hasOwnProperty("__shady_patchedProto") && c.__shady_patchedProto;d || (d = Object.create(c), Dc(d), c.__shady_patchedProto = d);Object.setPrototypeOf(a, d);
    }Fc || (1 === b ? bb(a) : 2 === b && cb(a));
  }
  function Hc(a, b, c, d) {
    Gc(a, 1);d = d || null;var e = p(a),
        f = d ? p(d) : null;e.previousSibling = d ? f.previousSibling : b.__shady_lastChild;if (f = r(e.previousSibling)) f.nextSibling = a;if (f = r(e.nextSibling = d)) f.previousSibling = a;e.parentNode = b;d ? d === c.firstChild && (c.firstChild = a) : (c.lastChild = a, c.firstChild || (c.firstChild = a));c.childNodes = null;
  }
  function Xb(a, b, c) {
    Gc(b, 2);var d = p(b);void 0 !== d.firstChild && (d.childNodes = null);if (a.nodeType === Node.DOCUMENT_FRAGMENT_NODE) for (a = a.__shady_native_firstChild; a; a = a.__shady_native_nextSibling) Hc(a, b, d, c);else Hc(a, b, d, c);
  }
  function Zb(a, b) {
    var c = p(a);b = p(b);a === b.firstChild && (b.firstChild = c.nextSibling);a === b.lastChild && (b.lastChild = c.previousSibling);a = c.previousSibling;var d = c.nextSibling;a && (p(a).nextSibling = d);d && (p(d).previousSibling = a);c.parentNode = c.previousSibling = c.nextSibling = void 0;void 0 !== b.childNodes && (b.childNodes = null);
  }
  function nc(a, b) {
    var c = p(a);if (b || void 0 === c.firstChild) {
      c.childNodes = null;var d = c.firstChild = a.__shady_native_firstChild;c.lastChild = a.__shady_native_lastChild;Gc(a, 2);c = d;for (d = void 0; c; c = c.__shady_native_nextSibling) {
        var e = p(c);e.parentNode = b || a;e.nextSibling = c.__shady_native_nextSibling;e.previousSibling = d || null;d = c;Gc(c, 1);
      }
    }
  };var Ic = z({ addEventListener: function (a, b, c) {
      "object" !== typeof c && (c = { capture: !!c });c.B = c.B || this;this.host.__shady_addEventListener(a, b, c);
    }, removeEventListener: function (a, b, c) {
      "object" !== typeof c && (c = { capture: !!c });c.B = c.B || this;this.host.__shady_removeEventListener(a, b, c);
    } });function Jc(a, b) {
    x(a, Ic, b);x(a, wc, b);x(a, sc, b);x(a, G, b);t.l && !b ? (x(a, $b, b), x(a, vc, b)) : t.i || (x(a, Za), x(a, Wa), x(a, Ya));
  };var pc = {},
      J = t.deferConnectionCallbacks && "loading" === document.readyState,
      Kc;function Lc(a) {
    var b = [];do b.unshift(a); while (a = a.__shady_parentNode);return b;
  }function oc(a, b, c) {
    if (a !== pc) throw new TypeError("Illegal constructor");this.a = null;mc(this, b, c);
  }
  function mc(a, b, c) {
    a.host = b;a.mode = c && c.mode;nc(a.host);b = p(a.host);b.root = a;b.wa = "closed" !== a.mode ? a : null;b = p(a);b.firstChild = b.lastChild = b.parentNode = b.nextSibling = b.previousSibling = null;if (t.preferPerformance) for (; b = a.host.__shady_native_firstChild;) a.host.__shady_native_removeChild(b);else F(a);
  }function F(a) {
    a.D || (a.D = !0, ya(function () {
      return ac(a);
    }));
  }
  function ac(a) {
    var b;if (b = a.D) {
      for (var c; a;) a: {
        a.D && (c = a), b = a;a = b.host.__shady_getRootNode();if (v(a) && (b = r(b.host)) && 0 < b.J) break a;a = void 0;
      }b = c;
    }(c = b) && c._renderSelf();
  }
  oc.prototype._renderSelf = function () {
    var a = J;J = !0;this.D = !1;if (this.a) {
      ic(this);for (var b = 0, c; b < this.a.length; b++) {
        c = this.a[b];var d = r(c),
            e = d.assignedNodes;d.assignedNodes = [];d.F = [];if (d.aa = e) for (d = 0; d < e.length; d++) {
          var f = r(e[d]);f.P = f.assignedSlot;f.assignedSlot === c && (f.assignedSlot = null);
        }
      }for (b = this.host.__shady_firstChild; b; b = b.__shady_nextSibling) Mc(this, b);for (b = 0; b < this.a.length; b++) {
        c = this.a[b];e = r(c);if (!e.assignedNodes.length) for (d = c.__shady_firstChild; d; d = d.__shady_nextSibling) Mc(this, d, c);(d = (d = r(c.__shady_parentNode)) && d.root) && (ia(d) || d.D) && d._renderSelf();Nc(this, e.F, e.assignedNodes);if (d = e.aa) {
          for (f = 0; f < d.length; f++) r(d[f]).P = null;e.aa = null;d.length > e.assignedNodes.length && (e.R = !0);
        }e.R && (e.R = !1, Oc(this, c));
      }c = this.a;b = [];for (e = 0; e < c.length; e++) d = c[e].__shady_parentNode, (f = r(d)) && f.root || !(0 > b.indexOf(d)) || b.push(d);for (c = 0; c < b.length; c++) {
        f = b[c];e = f === this ? this.host : f;d = [];for (f = f.__shady_firstChild; f; f = f.__shady_nextSibling) if ("slot" == f.localName) for (var g = r(f).F, h = 0; h < g.length; h++) d.push(g[h]);else d.push(f);f = sa(e);g = Fb(d, d.length, f, f.length);for (var k = h = 0, l = void 0; h < g.length && (l = g[h]); h++) {
          for (var m = 0, q = void 0; m < l.H.length && (q = l.H[m]); m++) q.__shady_native_parentNode === e && e.__shady_native_removeChild(q), f.splice(l.index + k, 1);k -= l.K;
        }k = 0;for (l = void 0; k < g.length && (l = g[k]); k++) for (h = f[l.index], m = l.index; m < l.index + l.K; m++) q = d[m], e.__shady_native_insertBefore(q, h), f.splice(m, 0, q);
      }
    }if (!t.preferPerformance && !this.Z) for (b = this.host.__shady_firstChild; b; b = b.__shady_nextSibling) c = r(b), b.__shady_native_parentNode !== this.host || "slot" !== b.localName && c.assignedSlot || this.host.__shady_native_removeChild(b);this.Z = !0;J = a;Kc && Kc();
  };function Mc(a, b, c) {
    var d = p(b),
        e = d.P;d.P = null;c || (c = (a = a.b[b.__shady_slot || "__catchall"]) && a[0]);c ? (p(c).assignedNodes.push(b), d.assignedSlot = c) : d.assignedSlot = void 0;e !== d.assignedSlot && d.assignedSlot && (p(d.assignedSlot).R = !0);
  }function Nc(a, b, c) {
    for (var d = 0, e = void 0; d < c.length && (e = c[d]); d++) if ("slot" == e.localName) {
      var f = r(e).assignedNodes;f && f.length && Nc(a, b, f);
    } else b.push(c[d]);
  }
  function Oc(a, b) {
    b.__shady_native_dispatchEvent(new Event("slotchange"));b = r(b);b.assignedSlot && Oc(a, b.assignedSlot);
  }function Wb(a) {
    a.c = a.c || [];a.a = a.a || [];a.b = a.b || {};
  }function ic(a) {
    if (a.c && a.c.length) {
      for (var b = a.c, c, d = 0; d < b.length; d++) {
        var e = b[d];nc(e);var f = e.__shady_parentNode;nc(f);f = r(f);f.J = (f.J || 0) + 1;f = jc(e);a.b[f] ? (c = c || {}, c[f] = !0, a.b[f].push(e)) : a.b[f] = [e];a.a.push(e);
      }if (c) for (var g in c) a.b[g] = kc(a.b[g]);a.c = [];
    }
  }
  function jc(a) {
    var b = a.name || a.getAttribute("name") || "__catchall";return a.ka = b;
  }function kc(a) {
    return a.sort(function (b, c) {
      b = Lc(b);for (var d = Lc(c), e = 0; e < b.length; e++) {
        c = b[e];var f = d[e];if (c !== f) return b = ta(c.__shady_parentNode), b.indexOf(c) - b.indexOf(f);
      }
    });
  }
  function Yb(a, b) {
    if (a.a) {
      ic(a);var c = a.b,
          d;for (d in c) for (var e = c[d], f = 0; f < e.length; f++) {
        var g = e[f];if (qa(b, g)) {
          e.splice(f, 1);var h = a.a.indexOf(g);0 <= h && (a.a.splice(h, 1), (h = r(g.__shady_parentNode)) && h.J && h.J--);f--;g = r(g);if (h = g.F) for (var k = 0; k < h.length; k++) {
            var l = h[k],
                m = l.__shady_native_parentNode;m && m.__shady_native_removeChild(l);
          }g.F = [];g.assignedNodes = [];h = !0;
        }
      }return h;
    }
  }function ia(a) {
    ic(a);return !(!a.a || !a.a.length);
  }
  (function (a) {
    a.__proto__ = DocumentFragment.prototype;Jc(a, "__shady_");Jc(a);Object.defineProperties(a, { nodeType: { value: Node.DOCUMENT_FRAGMENT_NODE, configurable: !0 }, nodeName: { value: "#document-fragment", configurable: !0 }, nodeValue: { value: null, configurable: !0 } });["localName", "namespaceURI", "prefix"].forEach(function (b) {
      Object.defineProperty(a, b, { value: void 0, configurable: !0 });
    });["ownerDocument", "baseURI", "isConnected"].forEach(function (b) {
      Object.defineProperty(a, b, { get: function () {
          return this.host[b];
        },
        configurable: !0 });
    });
  })(oc.prototype);
  if (window.customElements && t.T && !t.preferPerformance) {
    var Pc = new Map();Kc = function () {
      var a = [];Pc.forEach(function (d, e) {
        a.push([e, d]);
      });Pc.clear();for (var b = 0; b < a.length; b++) {
        var c = a[b][0];a[b][1] ? c.__shadydom_connectedCallback() : c.__shadydom_disconnectedCallback();
      }
    };J && document.addEventListener("readystatechange", function () {
      J = !1;Kc();
    }, { once: !0 });var Qc = function (a, b, c) {
      var d = 0,
          e = "__isConnected" + d++;if (b || c) a.prototype.connectedCallback = a.prototype.__shadydom_connectedCallback = function () {
        J ? Pc.set(this, !0) : this[e] || (this[e] = !0, b && b.call(this));
      }, a.prototype.disconnectedCallback = a.prototype.__shadydom_disconnectedCallback = function () {
        J ? this.isConnected || Pc.set(this, !1) : this[e] && (this[e] = !1, c && c.call(this));
      };return a;
    },
        Rc = window.customElements.define,
        define = function (a, b) {
      var c = b.prototype.connectedCallback,
          d = b.prototype.disconnectedCallback;Rc.call(window.customElements, a, Qc(b, c, d));b.prototype.connectedCallback = c;b.prototype.disconnectedCallback = d;
    };window.customElements.define = define;Object.defineProperty(window.CustomElementRegistry.prototype, "define", { value: define, configurable: !0 });
  }function E(a) {
    a = a.__shady_getRootNode();if (v(a)) return a;
  };function Sc(a) {
    this.node = a;
  }n = Sc.prototype;n.addEventListener = function (a, b, c) {
    return this.node.__shady_addEventListener(a, b, c);
  };n.removeEventListener = function (a, b, c) {
    return this.node.__shady_removeEventListener(a, b, c);
  };n.appendChild = function (a) {
    return this.node.__shady_appendChild(a);
  };n.insertBefore = function (a, b) {
    return this.node.__shady_insertBefore(a, b);
  };n.removeChild = function (a) {
    return this.node.__shady_removeChild(a);
  };n.replaceChild = function (a, b) {
    return this.node.__shady_replaceChild(a, b);
  };
  n.cloneNode = function (a) {
    return this.node.__shady_cloneNode(a);
  };n.getRootNode = function (a) {
    return this.node.__shady_getRootNode(a);
  };n.contains = function (a) {
    return this.node.__shady_contains(a);
  };n.dispatchEvent = function (a) {
    return this.node.__shady_dispatchEvent(a);
  };n.setAttribute = function (a, b) {
    this.node.__shady_setAttribute(a, b);
  };n.getAttribute = function (a) {
    return this.node.__shady_native_getAttribute(a);
  };n.removeAttribute = function (a) {
    this.node.__shady_removeAttribute(a);
  };n.attachShadow = function (a) {
    return this.node.__shady_attachShadow(a);
  };
  n.focus = function () {
    this.node.__shady_native_focus();
  };n.blur = function () {
    this.node.__shady_blur();
  };n.importNode = function (a, b) {
    if (this.node.nodeType === Node.DOCUMENT_NODE) return this.node.__shady_importNode(a, b);
  };n.getElementById = function (a) {
    if (this.node.nodeType === Node.DOCUMENT_NODE) return this.node.__shady_getElementById(a);
  };n.querySelector = function (a) {
    return this.node.__shady_querySelector(a);
  };n.querySelectorAll = function (a, b) {
    return this.node.__shady_querySelectorAll(a, b);
  };
  n.assignedNodes = function (a) {
    if ("slot" === this.node.localName) return this.node.__shady_assignedNodes(a);
  };
  da.Object.defineProperties(Sc.prototype, { activeElement: { configurable: !0, enumerable: !0, get: function () {
        if (v(this.node) || this.node.nodeType === Node.DOCUMENT_NODE) return this.node.__shady_activeElement;
      } }, _activeElement: { configurable: !0, enumerable: !0, get: function () {
        return this.activeElement;
      } }, host: { configurable: !0, enumerable: !0, get: function () {
        if (v(this.node)) return this.node.host;
      } }, parentNode: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_parentNode;
      } }, firstChild: { configurable: !0,
      enumerable: !0, get: function () {
        return this.node.__shady_firstChild;
      } }, lastChild: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_lastChild;
      } }, nextSibling: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_nextSibling;
      } }, previousSibling: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_previousSibling;
      } }, childNodes: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_childNodes;
      } }, parentElement: { configurable: !0, enumerable: !0,
      get: function () {
        return this.node.__shady_parentElement;
      } }, firstElementChild: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_firstElementChild;
      } }, lastElementChild: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_lastElementChild;
      } }, nextElementSibling: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_nextElementSibling;
      } }, previousElementSibling: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_previousElementSibling;
      } },
    children: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_children;
      } }, childElementCount: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_childElementCount;
      } }, shadowRoot: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_shadowRoot;
      } }, assignedSlot: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_assignedSlot;
      } }, isConnected: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_isConnected;
      } }, innerHTML: { configurable: !0,
      enumerable: !0, get: function () {
        return this.node.__shady_innerHTML;
      }, set: function (a) {
        this.node.__shady_innerHTML = a;
      } }, textContent: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_textContent;
      }, set: function (a) {
        this.node.__shady_textContent = a;
      } }, slot: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_slot;
      }, set: function (a) {
        this.node.__shady_slot = a;
      } }, className: { configurable: !0, enumerable: !0, get: function () {
        return this.node.__shady_className;
      }, set: function (a) {
        return this.node.__shady_className = a;
      } } });Db.forEach(function (a) {
    Object.defineProperty(Sc.prototype, a, { get: function () {
        return this.node["__shady_" + a];
      }, set: function (b) {
        this.node["__shady_" + a] = b;
      }, configurable: !0 });
  });var Tc = new WeakMap();function Uc(a) {
    if (v(a) || a instanceof Sc) return a;var b = Tc.get(a);b || (b = new Sc(a), Tc.set(a, b));return b;
  };if (t.T) {
    var Vc = t.i ? function (a) {
      return a;
    } : function (a) {
      cb(a);bb(a);return a;
    },
        ShadyDOM = { inUse: t.T, patch: Vc, isShadyRoot: v, enqueue: ya, flush: za, flushInitial: function (a) {
        !a.Z && a.D && ac(a);
      }, settings: t, filterMutations: Ea, observeChildren: Ca, unobserveChildren: Da, deferConnectionCallbacks: t.deferConnectionCallbacks, preferPerformance: t.preferPerformance, handlesDynamicScoping: !0, wrap: t.l ? Uc : Vc, wrapIfNeeded: !0 === t.l ? Uc : function (a) {
        return a;
      }, Wrapper: Sc, composedPath: lb, noPatch: t.l, patchOnDemand: t.W, nativeMethods: Na,
      nativeTree: Oa, patchElementProto: Dc };window.ShadyDOM = ShadyDOM;Va();Cc("__shady_");Object.defineProperty(document, "_activeElement", wc.activeElement);x(Window.prototype, zc, "__shady_");t.l ? t.W && x(Element.prototype, qc) : (Cc(), Cb());xb();window.Event = zb;window.CustomEvent = Ab;window.MouseEvent = Bb;window.ShadowRoot = oc;
  }; /*
     Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
     This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
     The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
     The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
     Code distributed by Google as part of the polymer project is also
     subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
     */
  var Wc = window.Document.prototype.createElement,
      Xc = window.Document.prototype.createElementNS,
      Yc = window.Document.prototype.importNode,
      Zc = window.Document.prototype.prepend,
      $c = window.Document.prototype.append,
      ad = window.DocumentFragment.prototype.prepend,
      bd = window.DocumentFragment.prototype.append,
      cd = window.Node.prototype.cloneNode,
      dd = window.Node.prototype.appendChild,
      ed = window.Node.prototype.insertBefore,
      fd = window.Node.prototype.removeChild,
      gd = window.Node.prototype.replaceChild,
      hd = Object.getOwnPropertyDescriptor(window.Node.prototype, "textContent"),
      id = window.Element.prototype.attachShadow,
      jd = Object.getOwnPropertyDescriptor(window.Element.prototype, "innerHTML"),
      kd = window.Element.prototype.getAttribute,
      ld = window.Element.prototype.setAttribute,
      md = window.Element.prototype.removeAttribute,
      nd = window.Element.prototype.getAttributeNS,
      od = window.Element.prototype.setAttributeNS,
      pd = window.Element.prototype.removeAttributeNS,
      qd = window.Element.prototype.insertAdjacentElement,
      rd = window.Element.prototype.insertAdjacentHTML,
      sd = window.Element.prototype.prepend,
      td = window.Element.prototype.append,
      ud = window.Element.prototype.before,
      vd = window.Element.prototype.after,
      wd = window.Element.prototype.replaceWith,
      xd = window.Element.prototype.remove,
      yd = window.HTMLElement,
      zd = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "innerHTML"),
      Ad = window.HTMLElement.prototype.insertAdjacentElement,
      Bd = window.HTMLElement.prototype.insertAdjacentHTML;var Cd = new Set();"annotation-xml color-profile font-face font-face-src font-face-uri font-face-format font-face-name missing-glyph".split(" ").forEach(function (a) {
    return Cd.add(a);
  });function Dd(a) {
    var b = Cd.has(a);a = /^[a-z][.0-9_a-z]*-[\-.0-9_a-z]*$/.test(a);return !b && a;
  }var Ed = document.contains ? document.contains.bind(document) : document.documentElement.contains.bind(document.documentElement);
  function K(a) {
    var b = a.isConnected;if (void 0 !== b) return b;if (Ed(a)) return !0;for (; a && !(a.__CE_isImportDocument || a instanceof Document);) a = a.parentNode || (window.ShadowRoot && a instanceof ShadowRoot ? a.host : void 0);return !(!a || !(a.__CE_isImportDocument || a instanceof Document));
  }function Fd(a) {
    var b = a.children;if (b) return Array.prototype.slice.call(b);b = [];for (a = a.firstChild; a; a = a.nextSibling) a.nodeType === Node.ELEMENT_NODE && b.push(a);return b;
  }
  function Gd(a, b) {
    for (; b && b !== a && !b.nextSibling;) b = b.parentNode;return b && b !== a ? b.nextSibling : null;
  }
  function Hd(a, b, c) {
    for (var d = a; d;) {
      if (d.nodeType === Node.ELEMENT_NODE) {
        var e = d;b(e);var f = e.localName;if ("link" === f && "import" === e.getAttribute("rel")) {
          d = e.import;void 0 === c && (c = new Set());if (d instanceof Node && !c.has(d)) for (c.add(d), d = d.firstChild; d; d = d.nextSibling) Hd(d, b, c);d = Gd(a, e);continue;
        } else if ("template" === f) {
          d = Gd(a, e);continue;
        }if (e = e.__CE_shadowRoot) for (e = e.firstChild; e; e = e.nextSibling) Hd(e, b, c);
      }d = d.firstChild ? d.firstChild : Gd(a, d);
    }
  }function L(a, b, c) {
    a[b] = c;
  };function Id(a) {
    var b = document;this.b = a;this.a = b;this.C = void 0;M(this.b, this.a);"loading" === this.a.readyState && (this.C = new MutationObserver(this.c.bind(this)), this.C.observe(this.a, { childList: !0, subtree: !0 }));
  }function Jd(a) {
    a.C && a.C.disconnect();
  }Id.prototype.c = function (a) {
    var b = this.a.readyState;"interactive" !== b && "complete" !== b || Jd(this);for (b = 0; b < a.length; b++) for (var c = a[b].addedNodes, d = 0; d < c.length; d++) M(this.b, c[d]);
  };function Kd() {
    var a = this;this.b = this.a = void 0;this.c = new Promise(function (b) {
      a.b = b;a.a && b(a.a);
    });
  }function Ld(a) {
    if (a.a) throw Error("Already resolved.");a.a = void 0;a.b && a.b(void 0);
  };function N(a) {
    this.f = new Map();this.j = new Map();this.ca = new Map();this.S = !1;this.b = a;this.U = new Map();this.c = function (b) {
      return b();
    };this.a = !1;this.w = [];this.da = a.f ? new Id(a) : void 0;
  }n = N.prototype;n.ua = function (a, b) {
    var c = this;if (!(b instanceof Function)) throw new TypeError("Custom element constructor getters must be functions.");Md(this, a);this.f.set(a, b);this.w.push(a);this.a || (this.a = !0, this.c(function () {
      return Nd(c);
    }));
  };
  n.define = function (a, b) {
    var c = this;if (!(b instanceof Function)) throw new TypeError("Custom element constructors must be functions.");Md(this, a);Od(this, a, b);this.w.push(a);this.a || (this.a = !0, this.c(function () {
      return Nd(c);
    }));
  };function Md(a, b) {
    if (!Dd(b)) throw new SyntaxError("The element name '" + b + "' is not valid.");if (Pd(a, b)) throw Error("A custom element with name '" + b + "' has already been defined.");if (a.S) throw Error("A custom element is already being defined.");
  }
  function Od(a, b, c) {
    a.S = !0;var d;try {
      var e = function (m) {
        var q = f[m];if (void 0 !== q && !(q instanceof Function)) throw Error("The '" + m + "' callback must be a function.");return q;
      },
          f = c.prototype;if (!(f instanceof Object)) throw new TypeError("The custom element constructor's prototype is not an object.");var g = e("connectedCallback");var h = e("disconnectedCallback");var k = e("adoptedCallback");var l = (d = e("attributeChangedCallback")) && c.observedAttributes || [];
    } catch (m) {
      throw m;
    } finally {
      a.S = !1;
    }c = { localName: b, constructorFunction: c,
      connectedCallback: g, disconnectedCallback: h, adoptedCallback: k, attributeChangedCallback: d, observedAttributes: l, constructionStack: [] };a.j.set(b, c);a.ca.set(c.constructorFunction, c);return c;
  }n.upgrade = function (a) {
    M(this.b, a);
  };
  function Nd(a) {
    if (!1 !== a.a) {
      a.a = !1;for (var b = [], c = a.w, d = new Map(), e = 0; e < c.length; e++) d.set(c[e], []);M(a.b, document, { upgrade: function (k) {
          if (void 0 === k.__CE_state) {
            var l = k.localName,
                m = d.get(l);m ? m.push(k) : a.j.has(l) && b.push(k);
          }
        } });for (e = 0; e < b.length; e++) Qd(a.b, b[e]);for (e = 0; e < c.length; e++) {
        for (var f = c[e], g = d.get(f), h = 0; h < g.length; h++) Qd(a.b, g[h]);(f = a.U.get(f)) && Ld(f);
      }c.length = 0;
    }
  }n.get = function (a) {
    if (a = Pd(this, a)) return a.constructorFunction;
  };
  n.whenDefined = function (a) {
    if (!Dd(a)) return Promise.reject(new SyntaxError("'" + a + "' is not a valid custom element name."));var b = this.U.get(a);if (b) return b.c;b = new Kd();this.U.set(a, b);var c = this.j.has(a) || this.f.has(a);a = -1 === this.w.indexOf(a);c && a && Ld(b);return b.c;
  };n.polyfillWrapFlushCallback = function (a) {
    this.da && Jd(this.da);var b = this.c;this.c = function (c) {
      return a(function () {
        return b(c);
      });
    };
  };
  function Pd(a, b) {
    var c = a.j.get(b);if (c) return c;if (c = a.f.get(b)) {
      a.f.delete(b);try {
        return Od(a, b, c());
      } catch (d) {
        Rd(d);
      }
    }
  }window.CustomElementRegistry = N;N.prototype.define = N.prototype.define;N.prototype.upgrade = N.prototype.upgrade;N.prototype.get = N.prototype.get;N.prototype.whenDefined = N.prototype.whenDefined;N.prototype.polyfillDefineLazy = N.prototype.ua;N.prototype.polyfillWrapFlushCallback = N.prototype.polyfillWrapFlushCallback;function Sd() {
    var a = O && O.noDocumentConstructionObserver,
        b = O && O.shadyDomFastWalk;this.b = [];this.c = [];this.a = !1;this.shadyDomFastWalk = b;this.f = !a;
  }function Td(a, b, c, d) {
    var e = window.ShadyDOM;if (a.shadyDomFastWalk && e && e.inUse) {
      if (b.nodeType === Node.ELEMENT_NODE && c(b), b.querySelectorAll) for (a = e.nativeMethods.querySelectorAll.call(b, "*"), b = 0; b < a.length; b++) c(a[b]);
    } else Hd(b, c, d);
  }function Ud(a, b) {
    a.a = !0;a.b.push(b);
  }function Vd(a, b) {
    a.a = !0;a.c.push(b);
  }
  function Wd(a, b) {
    a.a && Td(a, b, function (c) {
      return Xd(a, c);
    });
  }function Xd(a, b) {
    if (a.a && !b.__CE_patched) {
      b.__CE_patched = !0;for (var c = 0; c < a.b.length; c++) a.b[c](b);for (c = 0; c < a.c.length; c++) a.c[c](b);
    }
  }function P(a, b) {
    var c = [];Td(a, b, function (e) {
      return c.push(e);
    });for (b = 0; b < c.length; b++) {
      var d = c[b];1 === d.__CE_state ? a.connectedCallback(d) : Qd(a, d);
    }
  }function Q(a, b) {
    var c = [];Td(a, b, function (e) {
      return c.push(e);
    });for (b = 0; b < c.length; b++) {
      var d = c[b];1 === d.__CE_state && a.disconnectedCallback(d);
    }
  }
  function M(a, b, c) {
    c = void 0 === c ? {} : c;var d = c.Da,
        e = c.upgrade || function (g) {
      return Qd(a, g);
    },
        f = [];Td(a, b, function (g) {
      a.a && Xd(a, g);if ("link" === g.localName && "import" === g.getAttribute("rel")) {
        var h = g.import;h instanceof Node && (h.__CE_isImportDocument = !0, h.__CE_registry = document.__CE_registry);h && "complete" === h.readyState ? h.__CE_documentLoadHandled = !0 : g.addEventListener("load", function () {
          var k = g.import;if (!k.__CE_documentLoadHandled) {
            k.__CE_documentLoadHandled = !0;var l = new Set();d && (d.forEach(function (m) {
              return l.add(m);
            }), l.delete(k));M(a, k, { Da: l, upgrade: e });
          }
        });
      } else f.push(g);
    }, d);for (b = 0; b < f.length; b++) e(f[b]);
  }
  function Qd(a, b) {
    try {
      var c = b.ownerDocument,
          d = c.__CE_registry;var e = d && (c.defaultView || c.__CE_isImportDocument) ? Pd(d, b.localName) : void 0;if (e && void 0 === b.__CE_state) {
        e.constructionStack.push(b);try {
          try {
            if (new e.constructorFunction() !== b) throw Error("The custom element constructor did not produce the element being upgraded.");
          } finally {
            e.constructionStack.pop();
          }
        } catch (k) {
          throw b.__CE_state = 2, k;
        }b.__CE_state = 1;b.__CE_definition = e;if (e.attributeChangedCallback && b.hasAttributes()) {
          var f = e.observedAttributes;
          for (e = 0; e < f.length; e++) {
            var g = f[e],
                h = b.getAttribute(g);null !== h && a.attributeChangedCallback(b, g, null, h, null);
          }
        }K(b) && a.connectedCallback(b);
      }
    } catch (k) {
      Rd(k);
    }
  }Sd.prototype.connectedCallback = function (a) {
    var b = a.__CE_definition;if (b.connectedCallback) try {
      b.connectedCallback.call(a);
    } catch (c) {
      Rd(c);
    }
  };Sd.prototype.disconnectedCallback = function (a) {
    var b = a.__CE_definition;if (b.disconnectedCallback) try {
      b.disconnectedCallback.call(a);
    } catch (c) {
      Rd(c);
    }
  };
  Sd.prototype.attributeChangedCallback = function (a, b, c, d, e) {
    var f = a.__CE_definition;if (f.attributeChangedCallback && -1 < f.observedAttributes.indexOf(b)) try {
      f.attributeChangedCallback.call(a, b, c, d, e);
    } catch (g) {
      Rd(g);
    }
  };
  function Yd(a, b, c, d) {
    var e = b.__CE_registry;if (e && (null === d || "http://www.w3.org/1999/xhtml" === d) && (e = Pd(e, c))) try {
      var f = new e.constructorFunction();if (void 0 === f.__CE_state || void 0 === f.__CE_definition) throw Error("Failed to construct '" + c + "': The returned value was not constructed with the HTMLElement constructor.");if ("http://www.w3.org/1999/xhtml" !== f.namespaceURI) throw Error("Failed to construct '" + c + "': The constructed element's namespace must be the HTML namespace.");if (f.hasAttributes()) throw Error("Failed to construct '" + c + "': The constructed element must not have any attributes.");if (null !== f.firstChild) throw Error("Failed to construct '" + c + "': The constructed element must not have any children.");if (null !== f.parentNode) throw Error("Failed to construct '" + c + "': The constructed element must not have a parent node.");if (f.ownerDocument !== b) throw Error("Failed to construct '" + c + "': The constructed element's owner document is incorrect.");if (f.localName !== c) throw Error("Failed to construct '" + c + "': The constructed element's local name is incorrect.");
      return f;
    } catch (g) {
      return Rd(g), b = null === d ? Wc.call(b, c) : Xc.call(b, d, c), Object.setPrototypeOf(b, HTMLUnknownElement.prototype), b.__CE_state = 2, b.__CE_definition = void 0, Xd(a, b), b;
    }b = null === d ? Wc.call(b, c) : Xc.call(b, d, c);Xd(a, b);return b;
  }
  function Rd(a) {
    var b = a.message,
        c = a.sourceURL || a.fileName || "",
        d = a.line || a.lineNumber || 0,
        e = a.column || a.columnNumber || 0,
        f = void 0;void 0 === ErrorEvent.prototype.initErrorEvent ? f = new ErrorEvent("error", { cancelable: !0, message: b, filename: c, lineno: d, colno: e, error: a }) : (f = document.createEvent("ErrorEvent"), f.initErrorEvent("error", !1, !0, b, c, d), f.preventDefault = function () {
      Object.defineProperty(this, "defaultPrevented", { configurable: !0, get: function () {
          return !0;
        } });
    });void 0 === f.error && Object.defineProperty(f, "error", { configurable: !0, enumerable: !0, get: function () {
        return a;
      } });window.dispatchEvent(f);f.defaultPrevented || console.error(a);
  };var Zd = new function () {}();function $d(a) {
    window.HTMLElement = function () {
      function b() {
        var c = this.constructor;var d = document.__CE_registry.ca.get(c);if (!d) throw Error("Failed to construct a custom element: The constructor was not registered with `customElements`.");var e = d.constructionStack;if (0 === e.length) return e = Wc.call(document, d.localName), Object.setPrototypeOf(e, c.prototype), e.__CE_state = 1, e.__CE_definition = d, Xd(a, e), e;var f = e.length - 1,
            g = e[f];if (g === Zd) throw Error("Failed to construct '" + d.localName + "': This element was already constructed.");
        e[f] = Zd;Object.setPrototypeOf(g, c.prototype);Xd(a, g);return g;
      }b.prototype = yd.prototype;Object.defineProperty(b.prototype, "constructor", { writable: !0, configurable: !0, enumerable: !1, value: b });return b;
    }();
  };function ae(a, b, c) {
    function d(e) {
      return function (f) {
        for (var g = [], h = 0; h < arguments.length; ++h) g[h] = arguments[h];h = [];for (var k = [], l = 0; l < g.length; l++) {
          var m = g[l];m instanceof Element && K(m) && k.push(m);if (m instanceof DocumentFragment) for (m = m.firstChild; m; m = m.nextSibling) h.push(m);else h.push(m);
        }e.apply(this, g);for (g = 0; g < k.length; g++) Q(a, k[g]);if (K(this)) for (g = 0; g < h.length; g++) k = h[g], k instanceof Element && P(a, k);
      };
    }void 0 !== c.prepend && L(b, "prepend", d(c.prepend));void 0 !== c.append && L(b, "append", d(c.append));
  }
  ;function be(a) {
    L(Document.prototype, "createElement", function (b) {
      return Yd(a, this, b, null);
    });L(Document.prototype, "importNode", function (b, c) {
      b = Yc.call(this, b, !!c);this.__CE_registry ? M(a, b) : Wd(a, b);return b;
    });L(Document.prototype, "createElementNS", function (b, c) {
      return Yd(a, this, c, b);
    });ae(a, Document.prototype, { prepend: Zc, append: $c });
  };function ce(a) {
    function b(c, d) {
      Object.defineProperty(c, "textContent", { enumerable: d.enumerable, configurable: !0, get: d.get, set: function (e) {
          if (this.nodeType === Node.TEXT_NODE) d.set.call(this, e);else {
            var f = void 0;if (this.firstChild) {
              var g = this.childNodes,
                  h = g.length;if (0 < h && K(this)) {
                f = Array(h);for (var k = 0; k < h; k++) f[k] = g[k];
              }
            }d.set.call(this, e);if (f) for (e = 0; e < f.length; e++) Q(a, f[e]);
          }
        } });
    }L(Node.prototype, "insertBefore", function (c, d) {
      if (c instanceof DocumentFragment) {
        var e = Fd(c);c = ed.call(this, c, d);if (K(this)) for (d = 0; d < e.length; d++) P(a, e[d]);return c;
      }e = c instanceof Element && K(c);d = ed.call(this, c, d);e && Q(a, c);K(this) && P(a, c);return d;
    });L(Node.prototype, "appendChild", function (c) {
      if (c instanceof DocumentFragment) {
        var d = Fd(c);c = dd.call(this, c);if (K(this)) for (var e = 0; e < d.length; e++) P(a, d[e]);return c;
      }d = c instanceof Element && K(c);e = dd.call(this, c);d && Q(a, c);K(this) && P(a, c);return e;
    });L(Node.prototype, "cloneNode", function (c) {
      c = cd.call(this, !!c);this.ownerDocument.__CE_registry ? M(a, c) : Wd(a, c);return c;
    });L(Node.prototype, "removeChild", function (c) {
      var d = c instanceof Element && K(c),
          e = fd.call(this, c);d && Q(a, c);return e;
    });L(Node.prototype, "replaceChild", function (c, d) {
      if (c instanceof DocumentFragment) {
        var e = Fd(c);c = gd.call(this, c, d);if (K(this)) for (Q(a, d), d = 0; d < e.length; d++) P(a, e[d]);return c;
      }e = c instanceof Element && K(c);var f = gd.call(this, c, d),
          g = K(this);g && Q(a, d);e && Q(a, c);g && P(a, c);return f;
    });hd && hd.get ? b(Node.prototype, hd) : Ud(a, function (c) {
      b(c, { enumerable: !0, configurable: !0, get: function () {
          for (var d = [], e = this.firstChild; e; e = e.nextSibling) e.nodeType !== Node.COMMENT_NODE && d.push(e.textContent);return d.join("");
        }, set: function (d) {
          for (; this.firstChild;) fd.call(this, this.firstChild);null != d && "" !== d && dd.call(this, document.createTextNode(d));
        } });
    });
  };function de(a) {
    function b(d) {
      return function (e) {
        for (var f = [], g = 0; g < arguments.length; ++g) f[g] = arguments[g];g = [];for (var h = [], k = 0; k < f.length; k++) {
          var l = f[k];l instanceof Element && K(l) && h.push(l);if (l instanceof DocumentFragment) for (l = l.firstChild; l; l = l.nextSibling) g.push(l);else g.push(l);
        }d.apply(this, f);for (f = 0; f < h.length; f++) Q(a, h[f]);if (K(this)) for (f = 0; f < g.length; f++) h = g[f], h instanceof Element && P(a, h);
      };
    }var c = Element.prototype;void 0 !== ud && L(c, "before", b(ud));void 0 !== vd && L(c, "after", b(vd));void 0 !== wd && L(c, "replaceWith", function (d) {
      for (var e = [], f = 0; f < arguments.length; ++f) e[f] = arguments[f];f = [];for (var g = [], h = 0; h < e.length; h++) {
        var k = e[h];k instanceof Element && K(k) && g.push(k);if (k instanceof DocumentFragment) for (k = k.firstChild; k; k = k.nextSibling) f.push(k);else f.push(k);
      }h = K(this);wd.apply(this, e);for (e = 0; e < g.length; e++) Q(a, g[e]);if (h) for (Q(a, this), e = 0; e < f.length; e++) g = f[e], g instanceof Element && P(a, g);
    });void 0 !== xd && L(c, "remove", function () {
      var d = K(this);xd.call(this);d && Q(a, this);
    });
  };function ee(a) {
    function b(e, f) {
      Object.defineProperty(e, "innerHTML", { enumerable: f.enumerable, configurable: !0, get: f.get, set: function (g) {
          var h = this,
              k = void 0;K(this) && (k = [], Td(a, this, function (q) {
            q !== h && k.push(q);
          }));f.set.call(this, g);if (k) for (var l = 0; l < k.length; l++) {
            var m = k[l];1 === m.__CE_state && a.disconnectedCallback(m);
          }this.ownerDocument.__CE_registry ? M(a, this) : Wd(a, this);return g;
        } });
    }function c(e, f) {
      L(e, "insertAdjacentElement", function (g, h) {
        var k = K(h);g = f.call(this, g, h);k && Q(a, h);K(g) && P(a, h);return g;
      });
    }
    function d(e, f) {
      function g(h, k) {
        for (var l = []; h !== k; h = h.nextSibling) l.push(h);for (k = 0; k < l.length; k++) M(a, l[k]);
      }L(e, "insertAdjacentHTML", function (h, k) {
        h = h.toLowerCase();if ("beforebegin" === h) {
          var l = this.previousSibling;f.call(this, h, k);g(l || this.parentNode.firstChild, this);
        } else if ("afterbegin" === h) l = this.firstChild, f.call(this, h, k), g(this.firstChild, l);else if ("beforeend" === h) l = this.lastChild, f.call(this, h, k), g(l || this.firstChild, null);else if ("afterend" === h) l = this.nextSibling, f.call(this, h, k), g(this.nextSibling, l);else throw new SyntaxError("The value provided (" + String(h) + ") is not one of 'beforebegin', 'afterbegin', 'beforeend', or 'afterend'.");
      });
    }id && L(Element.prototype, "attachShadow", function (e) {
      e = id.call(this, e);if (a.a && !e.__CE_patched) {
        e.__CE_patched = !0;for (var f = 0; f < a.b.length; f++) a.b[f](e);
      }return this.__CE_shadowRoot = e;
    });jd && jd.get ? b(Element.prototype, jd) : zd && zd.get ? b(HTMLElement.prototype, zd) : Vd(a, function (e) {
      b(e, { enumerable: !0, configurable: !0, get: function () {
          return cd.call(this, !0).innerHTML;
        },
        set: function (f) {
          var g = "template" === this.localName,
              h = g ? this.content : this,
              k = Xc.call(document, this.namespaceURI, this.localName);for (k.innerHTML = f; 0 < h.childNodes.length;) fd.call(h, h.childNodes[0]);for (f = g ? k.content : k; 0 < f.childNodes.length;) dd.call(h, f.childNodes[0]);
        } });
    });L(Element.prototype, "setAttribute", function (e, f) {
      if (1 !== this.__CE_state) return ld.call(this, e, f);var g = kd.call(this, e);ld.call(this, e, f);f = kd.call(this, e);a.attributeChangedCallback(this, e, g, f, null);
    });L(Element.prototype, "setAttributeNS", function (e, f, g) {
      if (1 !== this.__CE_state) return od.call(this, e, f, g);var h = nd.call(this, e, f);od.call(this, e, f, g);g = nd.call(this, e, f);a.attributeChangedCallback(this, f, h, g, e);
    });L(Element.prototype, "removeAttribute", function (e) {
      if (1 !== this.__CE_state) return md.call(this, e);var f = kd.call(this, e);md.call(this, e);null !== f && a.attributeChangedCallback(this, e, f, null, null);
    });L(Element.prototype, "removeAttributeNS", function (e, f) {
      if (1 !== this.__CE_state) return pd.call(this, e, f);var g = nd.call(this, e, f);pd.call(this, e, f);var h = nd.call(this, e, f);g !== h && a.attributeChangedCallback(this, f, g, h, e);
    });Ad ? c(HTMLElement.prototype, Ad) : qd && c(Element.prototype, qd);Bd ? d(HTMLElement.prototype, Bd) : rd && d(Element.prototype, rd);ae(a, Element.prototype, { prepend: sd, append: td });de(a);
  };var O = window.customElements;function fe() {
    var a = new Sd();$d(a);be(a);ae(a, DocumentFragment.prototype, { prepend: ad, append: bd });ce(a);ee(a);a = new N(a);document.__CE_registry = a;Object.defineProperty(window, "customElements", { configurable: !0, enumerable: !0, value: a });
  }O && !O.forcePolyfill && "function" == typeof O.define && "function" == typeof O.get || fe();window.__CE_installPolyfill = fe; /*
                                                                                                                                  Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
                                                                                                                                  This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
                                                                                                                                  The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
                                                                                                                                  The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
                                                                                                                                  Code distributed by Google as part of the polymer project is also
                                                                                                                                  subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
                                                                                                                                  */
  function ge() {
    this.end = this.start = 0;this.rules = this.parent = this.previous = null;this.cssText = this.parsedCssText = "";this.atRule = !1;this.type = 0;this.parsedSelector = this.selector = this.keyframesName = "";
  }
  function he(a) {
    var b = a = a.replace(ie, "").replace(je, ""),
        c = new ge();c.start = 0;c.end = b.length;for (var d = c, e = 0, f = b.length; e < f; e++) if ("{" === b[e]) {
      d.rules || (d.rules = []);var g = d,
          h = g.rules[g.rules.length - 1] || null;d = new ge();d.start = e + 1;d.parent = g;d.previous = h;g.rules.push(d);
    } else "}" === b[e] && (d.end = e + 1, d = d.parent || c);return ke(c, a);
  }
  function ke(a, b) {
    var c = b.substring(a.start, a.end - 1);a.parsedCssText = a.cssText = c.trim();a.parent && (c = b.substring(a.previous ? a.previous.end : a.parent.start, a.start - 1), c = le(c), c = c.replace(me, " "), c = c.substring(c.lastIndexOf(";") + 1), c = a.parsedSelector = a.selector = c.trim(), a.atRule = 0 === c.indexOf("@"), a.atRule ? 0 === c.indexOf("@media") ? a.type = ne : c.match(oe) && (a.type = pe, a.keyframesName = a.selector.split(me).pop()) : a.type = 0 === c.indexOf("--") ? qe : re);if (c = a.rules) for (var d = 0, e = c.length, f = void 0; d < e && (f = c[d]); d++) ke(f, b);return a;
  }function le(a) {
    return a.replace(/\\([0-9a-f]{1,6})\s/gi, function (b, c) {
      b = c;for (c = 6 - b.length; c--;) b = "0" + b;return "\\" + b;
    });
  }
  function se(a, b, c) {
    c = void 0 === c ? "" : c;var d = "";if (a.cssText || a.rules) {
      var e = a.rules,
          f;if (f = e) f = e[0], f = !(f && f.selector && 0 === f.selector.indexOf("--"));if (f) {
        f = 0;for (var g = e.length, h = void 0; f < g && (h = e[f]); f++) d = se(h, b, d);
      } else b ? b = a.cssText : (b = a.cssText, b = b.replace(te, "").replace(ue, ""), b = b.replace(ve, "").replace(we, "")), (d = b.trim()) && (d = "  " + d + "\n");
    }d && (a.selector && (c += a.selector + " {\n"), c += d, a.selector && (c += "}\n\n"));return c;
  }
  var re = 1,
      pe = 7,
      ne = 4,
      qe = 1E3,
      ie = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//gim,
      je = /@import[^;]*;/gim,
      te = /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
      ue = /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
      ve = /@apply\s*\(?[^);]*\)?\s*(?:[;\n]|$)?/gim,
      we = /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
      oe = /^@[^\s]*keyframes/,
      me = /\s+/g;var R = !(window.ShadyDOM && window.ShadyDOM.inUse),
      xe;function ye(a) {
    xe = a && a.shimcssproperties ? !1 : R || !(navigator.userAgent.match(/AppleWebKit\/601|Edge\/15/) || !window.CSS || !CSS.supports || !CSS.supports("box-shadow", "0 0 0 var(--foo)"));
  }var ze;window.ShadyCSS && void 0 !== window.ShadyCSS.cssBuild && (ze = window.ShadyCSS.cssBuild);var Ae = !(!window.ShadyCSS || !window.ShadyCSS.disableRuntime);
  window.ShadyCSS && void 0 !== window.ShadyCSS.nativeCss ? xe = window.ShadyCSS.nativeCss : window.ShadyCSS ? (ye(window.ShadyCSS), window.ShadyCSS = void 0) : ye(window.WebComponents && window.WebComponents.flags);var S = xe;var Be = /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};{])+)|\{([^}]*)\}(?:(?=[;\s}])|$))/gi,
      Ce = /(?:^|\W+)@apply\s*\(?([^);\n]*)\)?/gi,
      De = /(--[\w-]+)\s*([:,;)]|$)/gi,
      Ee = /(animation\s*:)|(animation-name\s*:)/,
      Fe = /@media\s(.*)/,
      Ge = /\{[^}]*\}/g;var He = new Set();function Ie(a, b) {
    if (!a) return "";"string" === typeof a && (a = he(a));b && Je(a, b);return se(a, S);
  }function Ke(a) {
    !a.__cssRules && a.textContent && (a.__cssRules = he(a.textContent));return a.__cssRules || null;
  }function Le(a) {
    return !!a.parent && a.parent.type === pe;
  }function Je(a, b, c, d) {
    if (a) {
      var e = !1,
          f = a.type;if (d && f === ne) {
        var g = a.selector.match(Fe);g && (window.matchMedia(g[1]).matches || (e = !0));
      }f === re ? b(a) : c && f === pe ? c(a) : f === qe && (e = !0);if ((a = a.rules) && !e) for (e = 0, f = a.length, g = void 0; e < f && (g = a[e]); e++) Je(g, b, c, d);
    }
  }
  function Me(a, b, c, d) {
    var e = document.createElement("style");b && e.setAttribute("scope", b);e.textContent = a;Ne(e, c, d);return e;
  }var T = null;function Oe(a) {
    a = document.createComment(" Shady DOM styles for " + a + " ");var b = document.head;b.insertBefore(a, (T ? T.nextSibling : null) || b.firstChild);return T = a;
  }function Ne(a, b, c) {
    b = b || document.head;b.insertBefore(a, c && c.nextSibling || b.firstChild);T ? a.compareDocumentPosition(T) === Node.DOCUMENT_POSITION_PRECEDING && (T = a) : T = a;
  }
  function Pe(a, b) {
    for (var c = 0, d = a.length; b < d; b++) if ("(" === a[b]) c++;else if (")" === a[b] && 0 === --c) return b;return -1;
  }function Qe(a, b) {
    var c = a.indexOf("var(");if (-1 === c) return b(a, "", "", "");var d = Pe(a, c + 3),
        e = a.substring(c + 4, d);c = a.substring(0, c);a = Qe(a.substring(d + 1), b);d = e.indexOf(",");return -1 === d ? b(c, e.trim(), "", a) : b(c, e.substring(0, d).trim(), e.substring(d + 1).trim(), a);
  }function Re(a, b) {
    R ? a.setAttribute("class", b) : window.ShadyDOM.nativeMethods.setAttribute.call(a, "class", b);
  }
  var Se = window.ShadyDOM && window.ShadyDOM.wrap || function (a) {
    return a;
  };function U(a) {
    var b = a.localName,
        c = "";b ? -1 < b.indexOf("-") || (c = b, b = a.getAttribute && a.getAttribute("is") || "") : (b = a.is, c = a.extends);return { is: b, I: c };
  }function Te(a) {
    for (var b = [], c = "", d = 0; 0 <= d && d < a.length; d++) if ("(" === a[d]) {
      var e = Pe(a, d);c += a.slice(d, e + 1);d = e;
    } else "," === a[d] ? (b.push(c), c = "") : c += a[d];c && b.push(c);return b;
  }
  function Ue(a) {
    if (void 0 !== ze) return ze;if (void 0 === a.__cssBuild) {
      var b = a.getAttribute("css-build");if (b) a.__cssBuild = b;else {
        a: {
          b = "template" === a.localName ? a.content.firstChild : a.firstChild;if (b instanceof Comment && (b = b.textContent.trim().split(":"), "css-build" === b[0])) {
            b = b[1];break a;
          }b = "";
        }if ("" !== b) {
          var c = "template" === a.localName ? a.content.firstChild : a.firstChild;c.parentNode.removeChild(c);
        }a.__cssBuild = b;
      }
    }return a.__cssBuild || "";
  }
  function Ve(a) {
    a = void 0 === a ? "" : a;return "" !== a && S ? R ? "shadow" === a : "shady" === a : !1;
  };function We() {}function Xe(a, b) {
    Ye(V, a, function (c) {
      W(c, b || "");
    });
  }function Ye(a, b, c) {
    b.nodeType === Node.ELEMENT_NODE && c(b);var d;"template" === b.localName ? d = (b.content || b._content || b).childNodes : d = b.children || b.childNodes;if (d) for (b = 0; b < d.length; b++) Ye(a, d[b], c);
  }
  function W(a, b, c) {
    if (b) if (a.classList) c ? (a.classList.remove("style-scope"), a.classList.remove(b)) : (a.classList.add("style-scope"), a.classList.add(b));else if (a.getAttribute) {
      var d = a.getAttribute("class");c ? d && (b = d.replace("style-scope", "").replace(b, ""), Re(a, b)) : Re(a, (d ? d + " " : "") + "style-scope " + b);
    }
  }function Ze(a, b, c) {
    Ye(V, a, function (d) {
      W(d, b, !0);W(d, c);
    });
  }function $e(a, b) {
    Ye(V, a, function (c) {
      W(c, b || "", !0);
    });
  }
  function af(a, b, c, d, e) {
    var f = V;e = void 0 === e ? "" : e;"" === e && (R || "shady" === (void 0 === d ? "" : d) ? e = Ie(b, c) : (a = U(a), e = bf(f, b, a.is, a.I, c) + "\n\n"));return e.trim();
  }function bf(a, b, c, d, e) {
    var f = cf(c, d);c = c ? "." + c : "";return Ie(b, function (g) {
      g.c || (g.selector = g.h = df(a, g, a.b, c, f), g.c = !0);e && e(g, c, f);
    });
  }function cf(a, b) {
    return b ? "[is=" + a + "]" : a;
  }
  function df(a, b, c, d, e) {
    var f = Te(b.selector);if (!Le(b)) {
      b = 0;for (var g = f.length, h = void 0; b < g && (h = f[b]); b++) f[b] = c.call(a, h, d, e);
    }return f.filter(function (k) {
      return !!k;
    }).join(",");
  }function ef(a) {
    return a.replace(ff, function (b, c, d) {
      -1 < d.indexOf("+") ? d = d.replace(/\+/g, "___") : -1 < d.indexOf("___") && (d = d.replace(/___/g, "+"));return ":" + c + "(" + d + ")";
    });
  }
  function gf(a) {
    for (var b = [], c; c = a.match(hf);) {
      var d = c.index,
          e = Pe(a, d);if (-1 === e) throw Error(c.input + " selector missing ')'");c = a.slice(d, e + 1);a = a.replace(c, "\ue000");b.push(c);
    }return { Y: a, matches: b };
  }function jf(a, b) {
    var c = a.split("\ue000");return b.reduce(function (d, e, f) {
      return d + e + c[f + 1];
    }, c[0]);
  }
  We.prototype.b = function (a, b, c) {
    var d = !1;a = a.trim();var e = ff.test(a);e && (a = a.replace(ff, function (h, k, l) {
      return ":" + k + "(" + l.replace(/\s/g, "") + ")";
    }), a = ef(a));var f = hf.test(a);if (f) {
      var g = gf(a);a = g.Y;g = g.matches;
    }a = a.replace(kf, ":host $1");a = a.replace(lf, function (h, k, l) {
      d || (h = mf(l, k, b, c), d = d || h.stop, k = h.oa, l = h.value);return k + l;
    });f && (a = jf(a, g));e && (a = ef(a));return a = a.replace(nf, function (h, k, l, m) {
      return '[dir="' + l + '"] ' + k + m + ", " + k + '[dir="' + l + '"]' + m;
    });
  };
  function mf(a, b, c, d) {
    var e = a.indexOf("::slotted");0 <= a.indexOf(":host") ? a = of(a, d) : 0 !== e && (a = c ? pf(a, c) : a);c = !1;0 <= e && (b = "", c = !0);if (c) {
      var f = !0;c && (a = a.replace(qf, function (g, h) {
        return " > " + h;
      }));
    }return { value: a, oa: b, stop: f };
  }function pf(a, b) {
    a = a.split(/(\[.+?\])/);for (var c = [], d = 0; d < a.length; d++) if (1 === d % 2) c.push(a[d]);else {
      var e = a[d];if ("" !== e || d !== a.length - 1) e = e.split(":"), e[0] += b, c.push(e.join(":"));
    }return c.join("");
  }
  function of(a, b) {
    var c = a.match(rf);return (c = c && c[2].trim() || "") ? c[0].match(sf) ? a.replace(rf, function (d, e, f) {
      return b + f;
    }) : c.split(sf)[0] === b ? c : "should_not_match" : a.replace(":host", b);
  }function tf(a) {
    ":root" === a.selector && (a.selector = "html");
  }We.prototype.c = function (a) {
    return a.match(":host") ? "" : a.match("::slotted") ? this.b(a, ":not(.style-scope)") : pf(a.trim(), ":not(.style-scope)");
  };da.Object.defineProperties(We.prototype, { a: { configurable: !0, enumerable: !0, get: function () {
        return "style-scope";
      } } });
  var ff = /:(nth[-\w]+)\(([^)]+)\)/,
      lf = /(^|[\s>+~]+)((?:\[.+?\]|[^\s>+~=[])+)/g,
      sf = /[[.:#*]/,
      kf = /^(::slotted)/,
      rf = /(:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/,
      qf = /(?:::slotted)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/,
      nf = /(.*):dir\((?:(ltr|rtl))\)(.*)/,
      hf = /:(?:matches|any|-(?:webkit|moz)-any)/,
      V = new We();function uf(a, b, c, d, e) {
    this.s = a || null;this.b = b || null;this.V = c || [];this.m = null;this.cssBuild = e || "";this.I = d || "";this.a = this.o = this.v = null;
  }function X(a) {
    return a ? a.__styleInfo : null;
  }function vf(a, b) {
    return a.__styleInfo = b;
  }uf.prototype.c = function () {
    return this.s;
  };uf.prototype._getStyleRules = uf.prototype.c;function wf(a) {
    var b = this.matches || this.matchesSelector || this.mozMatchesSelector || this.msMatchesSelector || this.oMatchesSelector || this.webkitMatchesSelector;return b && b.call(this, a);
  }var xf = /:host\s*>\s*/,
      yf = navigator.userAgent.match("Trident");function zf() {}function Af(a) {
    var b = {},
        c = [],
        d = 0;Je(a, function (f) {
      Bf(f);f.index = d++;f = f.g.cssText;for (var g; g = De.exec(f);) {
        var h = g[1];":" !== g[2] && (b[h] = !0);
      }
    }, function (f) {
      c.push(f);
    });a.b = c;a = [];for (var e in b) a.push(e);return a;
  }
  function Bf(a) {
    if (!a.g) {
      var b = {},
          c = {};Cf(a, c) && (b.u = c, a.rules = null);b.cssText = a.parsedCssText.replace(Ge, "").replace(Be, "");a.g = b;
    }
  }function Cf(a, b) {
    var c = a.g;if (c) {
      if (c.u) return Object.assign(b, c.u), !0;
    } else {
      c = a.parsedCssText;for (var d; a = Be.exec(c);) {
        d = (a[2] || a[3]).trim();if ("inherit" !== d || "unset" !== d) b[a[1].trim()] = d;d = !0;
      }return d;
    }
  }
  function Df(a, b, c) {
    b && (b = 0 <= b.indexOf(";") ? Ef(a, b, c) : Qe(b, function (d, e, f, g) {
      if (!e) return d + g;(e = Df(a, c[e], c)) && "initial" !== e ? "apply-shim-inherit" === e && (e = "inherit") : e = Df(a, c[f] || f, c) || f;return d + (e || "") + g;
    }));return b && b.trim() || "";
  }
  function Ef(a, b, c) {
    b = b.split(";");for (var d = 0, e, f; d < b.length; d++) if (e = b[d]) {
      Ce.lastIndex = 0;if (f = Ce.exec(e)) e = Df(a, c[f[1]], c);else if (f = e.indexOf(":"), -1 !== f) {
        var g = e.substring(f);g = g.trim();g = Df(a, g, c) || g;e = e.substring(0, f) + g;
      }b[d] = e && e.lastIndexOf(";") === e.length - 1 ? e.slice(0, -1) : e || "";
    }return b.join(";");
  }
  function Ff(a, b) {
    var c = {},
        d = [];Je(a, function (e) {
      e.g || Bf(e);var f = e.h || e.parsedSelector;b && e.g.u && f && wf.call(b, f) && (Cf(e, c), e = e.index, f = parseInt(e / 32, 10), d[f] = (d[f] || 0) | 1 << e % 32);
    }, null, !0);return { u: c, key: d };
  }
  function Gf(a, b, c, d) {
    b.g || Bf(b);if (b.g.u) {
      var e = U(a);a = e.is;e = e.I;e = a ? cf(a, e) : "html";var f = b.parsedSelector;var g = !!f.match(xf) || "html" === e && -1 < f.indexOf("html");var h = 0 === f.indexOf(":host") && !g;"shady" === c && (g = f === e + " > *." + e || -1 !== f.indexOf("html"), h = !g && 0 === f.indexOf(e));if (g || h) c = e, h && (b.h || (b.h = df(V, b, V.b, a ? "." + a : "", e)), c = b.h || e), g && "html" === e && (c = b.h || b.j), d({ Y: c, ta: h, Fa: g });
    }
  }
  function Hf(a, b, c) {
    var d = {},
        e = {};Je(b, function (f) {
      Gf(a, f, c, function (g) {
        wf.call(a._element || a, g.Y) && (g.ta ? Cf(f, d) : Cf(f, e));
      });
    }, null, !0);return { xa: e, sa: d };
  }
  function If(a, b, c, d) {
    var e = U(b),
        f = cf(e.is, e.I),
        g = new RegExp("(?:^|[^.#[:])" + (b.extends ? "\\" + f.slice(0, -1) + "\\]" : f) + "($|[.:[\\s>+~])"),
        h = X(b);e = h.s;h = h.cssBuild;var k = Jf(e, d);return af(b, e, function (l) {
      var m = "";l.g || Bf(l);l.g.cssText && (m = Ef(a, l.g.cssText, c));l.cssText = m;if (!R && !Le(l) && l.cssText) {
        var q = m = l.cssText;null == l.ba && (l.ba = Ee.test(m));if (l.ba) if (null == l.M) {
          l.M = [];for (var y in k) q = k[y], q = q(m), m !== q && (m = q, l.M.push(y));
        } else {
          for (y = 0; y < l.M.length; ++y) q = k[l.M[y]], m = q(m);q = m;
        }l.cssText = q;l.h = l.h || l.selector;
        m = "." + d;y = Te(l.h);q = 0;for (var ma = y.length, Xa = void 0; q < ma && (Xa = y[q]); q++) y[q] = Xa.match(g) ? Xa.replace(f, m) : m + " " + Xa;l.selector = y.join(",");
      }
    }, h);
  }function Jf(a, b) {
    a = a.b;var c = {};if (!R && a) for (var d = 0, e = a[d]; d < a.length; e = a[++d]) {
      var f = e,
          g = b;f.f = new RegExp("\\b" + f.keyframesName + "(?!\\B|-)", "g");f.a = f.keyframesName + "-" + g;f.h = f.h || f.selector;f.selector = f.h.replace(f.keyframesName, f.a);c[e.keyframesName] = Kf(e);
    }return c;
  }function Kf(a) {
    return function (b) {
      return b.replace(a.f, a.a);
    };
  }
  function Lf(a, b) {
    var c = Mf,
        d = Ke(a);a.textContent = Ie(d, function (e) {
      var f = e.cssText = e.parsedCssText;e.g && e.g.cssText && (f = f.replace(te, "").replace(ue, ""), e.cssText = Ef(c, f, b));
    });
  }da.Object.defineProperties(zf.prototype, { a: { configurable: !0, enumerable: !0, get: function () {
        return "x-scope";
      } } });var Mf = new zf();var Nf = {},
      Of = window.customElements;if (Of && !R && !Ae) {
    var Pf = Of.define;Of.define = function (a, b, c) {
      Nf[a] || (Nf[a] = Oe(a));Pf.call(Of, a, b, c);
    };
  };function Qf() {
    this.cache = {};
  }Qf.prototype.store = function (a, b, c, d) {
    var e = this.cache[a] || [];e.push({ u: b, styleElement: c, o: d });100 < e.length && e.shift();this.cache[a] = e;
  };function Rf() {}var Sf = new RegExp(V.a + "\\s*([^\\s]*)");function Tf(a) {
    return (a = (a.classList && a.classList.value ? a.classList.value : a.getAttribute("class") || "").match(Sf)) ? a[1] : "";
  }function Uf(a) {
    var b = Se(a).getRootNode();return b === a || b === a.ownerDocument ? "" : (a = b.host) ? U(a).is : "";
  }
  function Vf(a) {
    for (var b = 0; b < a.length; b++) {
      var c = a[b];if (c.target !== document.documentElement && c.target !== document.head) for (var d = 0; d < c.addedNodes.length; d++) {
        var e = c.addedNodes[d];if (e.nodeType === Node.ELEMENT_NODE) {
          var f = e.getRootNode(),
              g = Tf(e);if (g && f === e.ownerDocument && ("style" !== e.localName && "template" !== e.localName || "" === Ue(e))) $e(e, g);else if (f instanceof ShadowRoot) for (f = Uf(e), f !== g && Ze(e, g, f), e = window.ShadyDOM.nativeMethods.querySelectorAll.call(e, ":not(." + V.a + ")"), g = 0; g < e.length; g++) {
            f = e[g];
            var h = Uf(f);h && W(f, h);
          }
        }
      }
    }
  }
  if (!(R || window.ShadyDOM && window.ShadyDOM.handlesDynamicScoping)) {
    var Wf = new MutationObserver(Vf),
        Xf = function (a) {
      Wf.observe(a, { childList: !0, subtree: !0 });
    };if (window.customElements && !window.customElements.polyfillWrapFlushCallback) Xf(document);else {
      var Yf = function () {
        Xf(document.body);
      };window.HTMLImports ? window.HTMLImports.whenReady(Yf) : requestAnimationFrame(function () {
        if ("loading" === document.readyState) {
          var a = function () {
            Yf();document.removeEventListener("readystatechange", a);
          };document.addEventListener("readystatechange", a);
        } else Yf();
      });
    }Rf = function () {
      Vf(Wf.takeRecords());
    };
  };var Zf = {};var $f = Promise.resolve();function ag(a) {
    if (a = Zf[a]) a._applyShimCurrentVersion = a._applyShimCurrentVersion || 0, a._applyShimValidatingVersion = a._applyShimValidatingVersion || 0, a._applyShimNextVersion = (a._applyShimNextVersion || 0) + 1;
  }function bg(a) {
    return a._applyShimCurrentVersion === a._applyShimNextVersion;
  }function cg(a) {
    a._applyShimValidatingVersion = a._applyShimNextVersion;a._validating || (a._validating = !0, $f.then(function () {
      a._applyShimCurrentVersion = a._applyShimNextVersion;a._validating = !1;
    }));
  };var dg = {},
      eg = new Qf();function Y() {
    this.w = {};this.c = document.documentElement;var a = new ge();a.rules = [];this.f = vf(this.c, new uf(a));this.j = !1;this.a = this.b = null;
  }n = Y.prototype;n.flush = function () {
    Rf();
  };n.qa = function (a) {
    return Ke(a);
  };n.Ba = function (a) {
    return Ie(a);
  };n.prepareTemplate = function (a, b, c) {
    this.prepareTemplateDom(a, b);this.prepareTemplateStyles(a, b, c);
  };
  n.prepareTemplateStyles = function (a, b, c) {
    if (!a._prepared && !Ae) {
      R || Nf[b] || (Nf[b] = Oe(b));a._prepared = !0;a.name = b;a.extends = c;Zf[b] = a;var d = Ue(a),
          e = Ve(d);c = { is: b, extends: c };for (var f = [], g = a.content.querySelectorAll("style"), h = 0; h < g.length; h++) {
        var k = g[h];if (k.hasAttribute("shady-unscoped")) {
          if (!R) {
            var l = k.textContent;He.has(l) || (He.add(l), l = k.cloneNode(!0), document.head.appendChild(l));k.parentNode.removeChild(k);
          }
        } else f.push(k.textContent), k.parentNode.removeChild(k);
      }f = f.join("").trim() + (dg[b] || "");
      fg(this);if (!e) {
        if (g = !d) g = Ce.test(f) || Be.test(f), Ce.lastIndex = 0, Be.lastIndex = 0;h = he(f);g && S && this.b && this.b.transformRules(h, b);a._styleAst = h;
      }g = [];S || (g = Af(a._styleAst));if (!g.length || S) h = R ? a.content : null, b = Nf[b] || null, d = af(c, a._styleAst, null, d, e ? f : ""), d = d.length ? Me(d, c.is, h, b) : null, a._style = d;a.a = g;
    }
  };n.va = function (a, b) {
    dg[b] = a.join(" ");
  };n.prepareTemplateDom = function (a, b) {
    if (!Ae) {
      var c = Ue(a);R || "shady" === c || a._domPrepared || (a._domPrepared = !0, Xe(a.content, b));
    }
  };
  function gg(a) {
    var b = U(a),
        c = b.is;b = b.I;var d = Nf[c] || null,
        e = Zf[c];if (e) {
      c = e._styleAst;var f = e.a;e = Ue(e);b = new uf(c, d, f, b, e);vf(a, b);return b;
    }
  }function hg(a) {
    !a.a && window.ShadyCSS && window.ShadyCSS.CustomStyleInterface && (a.a = window.ShadyCSS.CustomStyleInterface, a.a.transformCallback = function (b) {
      a.ga(b);
    }, a.a.validateCallback = function () {
      requestAnimationFrame(function () {
        (a.a.enqueued || a.j) && a.flushCustomStyles();
      });
    });
  }
  function fg(a) {
    if (!a.b && window.ShadyCSS && window.ShadyCSS.ApplyShim) {
      a.b = window.ShadyCSS.ApplyShim;a.b.invalidCallback = ag;var b = !0;
    } else b = !1;hg(a);return b;
  }
  n.flushCustomStyles = function () {
    if (!Ae) {
      var a = fg(this);if (this.a) {
        var b = this.a.processStyles();if ((a || this.a.enqueued) && !Ve(this.f.cssBuild)) {
          if (S) {
            if (!this.f.cssBuild) for (a = 0; a < b.length; a++) {
              var c = this.a.getStyleForCustomStyle(b[a]);if (c && S && this.b) {
                var d = Ke(c);fg(this);this.b.transformRules(d);c.textContent = Ie(d);
              }
            }
          } else {
            ig(this, b);jg(this, this.c, this.f);for (a = 0; a < b.length; a++) (c = this.a.getStyleForCustomStyle(b[a])) && Lf(c, this.f.v);this.j && this.styleDocument();
          }this.a.enqueued = !1;
        }
      }
    }
  };
  function ig(a, b) {
    b = b.map(function (c) {
      return a.a.getStyleForCustomStyle(c);
    }).filter(function (c) {
      return !!c;
    });b.sort(function (c, d) {
      c = d.compareDocumentPosition(c);return c & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : c & Node.DOCUMENT_POSITION_PRECEDING ? -1 : 0;
    });a.f.s.rules = b.map(function (c) {
      return Ke(c);
    });
  }
  n.styleElement = function (a, b) {
    if (Ae) {
      if (b) {
        X(a) || vf(a, new uf(null));var c = X(a);c.m = c.m || {};Object.assign(c.m, b);kg(this, a, c);
      }
    } else if (c = X(a) || gg(a)) if (a !== this.c && (this.j = !0), b && (c.m = c.m || {}, Object.assign(c.m, b)), S) kg(this, a, c);else if (this.flush(), jg(this, a, c), c.V && c.V.length) {
      b = U(a).is;var d;a: {
        if (d = eg.cache[b]) for (var e = d.length - 1; 0 <= e; e--) {
          var f = d[e];b: {
            var g = c.V;for (var h = 0; h < g.length; h++) {
              var k = g[h];if (f.u[k] !== c.v[k]) {
                g = !1;break b;
              }
            }g = !0;
          }if (g) {
            d = f;break a;
          }
        }d = void 0;
      }g = d ? d.styleElement : null;e = c.o;(f = d && d.o) || (f = this.w[b] = (this.w[b] || 0) + 1, f = b + "-" + f);c.o = f;f = c.o;h = Mf;h = g ? g.textContent || "" : If(h, a, c.v, f);k = X(a);var l = k.a;l && !R && l !== g && (l._useCount--, 0 >= l._useCount && l.parentNode && l.parentNode.removeChild(l));R ? k.a ? (k.a.textContent = h, g = k.a) : h && (g = Me(h, f, a.shadowRoot, k.b)) : g ? g.parentNode || (yf && -1 < h.indexOf("@media") && (g.textContent = h), Ne(g, null, k.b)) : h && (g = Me(h, f, null, k.b));g && (g._useCount = g._useCount || 0, k.a != g && g._useCount++, k.a = g);f = g;R || (g = c.o, k = h = a.getAttribute("class") || "", e && (k = h.replace(new RegExp("\\s*x-scope\\s*" + e + "\\s*", "g"), " ")), k += (k ? " " : "") + "x-scope " + g, h !== k && Re(a, k));d || eg.store(b, c.v, f, c.o);
    }
  };
  function kg(a, b, c) {
    var d = U(b).is;if (c.m) {
      var e = c.m,
          f;for (f in e) null === f ? b.style.removeProperty(f) : b.style.setProperty(f, e[f]);
    }e = Zf[d];if (!(!e && b !== a.c || e && "" !== Ue(e)) && e && e._style && !bg(e)) {
      if (bg(e) || e._applyShimValidatingVersion !== e._applyShimNextVersion) fg(a), a.b && a.b.transformRules(e._styleAst, d), e._style.textContent = af(b, c.s), cg(e);R && (a = b.shadowRoot) && (a = a.querySelector("style")) && (a.textContent = af(b, c.s));c.s = e._styleAst;
    }
  }
  function lg(a, b) {
    return (b = Se(b).getRootNode().host) ? X(b) || gg(b) ? b : lg(a, b) : a.c;
  }function jg(a, b, c) {
    var d = lg(a, b),
        e = X(d),
        f = e.v;d === a.c || f || (jg(a, d, e), f = e.v);a = Object.create(f || null);d = Hf(b, c.s, c.cssBuild);b = Ff(e.s, b).u;Object.assign(a, d.sa, b, d.xa);b = c.m;for (var g in b) if ((e = b[g]) || 0 === e) a[g] = e;g = Mf;b = Object.getOwnPropertyNames(a);for (e = 0; e < b.length; e++) d = b[e], a[d] = Df(g, a[d], a);c.v = a;
  }n.styleDocument = function (a) {
    this.styleSubtree(this.c, a);
  };
  n.styleSubtree = function (a, b) {
    var c = Se(a),
        d = c.shadowRoot,
        e = a === this.c;(d || e) && this.styleElement(a, b);if (a = e ? c : d) for (a = Array.from(a.querySelectorAll("*")).filter(function (f) {
      return Se(f).shadowRoot;
    }), b = 0; b < a.length; b++) this.styleSubtree(a[b]);
  };
  n.ga = function (a) {
    var b = this,
        c = Ue(a);c !== this.f.cssBuild && (this.f.cssBuild = c);if (!Ve(c)) {
      var d = Ke(a);Je(d, function (e) {
        if (R) tf(e);else {
          var f = V;e.selector = e.parsedSelector;tf(e);e.selector = e.h = df(f, e, f.c, void 0, void 0);
        }S && "" === c && (fg(b), b.b && b.b.transformRule(e));
      });S ? a.textContent = Ie(d) : this.f.s.rules.push(d);
    }
  };n.getComputedStyleValue = function (a, b) {
    var c;S || (c = (X(a) || X(lg(this, a))).v[b]);return (c = c || window.getComputedStyle(a).getPropertyValue(b)) ? c.trim() : "";
  };
  n.Aa = function (a, b) {
    var c = Se(a).getRootNode(),
        d;b ? d = ("string" === typeof b ? b : String(b)).split(/\s/) : d = [];b = c.host && c.host.localName;if (!b && (c = a.getAttribute("class"))) {
      c = c.split(/\s/);for (var e = 0; e < c.length; e++) if (c[e] === V.a) {
        b = c[e + 1];break;
      }
    }b && d.push(V.a, b);S || (b = X(a)) && b.o && d.push(Mf.a, b.o);Re(a, d.join(" "));
  };n.na = function (a) {
    return X(a);
  };n.za = function (a, b) {
    W(a, b);
  };n.Ca = function (a, b) {
    W(a, b, !0);
  };n.ya = function (a) {
    return Uf(a);
  };n.pa = function (a) {
    return Tf(a);
  };Y.prototype.flush = Y.prototype.flush;
  Y.prototype.prepareTemplate = Y.prototype.prepareTemplate;Y.prototype.styleElement = Y.prototype.styleElement;Y.prototype.styleDocument = Y.prototype.styleDocument;Y.prototype.styleSubtree = Y.prototype.styleSubtree;Y.prototype.getComputedStyleValue = Y.prototype.getComputedStyleValue;Y.prototype.setElementClass = Y.prototype.Aa;Y.prototype._styleInfoForNode = Y.prototype.na;Y.prototype.transformCustomStyleForDocument = Y.prototype.ga;Y.prototype.getStyleAst = Y.prototype.qa;Y.prototype.styleAstToString = Y.prototype.Ba;
  Y.prototype.flushCustomStyles = Y.prototype.flushCustomStyles;Y.prototype.scopeNode = Y.prototype.za;Y.prototype.unscopeNode = Y.prototype.Ca;Y.prototype.scopeForNode = Y.prototype.ya;Y.prototype.currentScopeForNode = Y.prototype.pa;Y.prototype.prepareAdoptedCssText = Y.prototype.va;Object.defineProperties(Y.prototype, { nativeShadow: { get: function () {
        return R;
      } }, nativeCss: { get: function () {
        return S;
      } } });var Z = new Y(),
      mg,
      ng;window.ShadyCSS && (mg = window.ShadyCSS.ApplyShim, ng = window.ShadyCSS.CustomStyleInterface);
  window.ShadyCSS = { ScopingShim: Z, prepareTemplate: function (a, b, c) {
      Z.flushCustomStyles();Z.prepareTemplate(a, b, c);
    }, prepareTemplateDom: function (a, b) {
      Z.prepareTemplateDom(a, b);
    }, prepareTemplateStyles: function (a, b, c) {
      Z.flushCustomStyles();Z.prepareTemplateStyles(a, b, c);
    }, styleSubtree: function (a, b) {
      Z.flushCustomStyles();Z.styleSubtree(a, b);
    }, styleElement: function (a) {
      Z.flushCustomStyles();Z.styleElement(a);
    }, styleDocument: function (a) {
      Z.flushCustomStyles();Z.styleDocument(a);
    }, flushCustomStyles: function () {
      Z.flushCustomStyles();
    },
    getComputedStyleValue: function (a, b) {
      return Z.getComputedStyleValue(a, b);
    }, nativeCss: S, nativeShadow: R, cssBuild: ze, disableRuntime: Ae };mg && (window.ShadyCSS.ApplyShim = mg);ng && (window.ShadyCSS.CustomStyleInterface = ng);
}).call(this);

//# sourceMappingURL=webcomponents-sd-ce.js.map