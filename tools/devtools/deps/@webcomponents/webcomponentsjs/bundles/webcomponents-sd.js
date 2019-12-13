/// BareSpecifier=@webcomponents\webcomponentsjs\bundles\webcomponents-sd
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
  }function da(a) {
    for (var b, c = []; !(b = a.next()).done;) c.push(b.value);return c;
  }var ea = "undefined" != typeof window && window === this ? this : "undefined" != typeof global && null != global ? global : this;function fa() {}fa.prototype.toJSON = function () {
    return {};
  };
  function p(a) {
    a.__shady || (a.__shady = new fa());return a.__shady;
  }function q(a) {
    return a && a.__shady;
  };var t = window.ShadyDOM || {};t.na = !(!Element.prototype.attachShadow || !Node.prototype.getRootNode);var ha = Object.getOwnPropertyDescriptor(Node.prototype, "firstChild");t.h = !!(ha && ha.configurable && ha.get);t.P = t.force || !t.na;t.j = t.noPatch || !1;t.T = t.preferPerformance;t.S = "on-demand" === t.j;t.ca = navigator.userAgent.match("Trident");function u(a) {
    return (a = q(a)) && void 0 !== a.firstChild;
  }function v(a) {
    return a instanceof ShadowRoot;
  }function ia(a) {
    return (a = (a = q(a)) && a.root) && ja(a);
  }
  var x = Element.prototype,
      ka = x.matches || x.matchesSelector || x.mozMatchesSelector || x.msMatchesSelector || x.oMatchesSelector || x.webkitMatchesSelector,
      la = document.createTextNode(""),
      ma = 0,
      na = [];new MutationObserver(function () {
    for (; na.length;) try {
      na.shift()();
    } catch (a) {
      throw la.textContent = ma++, a;
    }
  }).observe(la, { characterData: !0 });function oa(a) {
    na.push(a);la.textContent = ma++;
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
  }function y(a, b, c, d) {
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
    this.a = !1;this.addedNodes = [];this.removedNodes = [];this.I = new Set();
  }function Ba(a) {
    a.a || (a.a = !0, oa(function () {
      a.flush();
    }));
  }Aa.prototype.flush = function () {
    if (this.a) {
      this.a = !1;var a = this.takeRecords();a.length && this.I.forEach(function (b) {
        b(a);
      });
    }
  };Aa.prototype.takeRecords = function () {
    if (this.addedNodes.length || this.removedNodes.length) {
      var a = [{ addedNodes: this.addedNodes, removedNodes: this.removedNodes }];this.addedNodes = [];this.removedNodes = [];return a;
    }return [];
  };
  function Ca(a, b) {
    var c = p(a);c.C || (c.C = new Aa());c.C.I.add(b);var d = c.C;return { ga: b, ia: d, ha: a, takeRecords: function () {
        return d.takeRecords();
      } };
  }function Da(a) {
    var b = a && a.ia;b && (b.I.delete(a.ga), b.I.size || (p(a.ha).C = null));
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
  }function Ja(a) {
    for (var b = {}, c = 0; c < a.length; c++) b[a[c]] = !0;return b;
  }var Ka = Ja("area base br col command embed hr img input keygen link meta param source track wbr".split(" ")),
      La = Ja("style script xmp iframe noembed noframes plaintext noscript".split(" "));
  function Ma(a, b) {
    "template" === a.localName && (a = a.content);for (var c = "", d = b ? b(a) : a.childNodes, e = 0, f = d.length, g = void 0; e < f && (g = d[e]); e++) {
      a: {
        var h = g;var l = a,
            k = b;switch (h.nodeType) {case Node.ELEMENT_NODE:
            l = h.localName;for (var m = "<" + l, r = h.attributes, w = 0, ca; ca = r[w]; w++) m += " " + ca.name + '="' + ca.value.replace(Fa, Ha) + '"';m += ">";h = Ka[l] ? m : m + Ma(h, k) + "</" + l + ">";break a;case Node.TEXT_NODE:
            h = h.data;h = l && La[l.localName] ? h : h.replace(Ga, Ha);break a;case Node.COMMENT_NODE:
            h = "\x3c!--" + h.data + "--\x3e";break a;default:
            throw window.console.error(h), Error("not implemented");}
      }c += h;
    }return c;
  };var Na = t.h,
      Oa = { querySelector: function (a) {
      return this.__shady_native_querySelector(a);
    }, querySelectorAll: function (a) {
      return this.__shady_native_querySelectorAll(a);
    } },
      Pa = {};function Qa(a) {
    Pa[a] = function (b) {
      return b["__shady_native_" + a];
    };
  }function Ra(a, b) {
    y(a, b, "__shady_native_");for (var c in b) Qa(c);
  }function A(a, b) {
    b = void 0 === b ? [] : b;for (var c = 0; c < b.length; c++) {
      var d = b[c],
          e = Object.getOwnPropertyDescriptor(a, d);e && (Object.defineProperty(a, "__shady_native_" + d, e), e.value ? Oa[d] || (Oa[d] = e.value) : Qa(d));
    }
  }
  var B = document.createTreeWalker(document, NodeFilter.SHOW_ALL, null, !1),
      C = document.createTreeWalker(document, NodeFilter.SHOW_ELEMENT, null, !1),
      Sa = document.implementation.createHTMLDocument("inert");function Ta(a) {
    for (var b; b = a.__shady_native_firstChild;) a.__shady_native_removeChild(b);
  }var Ua = ["firstElementChild", "lastElementChild", "children", "childElementCount"],
      Va = ["querySelector", "querySelectorAll"];
  function Wa() {
    var a = ["dispatchEvent", "addEventListener", "removeEventListener"];window.EventTarget ? A(window.EventTarget.prototype, a) : (A(Node.prototype, a), A(Window.prototype, a));Na ? A(Node.prototype, "parentNode firstChild lastChild previousSibling nextSibling childNodes parentElement textContent".split(" ")) : Ra(Node.prototype, { parentNode: { get: function () {
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
              Ta(this);(0 < b.length || this.nodeType === Node.ELEMENT_NODE) && this.__shady_native_insertBefore(document.createTextNode(b), void 0);break;default:
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
        } } };Na ? (A(Element.prototype, Ua), A(Element.prototype, ["previousElementSibling", "nextElementSibling", "innerHTML", "className"]), A(HTMLElement.prototype, ["children", "innerHTML", "className"])) : (Ra(Element.prototype, a), Ra(Element.prototype, { previousElementSibling: { get: function () {
          C.currentNode = this;return C.previousSibling();
        } }, nextElementSibling: { get: function () {
          C.currentNode = this;return C.nextSibling();
        } }, innerHTML: { get: function () {
          return Ma(this, sa);
        }, set: function (b) {
          var c = "template" === this.localName ? this.content : this;Ta(c);var d = this.localName || "div";d = this.namespaceURI && this.namespaceURI !== Sa.namespaceURI ? Sa.createElementNS(this.namespaceURI, d) : Sa.createElement(d);d.innerHTML = b;for (b = "template" === this.localName ? d.content : d; d = b.__shady_native_firstChild;) c.__shady_native_insertBefore(d, void 0);
        } }, className: { get: function () {
          return this.getAttribute("class") || "";
        }, set: function (b) {
          this.setAttribute("class", b);
        } } }));A(Element.prototype, "setAttribute getAttribute hasAttribute removeAttribute focus blur".split(" "));A(Element.prototype, Va);A(HTMLElement.prototype, ["focus", "blur"]);window.HTMLTemplateElement && A(window.HTMLTemplateElement.prototype, ["innerHTML"]);Na ? A(DocumentFragment.prototype, Ua) : Ra(DocumentFragment.prototype, a);A(DocumentFragment.prototype, Va);Na ? (A(Document.prototype, Ua), A(Document.prototype, ["activeElement"])) : Ra(Document.prototype, a);A(Document.prototype, ["importNode", "getElementById"]);A(Document.prototype, Va);
  };var Xa = z({ get childNodes() {
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
  }$a(Xa);$a(Ya);$a(Za);var ab = t.h || !0 === t.j,
      bb = ab ? function () {} : function (a) {
    var b = p(a);b.ea || (b.ea = !0, va(a, Za));
  },
      cb = ab ? function () {} : function (a) {
    var b = p(a);b.da || (b.da = !0, va(a, Xa), window.customElements && !t.j || va(a, Ya));
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
      var b = !!a.capture;var c = !!a.once;var d = !!a.passive;var e = a.w;
    } else b = !!a, d = c = !1;return { aa: e, capture: b, once: c, passive: d, Z: fb ? a : b };
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
      var d = b[c];qb(a, d, "capture");if (a.M) return;
    }Object.defineProperty(a, "eventPhase", { get: function () {
        return Event.AT_TARGET;
      } });var e;for (c = 0; c < b.length; c++) {
      d = b[c];var f = q(d);f = f && f.root;if (0 === c || f && f === e) if (qb(a, d, "bubble"), d !== window && (e = d.__shady_getRootNode()), a.M) break;
    }
  }
  function sb(a, b, c, d, e, f) {
    for (var g = 0; g < a.length; g++) {
      var h = a[g],
          l = h.type,
          k = h.capture,
          m = h.once,
          r = h.passive;if (b === h.node && c === l && d === k && e === m && f === r) return g;
    }return -1;
  }function tb(a) {
    za();return this.__shady_native_dispatchEvent(a);
  }
  function ub(a, b, c) {
    var d = gb(c),
        e = d.capture,
        f = d.once,
        g = d.passive,
        h = d.aa;d = d.Z;if (b) {
      var l = typeof b;if ("function" === l || "object" === l) if ("object" !== l || b.handleEvent && "function" === typeof b.handleEvent) {
        if (ib[a]) return this.__shady_native_addEventListener(a, b, d);var k = h || this;if (h = b[db]) {
          if (-1 < sb(h, k, a, e, f, g)) return;
        } else b[db] = [];h = function (m) {
          f && this.__shady_removeEventListener(a, b, c);m.__target || vb(m);if (k !== this) {
            var r = Object.getOwnPropertyDescriptor(m, "currentTarget");Object.defineProperty(m, "currentTarget", { get: function () {
                return k;
              }, configurable: !0 });
          }m.__previousCurrentTarget = m.currentTarget;if (!v(k) && "slot" !== k.localName || -1 != m.composedPath().indexOf(k)) if (m.composed || -1 < m.composedPath().indexOf(k)) if (pb(m) && m.target === m.relatedTarget) m.eventPhase === Event.BUBBLING_PHASE && m.stopImmediatePropagation();else if (m.eventPhase === Event.CAPTURING_PHASE || m.bubbles || m.target === k || k instanceof Window) {
            var w = "function" === l ? b.call(k, m) : b.handleEvent && b.handleEvent(m);k !== this && (r ? (Object.defineProperty(m, "currentTarget", r), r = null) : delete m.currentTarget);return w;
          }
        };b[db].push({ node: k, type: a, capture: e, once: f, passive: g, ya: h });ob[a] ? (this.__handlers = this.__handlers || {}, this.__handlers[a] = this.__handlers[a] || { capture: [], bubble: [] }, this.__handlers[a][e ? "capture" : "bubble"].push(h)) : this.__shady_native_addEventListener(a, h, d);
      }
    }
  }
  function wb(a, b, c) {
    if (b) {
      var d = gb(c);c = d.capture;var e = d.once,
          f = d.passive,
          g = d.aa;d = d.Z;if (ib[a]) return this.__shady_native_removeEventListener(a, b, d);var h = g || this;g = void 0;var l = null;try {
        l = b[db];
      } catch (k) {}l && (e = sb(l, h, a, c, e, f), -1 < e && (g = l.splice(e, 1)[0].ya, l.length || (b[db] = void 0)));this.__shady_native_removeEventListener(a, g || b, d);g && ob[a] && this.__handlers && this.__handlers[a] && (a = this.__handlers[a][c ? "capture" : "bubble"], b = a.indexOf(g), -1 < b && a.splice(b, 1));
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
      Event.prototype.stopPropagation.call(this);this.M = !0;
    }, stopImmediatePropagation: function () {
      Event.prototype.stopImmediatePropagation.call(this);this.M = this.__immediatePropagationStopped = !0;
    } });
  function vb(a) {
    a.__target = a.target;a.__relatedTarget = a.relatedTarget;if (t.h) {
      var b = Object.getPrototypeOf(a);if (!b.hasOwnProperty("__shady_patchedProto")) {
        var c = Object.create(b);c.__shady_sourceProto = b;y(c, yb);b.__shady_patchedProto = c;
      }a.__proto__ = b.__shady_patchedProto;
    } else y(a, yb);
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
    return { index: a, D: [], H: b };
  }
  function Fb(a, b, c, d) {
    var e = 0,
        f = 0,
        g = 0,
        h = 0,
        l = Math.min(b - e, d - f);if (0 == e && 0 == f) a: {
      for (g = 0; g < l; g++) if (a[g] !== c[g]) break a;g = l;
    }if (b == a.length && d == c.length) {
      h = a.length;for (var k = c.length, m = 0; m < l - g && Gb(a[--h], c[--k]);) m++;h = m;
    }e += g;f += g;b -= h;d -= h;if (0 == b - e && 0 == d - f) return [];if (e == b) {
      for (b = Eb(e, 0); f < d;) b.D.push(c[f++]);return [b];
    }if (f == d) return [Eb(e, b - e)];l = e;g = f;d = d - g + 1;h = b - l + 1;b = Array(d);for (k = 0; k < d; k++) b[k] = Array(h), b[k][0] = k;for (k = 0; k < h; k++) b[0][k] = k;for (k = 1; k < d; k++) for (m = 1; m < h; m++) if (a[l + m - 1] === c[g + k - 1]) b[k][m] = b[k - 1][m - 1];else {
      var r = b[k - 1][m] + 1,
          w = b[k][m - 1] + 1;b[k][m] = r < w ? r : w;
    }l = b.length - 1;g = b[0].length - 1;d = b[l][g];for (a = []; 0 < l || 0 < g;) 0 == l ? (a.push(2), g--) : 0 == g ? (a.push(3), l--) : (h = b[l - 1][g - 1], k = b[l - 1][g], m = b[l][g - 1], r = k < m ? k < h ? k : h : m < h ? m : h, r == h ? (h == d ? a.push(0) : (a.push(1), d = h), l--, g--) : r == k ? (a.push(3), l--, d = k) : (a.push(2), g--, d = m));a.reverse();b = void 0;l = [];for (g = 0; g < a.length; g++) switch (a[g]) {case 0:
        b && (l.push(b), b = void 0);e++;f++;break;case 1:
        b || (b = Eb(e, 0));b.H++;e++;b.D.push(c[f]);f++;break;case 2:
        b || (b = Eb(e, 0));
        b.H++;e++;break;case 3:
        b || (b = Eb(e, 0)), b.D.push(c[f]), f++;}b && l.push(b);return l;
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
      Pb = t.T,
      Qb = Object.getOwnPropertyDescriptor(Node.prototype, "isConnected"),
      Rb = Qb && Qb.get;function Sb(a) {
    for (var b; b = a.__shady_firstChild;) a.__shady_removeChild(b);
  }function Tb(a) {
    var b = q(a);if (b && void 0 !== b.L) for (b = a.__shady_firstChild; b; b = b.__shady_nextSibling) Tb(b);if (a = q(a)) a.L = void 0;
  }function Ub(a) {
    var b = a;a && "slot" === a.localName && (b = (b = (b = q(a)) && b.B) && b.length ? b[0] : Ub(a.__shady_nextSibling));return b;
  }
  function Vb(a, b, c) {
    if (a = (a = q(a)) && a.C) {
      if (b) if (b.nodeType === Node.DOCUMENT_FRAGMENT_NODE) for (var d = 0, e = b.childNodes.length; d < e; d++) a.addedNodes.push(b.childNodes[d]);else a.addedNodes.push(b);c && a.removedNodes.push(c);Ba(a);
    }
  }
  var $b = z({ get parentNode() {
      var a = q(this);a = a && a.parentNode;return void 0 !== a ? a : this.__shady_native_parentNode;
    }, get firstChild() {
      var a = q(this);a = a && a.firstChild;return void 0 !== a ? a : this.__shady_native_firstChild;
    }, get lastChild() {
      var a = q(this);a = a && a.lastChild;return void 0 !== a ? a : this.__shady_native_lastChild;
    }, get nextSibling() {
      var a = q(this);a = a && a.nextSibling;return void 0 !== a ? a : this.__shady_native_nextSibling;
    }, get previousSibling() {
      var a = q(this);a = a && a.previousSibling;return void 0 !== a ? a : this.__shady_native_previousSibling;
    },
    get childNodes() {
      if (u(this)) {
        var a = q(this);if (!a.childNodes) {
          a.childNodes = [];for (var b = this.__shady_firstChild; b; b = b.__shady_nextSibling) a.childNodes.push(b);
        }var c = a.childNodes;
      } else c = this.__shady_native_childNodes;c.item = function (d) {
        return c[d];
      };return c;
    }, get parentElement() {
      var a = q(this);(a = a && a.parentNode) && a.nodeType !== Node.ELEMENT_NODE && (a = null);return void 0 !== a ? a : this.__shady_native_parentElement;
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
          if (!u(this) && t.h) {
            var b = this.__shady_firstChild;(b != this.__shady_lastChild || b && b.nodeType != Node.TEXT_NODE) && Sb(this);this.__shady_native_textContent = a;
          } else Sb(this), (0 < a.length || this.nodeType === Node.ELEMENT_NODE) && this.__shady_insertBefore(document.createTextNode(a));break;default:
          this.nodeValue = a;}
    }, insertBefore: function (a, b) {
      if (this.ownerDocument !== Ob && a.ownerDocument !== Ob) return this.__shady_native_insertBefore(a, b), a;if (a === this) throw Error("Failed to execute 'appendChild' on 'Node': The new child element contains the parent.");if (b) {
        var c = q(b);c = c && c.parentNode;if (void 0 !== c && c !== this || void 0 === c && b.__shady_native_parentNode !== this) throw Error("Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.");
      }if (b === a) return a;Vb(this, a);var d = [],
          e = (c = E(this)) ? c.host.localName : Mb(this),
          f = a.__shady_parentNode;if (f) {
        var g = Mb(a);var h = !!c || !E(a) || Pb && void 0 !== this.__noInsertionPoint;f.__shady_removeChild(a, h);
      }f = !0;var l = (!Pb || void 0 === a.__noInsertionPoint && void 0 === this.__noInsertionPoint) && !Lb(a, e),
          k = c && !a.__noInsertionPoint && (!Pb || a.nodeType === Node.DOCUMENT_FRAGMENT_NODE);if (k || l) l && (g = g || Mb(a)), Nb(a, function (m) {
        k && "slot" === m.localName && d.push(m);if (l) {
          var r = g;D() && (r && Kb(m, r), (r = D()) && r.scopeNode(m, e));
        }
      });d.length && (Wb(c), c.c.push.apply(c.c, d instanceof Array ? d : da(ba(d))), F(c));u(this) && (Xb(a, this, b), c = q(this), ia(this) ? (F(c.root), f = !1) : c.root && (f = !1));f ? (c = v(this) ? this.host : this, b ? (b = Ub(b), c.__shady_native_insertBefore(a, b)) : c.__shady_native_appendChild(a)) : a.ownerDocument !== this.ownerDocument && this.ownerDocument.adoptNode(a);return a;
    }, appendChild: function (a) {
      if (this != a || !v(a)) return this.__shady_insertBefore(a);
    }, removeChild: function (a, b) {
      b = void 0 === b ? !1 : b;if (this.ownerDocument !== Ob) return this.__shady_native_removeChild(a);if (a.__shady_parentNode !== this) throw Error("The node to be removed is not a child of this node: " + a);Vb(this, null, a);var c = E(a),
          d = c && Yb(c, a),
          e = q(this);if (u(this) && (Zb(a, this), ia(this))) {
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
            c = b.L;void 0 === c && (v(this) ? (c = this, b.L = c) : (c = (c = this.__shady_parentNode) ? c.__shady_getRootNode(a) : this, document.documentElement.__shady_native_contains(this) && (b.L = c)));return c;
      }
    }, contains: function (a) {
      return qa(this, a);
    } });var bc = z({ get assignedSlot() {
      var a = this.__shady_parentNode;(a = a && a.__shady_shadowRoot) && ac(a);return (a = q(this)) && a.assignedSlot || null;
    } });function cc(a, b, c) {
    var d = [];dc(a, b, c, d);return d;
  }function dc(a, b, c, d) {
    for (a = a.__shady_firstChild; a; a = a.__shady_nextSibling) {
      var e;if (e = a.nodeType === Node.ELEMENT_NODE) {
        e = a;var f = b,
            g = c,
            h = d,
            l = f(e);l && h.push(e);g && g(l) ? e = l : (dc(e, f, g, h), e = void 0);
      }if (e) break;
    }
  }
  var G = z({ get firstElementChild() {
      var a = q(this);if (a && void 0 !== a.firstChild) {
        for (a = this.__shady_firstChild; a && a.nodeType !== Node.ELEMENT_NODE;) a = a.__shady_nextSibling;return a;
      }return this.__shady_native_firstElementChild;
    }, get lastElementChild() {
      var a = q(this);if (a && void 0 !== a.lastChild) {
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
        return ka.call(b, a);
      }, function (b) {
        return !!b;
      })[0] || null;
    }, querySelectorAll: function (a, b) {
      if (b) {
        b = Array.prototype.slice.call(this.__shady_native_querySelectorAll(a));var c = this.__shady_getRootNode();return ra(b.filter(function (d) {
          return d.__shady_getRootNode() == c;
        }));
      }return ra(cc(this, function (d) {
        return ka.call(d, a);
      }));
    } }),
      fc = t.T && !t.j ? Object.assign({}, G) : G;Object.assign(G, ec);var gc = window.document;function hc(a, b) {
    if ("slot" === b) a = a.__shady_parentNode, ia(a) && F(q(a).root);else if ("slot" === a.localName && "name" === b && (b = E(a))) {
      if (b.a) {
        ic(b);var c = a.fa,
            d = jc(a);if (d !== c) {
          c = b.b[c];var e = c.indexOf(a);0 <= e && c.splice(e, 1);c = b.b[d] || (b.b[d] = []);c.push(a);1 < c.length && (b.b[d] = kc(c));
        }
      }F(b);
    }
  }
  var lc = z({ get previousElementSibling() {
      var a = q(this);if (a && void 0 !== a.previousSibling) {
        for (a = this.__shady_previousSibling; a && a.nodeType !== Node.ELEMENT_NODE;) a = a.__shady_previousSibling;return a;
      }return this.__shady_native_previousElementSibling;
    }, get nextElementSibling() {
      var a = q(this);if (a && void 0 !== a.nextSibling) {
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
      if (!this) throw Error("Must provide a host.");if (!a) throw Error("Not enough arguments.");if (a.shadyUpgradeFragment && !t.ca) {
        var b = a.shadyUpgradeFragment;b.__proto__ = ShadowRoot.prototype;mc(b, this, a);nc(b, b);a = b.__noInsertionPoint ? null : b.querySelectorAll("slot");b.__noInsertionPoint = void 0;if (a && a.length) {
          var c = b;Wb(c);c.c.push.apply(c.c, a instanceof Array ? a : da(ba(a)));F(b);
        }b.host.__shady_native_appendChild(b);
      } else b = new oc(pc, this, a);return this.__CE_shadowRoot = b;
    }, get shadowRoot() {
      var a = q(this);return a && a.ra || null;
    } });Object.assign(lc, qc);var rc = document.implementation.createHTMLDocument("inert"),
      sc = z({ get innerHTML() {
      return u(this) ? Ma("template" === this.localName ? this.content : this, ta) : this.__shady_native_innerHTML;
    }, set innerHTML(a) {
      if ("template" === this.localName) this.__shady_native_innerHTML = a;else {
        Sb(this);var b = this.localName || "div";b = this.namespaceURI && this.namespaceURI !== rc.namespaceURI ? rc.createElementNS(this.namespaceURI, b) : rc.createElement(b);for (t.h ? b.__shady_native_innerHTML = a : b.innerHTML = a; a = b.__shady_firstChild;) this.__shady_insertBefore(a);
      }
    } });var tc = z({ blur: function () {
      var a = q(this);(a = (a = a && a.root) && a.activeElement) ? a.__shady_blur() : this.__shady_native_blur();
    } });t.T || Db.forEach(function (a) {
    tc[a] = { set: function (b) {
        var c = p(this),
            d = a.substring(2);c.v || (c.v = {});c.v[a] && this.removeEventListener(d, c.v[a]);this.__shady_addEventListener(d, b);c.v[a] = b;
      }, get: function () {
        var b = q(this);return b && b.v && b.v[a];
      }, configurable: !0 };
  });var uc = z({ assignedNodes: function (a) {
      if ("slot" === this.localName) {
        var b = this.__shady_getRootNode();b && v(b) && ac(b);return (b = q(this)) ? (a && a.flatten ? b.B : b.assignedNodes) || [] : [];
      }
    }, addEventListener: function (a, b, c) {
      if ("slot" !== this.localName || "slotchange" === a) ub.call(this, a, b, c);else {
        "object" !== typeof c && (c = { capture: !!c });var d = this.__shady_parentNode;if (!d) throw Error("ShadyDOM cannot attach event to slot unless it has a `parentNode`");c.w = this;d.__shady_addEventListener(a, b, c);
      }
    }, removeEventListener: function (a, b, c) {
      if ("slot" !== this.localName || "slotchange" === a) wb.call(this, a, b, c);else {
        "object" !== typeof c && (c = { capture: !!c });var d = this.__shady_parentNode;if (!d) throw Error("ShadyDOM cannot attach event to slot unless it has a `parentNode`");c.w = this;d.__shady_removeEventListener(a, b, c);
      }
    } });var vc = z({ getElementById: function (a) {
      return "" === a ? null : cc(this, function (b) {
        return b.id == a;
      }, function (b) {
        return !!b;
      })[0] || null;
    } });var wc = z({ get activeElement() {
      var a = t.h ? document.__shady_native_activeElement : document.activeElement;if (!a || !a.nodeType) return null;var b = !!v(this);if (!(this === document || b && this.host !== a && this.host.__shady_native_contains(a))) return null;for (b = E(a); b && b !== this;) a = b.host, b = E(a);return this === document ? b ? null : a : b === this ? a : null;
    } });var xc = window.document,
      yc = z({ importNode: function (a, b) {
      if (a.ownerDocument !== xc || "template" === a.localName) return this.__shady_native_importNode(a, b);var c = this.__shady_native_importNode(a, !1);if (b) for (a = a.__shady_firstChild; a; a = a.__shady_nextSibling) b = this.__shady_importNode(a, !0), c.__shady_appendChild(b);return c;
    } });var zc = z({ dispatchEvent: tb, addEventListener: ub.bind(window), removeEventListener: wb.bind(window) });var H = {};Object.getOwnPropertyDescriptor(HTMLElement.prototype, "parentElement") && (H.parentElement = $b.parentElement);Object.getOwnPropertyDescriptor(HTMLElement.prototype, "contains") && (H.contains = $b.contains);Object.getOwnPropertyDescriptor(HTMLElement.prototype, "children") && (H.children = G.children);Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerHTML") && (H.innerHTML = sc.innerHTML);Object.getOwnPropertyDescriptor(HTMLElement.prototype, "className") && (H.className = lc.className);
  var I = { EventTarget: [Hb], Node: [$b, window.EventTarget ? null : Hb], Text: [bc], Comment: [bc], CDATASection: [bc], ProcessingInstruction: [bc], Element: [lc, G, bc, !t.h || "innerHTML" in Element.prototype ? sc : null, window.HTMLSlotElement ? null : uc], HTMLElement: [tc, H], HTMLSlotElement: [uc], DocumentFragment: [fc, vc], Document: [yc, fc, vc, wc], Window: [zc] },
      Ac = t.h ? null : ["innerHTML", "textContent"];function J(a, b, c, d) {
    b.forEach(function (e) {
      return a && e && y(a, e, c, d);
    });
  }
  function Bc(a) {
    var b = a ? null : Ac,
        c;for (c in I) J(window[c] && window[c].prototype, I[c], a, b);
  }["Text", "Comment", "CDATASection", "ProcessingInstruction"].forEach(function (a) {
    var b = window[a],
        c = Object.create(b.prototype);c.__shady_protoIsPatched = !0;J(c, I.EventTarget);J(c, I.Node);I[a] && J(c, I[a]);b.prototype.__shady_patchedProto = c;
  });function Cc(a) {
    a.__shady_protoIsPatched = !0;J(a, I.EventTarget);J(a, I.Node);J(a, I.Element);J(a, I.HTMLElement);J(a, I.HTMLSlotElement);return a;
  };var Dc = t.S,
      Ec = t.h;function Fc(a, b) {
    if (Dc && !a.__shady_protoIsPatched && !v(a)) {
      var c = Object.getPrototypeOf(a),
          d = c.hasOwnProperty("__shady_patchedProto") && c.__shady_patchedProto;d || (d = Object.create(c), Cc(d), c.__shady_patchedProto = d);Object.setPrototypeOf(a, d);
    }Ec || (1 === b ? bb(a) : 2 === b && cb(a));
  }
  function Gc(a, b, c, d) {
    Fc(a, 1);d = d || null;var e = p(a),
        f = d ? p(d) : null;e.previousSibling = d ? f.previousSibling : b.__shady_lastChild;if (f = q(e.previousSibling)) f.nextSibling = a;if (f = q(e.nextSibling = d)) f.previousSibling = a;e.parentNode = b;d ? d === c.firstChild && (c.firstChild = a) : (c.lastChild = a, c.firstChild || (c.firstChild = a));c.childNodes = null;
  }
  function Xb(a, b, c) {
    Fc(b, 2);var d = p(b);void 0 !== d.firstChild && (d.childNodes = null);if (a.nodeType === Node.DOCUMENT_FRAGMENT_NODE) for (a = a.__shady_native_firstChild; a; a = a.__shady_native_nextSibling) Gc(a, b, d, c);else Gc(a, b, d, c);
  }
  function Zb(a, b) {
    var c = p(a);b = p(b);a === b.firstChild && (b.firstChild = c.nextSibling);a === b.lastChild && (b.lastChild = c.previousSibling);a = c.previousSibling;var d = c.nextSibling;a && (p(a).nextSibling = d);d && (p(d).previousSibling = a);c.parentNode = c.previousSibling = c.nextSibling = void 0;void 0 !== b.childNodes && (b.childNodes = null);
  }
  function nc(a, b) {
    var c = p(a);if (b || void 0 === c.firstChild) {
      c.childNodes = null;var d = c.firstChild = a.__shady_native_firstChild;c.lastChild = a.__shady_native_lastChild;Fc(a, 2);c = d;for (d = void 0; c; c = c.__shady_native_nextSibling) {
        var e = p(c);e.parentNode = b || a;e.nextSibling = c.__shady_native_nextSibling;e.previousSibling = d || null;d = c;Fc(c, 1);
      }
    }
  };var Hc = z({ addEventListener: function (a, b, c) {
      "object" !== typeof c && (c = { capture: !!c });c.w = c.w || this;this.host.__shady_addEventListener(a, b, c);
    }, removeEventListener: function (a, b, c) {
      "object" !== typeof c && (c = { capture: !!c });c.w = c.w || this;this.host.__shady_removeEventListener(a, b, c);
    } });function Ic(a, b) {
    y(a, Hc, b);y(a, wc, b);y(a, sc, b);y(a, G, b);t.j && !b ? (y(a, $b, b), y(a, vc, b)) : t.h || (y(a, Za), y(a, Xa), y(a, Ya));
  };var pc = {},
      K = t.deferConnectionCallbacks && "loading" === document.readyState,
      Jc;function Kc(a) {
    var b = [];do b.unshift(a); while (a = a.__shady_parentNode);return b;
  }function oc(a, b, c) {
    if (a !== pc) throw new TypeError("Illegal constructor");this.a = null;mc(this, b, c);
  }
  function mc(a, b, c) {
    a.host = b;a.mode = c && c.mode;nc(a.host);b = p(a.host);b.root = a;b.ra = "closed" !== a.mode ? a : null;b = p(a);b.firstChild = b.lastChild = b.parentNode = b.nextSibling = b.previousSibling = null;if (t.preferPerformance) for (; b = a.host.__shady_native_firstChild;) a.host.__shady_native_removeChild(b);else F(a);
  }function F(a) {
    a.A || (a.A = !0, ya(function () {
      return ac(a);
    }));
  }
  function ac(a) {
    var b;if (b = a.A) {
      for (var c; a;) a: {
        a.A && (c = a), b = a;a = b.host.__shady_getRootNode();if (v(a) && (b = q(b.host)) && 0 < b.G) break a;a = void 0;
      }b = c;
    }(c = b) && c._renderSelf();
  }
  oc.prototype._renderSelf = function () {
    var a = K;K = !0;this.A = !1;if (this.a) {
      ic(this);for (var b = 0, c; b < this.a.length; b++) {
        c = this.a[b];var d = q(c),
            e = d.assignedNodes;d.assignedNodes = [];d.B = [];if (d.W = e) for (d = 0; d < e.length; d++) {
          var f = q(e[d]);f.N = f.assignedSlot;f.assignedSlot === c && (f.assignedSlot = null);
        }
      }for (b = this.host.__shady_firstChild; b; b = b.__shady_nextSibling) Lc(this, b);for (b = 0; b < this.a.length; b++) {
        c = this.a[b];e = q(c);if (!e.assignedNodes.length) for (d = c.__shady_firstChild; d; d = d.__shady_nextSibling) Lc(this, d, c);
        (d = (d = q(c.__shady_parentNode)) && d.root) && (ja(d) || d.A) && d._renderSelf();Mc(this, e.B, e.assignedNodes);if (d = e.W) {
          for (f = 0; f < d.length; f++) q(d[f]).N = null;e.W = null;d.length > e.assignedNodes.length && (e.O = !0);
        }e.O && (e.O = !1, Nc(this, c));
      }c = this.a;b = [];for (e = 0; e < c.length; e++) d = c[e].__shady_parentNode, (f = q(d)) && f.root || !(0 > b.indexOf(d)) || b.push(d);for (c = 0; c < b.length; c++) {
        f = b[c];e = f === this ? this.host : f;d = [];for (f = f.__shady_firstChild; f; f = f.__shady_nextSibling) if ("slot" == f.localName) for (var g = q(f).B, h = 0; h < g.length; h++) d.push(g[h]);else d.push(f);f = sa(e);g = Fb(d, d.length, f, f.length);for (var l = h = 0, k = void 0; h < g.length && (k = g[h]); h++) {
          for (var m = 0, r = void 0; m < k.D.length && (r = k.D[m]); m++) r.__shady_native_parentNode === e && e.__shady_native_removeChild(r), f.splice(k.index + l, 1);l -= k.H;
        }l = 0;for (k = void 0; l < g.length && (k = g[l]); l++) for (h = f[k.index], m = k.index; m < k.index + k.H; m++) r = d[m], e.__shady_native_insertBefore(r, h), f.splice(m, 0, r);
      }
    }if (!t.preferPerformance && !this.V) for (b = this.host.__shady_firstChild; b; b = b.__shady_nextSibling) c = q(b), b.__shady_native_parentNode !== this.host || "slot" !== b.localName && c.assignedSlot || this.host.__shady_native_removeChild(b);this.V = !0;K = a;Jc && Jc();
  };function Lc(a, b, c) {
    var d = p(b),
        e = d.N;d.N = null;c || (c = (a = a.b[b.__shady_slot || "__catchall"]) && a[0]);c ? (p(c).assignedNodes.push(b), d.assignedSlot = c) : d.assignedSlot = void 0;e !== d.assignedSlot && d.assignedSlot && (p(d.assignedSlot).O = !0);
  }function Mc(a, b, c) {
    for (var d = 0, e = void 0; d < c.length && (e = c[d]); d++) if ("slot" == e.localName) {
      var f = q(e).assignedNodes;f && f.length && Mc(a, b, f);
    } else b.push(c[d]);
  }
  function Nc(a, b) {
    b.__shady_native_dispatchEvent(new Event("slotchange"));b = q(b);b.assignedSlot && Nc(a, b.assignedSlot);
  }function Wb(a) {
    a.c = a.c || [];a.a = a.a || [];a.b = a.b || {};
  }function ic(a) {
    if (a.c && a.c.length) {
      for (var b = a.c, c, d = 0; d < b.length; d++) {
        var e = b[d];nc(e);var f = e.__shady_parentNode;nc(f);f = q(f);f.G = (f.G || 0) + 1;f = jc(e);a.b[f] ? (c = c || {}, c[f] = !0, a.b[f].push(e)) : a.b[f] = [e];a.a.push(e);
      }if (c) for (var g in c) a.b[g] = kc(a.b[g]);a.c = [];
    }
  }
  function jc(a) {
    var b = a.name || a.getAttribute("name") || "__catchall";return a.fa = b;
  }function kc(a) {
    return a.sort(function (b, c) {
      b = Kc(b);for (var d = Kc(c), e = 0; e < b.length; e++) {
        c = b[e];var f = d[e];if (c !== f) return b = ta(c.__shady_parentNode), b.indexOf(c) - b.indexOf(f);
      }
    });
  }
  function Yb(a, b) {
    if (a.a) {
      ic(a);var c = a.b,
          d;for (d in c) for (var e = c[d], f = 0; f < e.length; f++) {
        var g = e[f];if (qa(b, g)) {
          e.splice(f, 1);var h = a.a.indexOf(g);0 <= h && (a.a.splice(h, 1), (h = q(g.__shady_parentNode)) && h.G && h.G--);f--;g = q(g);if (h = g.B) for (var l = 0; l < h.length; l++) {
            var k = h[l],
                m = k.__shady_native_parentNode;m && m.__shady_native_removeChild(k);
          }g.B = [];g.assignedNodes = [];h = !0;
        }
      }return h;
    }
  }function ja(a) {
    ic(a);return !(!a.a || !a.a.length);
  }
  (function (a) {
    a.__proto__ = DocumentFragment.prototype;Ic(a, "__shady_");Ic(a);Object.defineProperties(a, { nodeType: { value: Node.DOCUMENT_FRAGMENT_NODE, configurable: !0 }, nodeName: { value: "#document-fragment", configurable: !0 }, nodeValue: { value: null, configurable: !0 } });["localName", "namespaceURI", "prefix"].forEach(function (b) {
      Object.defineProperty(a, b, { value: void 0, configurable: !0 });
    });["ownerDocument", "baseURI", "isConnected"].forEach(function (b) {
      Object.defineProperty(a, b, { get: function () {
          return this.host[b];
        },
        configurable: !0 });
    });
  })(oc.prototype);
  if (window.customElements && t.P && !t.preferPerformance) {
    var Oc = new Map();Jc = function () {
      var a = [];Oc.forEach(function (d, e) {
        a.push([e, d]);
      });Oc.clear();for (var b = 0; b < a.length; b++) {
        var c = a[b][0];a[b][1] ? c.__shadydom_connectedCallback() : c.__shadydom_disconnectedCallback();
      }
    };K && document.addEventListener("readystatechange", function () {
      K = !1;Jc();
    }, { once: !0 });var Pc = function (a, b, c) {
      var d = 0,
          e = "__isConnected" + d++;if (b || c) a.prototype.connectedCallback = a.prototype.__shadydom_connectedCallback = function () {
        K ? Oc.set(this, !0) : this[e] || (this[e] = !0, b && b.call(this));
      }, a.prototype.disconnectedCallback = a.prototype.__shadydom_disconnectedCallback = function () {
        K ? this.isConnected || Oc.set(this, !1) : this[e] && (this[e] = !1, c && c.call(this));
      };return a;
    },
        Qc = window.customElements.define,
        define = function (a, b) {
      var c = b.prototype.connectedCallback,
          d = b.prototype.disconnectedCallback;Qc.call(window.customElements, a, Pc(b, c, d));b.prototype.connectedCallback = c;b.prototype.disconnectedCallback = d;
    };window.customElements.define = define;Object.defineProperty(window.CustomElementRegistry.prototype, "define", { value: define, configurable: !0 });
  }function E(a) {
    a = a.__shady_getRootNode();if (v(a)) return a;
  };function L(a) {
    this.node = a;
  }n = L.prototype;n.addEventListener = function (a, b, c) {
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
  ea.Object.defineProperties(L.prototype, { activeElement: { configurable: !0, enumerable: !0, get: function () {
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
    Object.defineProperty(L.prototype, a, { get: function () {
        return this.node["__shady_" + a];
      }, set: function (b) {
        this.node["__shady_" + a] = b;
      }, configurable: !0 });
  });var Rc = new WeakMap();function Sc(a) {
    if (v(a) || a instanceof L) return a;var b = Rc.get(a);b || (b = new L(a), Rc.set(a, b));return b;
  };if (t.P) {
    var Tc = t.h ? function (a) {
      return a;
    } : function (a) {
      cb(a);bb(a);return a;
    },
        ShadyDOM = { inUse: t.P, patch: Tc, isShadyRoot: v, enqueue: ya, flush: za, flushInitial: function (a) {
        !a.V && a.A && ac(a);
      }, settings: t, filterMutations: Ea, observeChildren: Ca, unobserveChildren: Da, deferConnectionCallbacks: t.deferConnectionCallbacks, preferPerformance: t.preferPerformance, handlesDynamicScoping: !0, wrap: t.j ? Sc : Tc, wrapIfNeeded: !0 === t.j ? Sc : function (a) {
        return a;
      }, Wrapper: L, composedPath: lb, noPatch: t.j, patchOnDemand: t.S, nativeMethods: Oa,
      nativeTree: Pa, patchElementProto: Cc };window.ShadyDOM = ShadyDOM;Wa();Bc("__shady_");Object.defineProperty(document, "_activeElement", wc.activeElement);y(Window.prototype, zc, "__shady_");t.j ? t.S && y(Element.prototype, qc) : (Bc(), Cb());xb();window.Event = zb;window.CustomEvent = Ab;window.MouseEvent = Bb;window.ShadowRoot = oc;
  }; /*
     Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
     This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
     The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
     The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
     Code distributed by Google as part of the polymer project is also
     subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
     */
  function Uc() {
    this.end = this.start = 0;this.rules = this.parent = this.previous = null;this.cssText = this.parsedCssText = "";this.atRule = !1;this.type = 0;this.parsedSelector = this.selector = this.keyframesName = "";
  }
  function Vc(a) {
    var b = a = a.replace(Wc, "").replace(Xc, ""),
        c = new Uc();c.start = 0;c.end = b.length;for (var d = c, e = 0, f = b.length; e < f; e++) if ("{" === b[e]) {
      d.rules || (d.rules = []);var g = d,
          h = g.rules[g.rules.length - 1] || null;d = new Uc();d.start = e + 1;d.parent = g;d.previous = h;g.rules.push(d);
    } else "}" === b[e] && (d.end = e + 1, d = d.parent || c);return Yc(c, a);
  }
  function Yc(a, b) {
    var c = b.substring(a.start, a.end - 1);a.parsedCssText = a.cssText = c.trim();a.parent && (c = b.substring(a.previous ? a.previous.end : a.parent.start, a.start - 1), c = Zc(c), c = c.replace($c, " "), c = c.substring(c.lastIndexOf(";") + 1), c = a.parsedSelector = a.selector = c.trim(), a.atRule = 0 === c.indexOf("@"), a.atRule ? 0 === c.indexOf("@media") ? a.type = ad : c.match(bd) && (a.type = cd, a.keyframesName = a.selector.split($c).pop()) : a.type = 0 === c.indexOf("--") ? dd : ed);if (c = a.rules) for (var d = 0, e = c.length, f = void 0; d < e && (f = c[d]); d++) Yc(f, b);return a;
  }function Zc(a) {
    return a.replace(/\\([0-9a-f]{1,6})\s/gi, function (b, c) {
      b = c;for (c = 6 - b.length; c--;) b = "0" + b;return "\\" + b;
    });
  }
  function fd(a, b, c) {
    c = void 0 === c ? "" : c;var d = "";if (a.cssText || a.rules) {
      var e = a.rules,
          f;if (f = e) f = e[0], f = !(f && f.selector && 0 === f.selector.indexOf("--"));if (f) {
        f = 0;for (var g = e.length, h = void 0; f < g && (h = e[f]); f++) d = fd(h, b, d);
      } else b ? b = a.cssText : (b = a.cssText, b = b.replace(gd, "").replace(hd, ""), b = b.replace(id, "").replace(jd, "")), (d = b.trim()) && (d = "  " + d + "\n");
    }d && (a.selector && (c += a.selector + " {\n"), c += d, a.selector && (c += "}\n\n"));return c;
  }
  var ed = 1,
      cd = 7,
      ad = 4,
      dd = 1E3,
      Wc = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//gim,
      Xc = /@import[^;]*;/gim,
      gd = /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?(?:[;\n]|$)/gim,
      hd = /(?:^[^;\-\s}]+)?--[^;{}]*?:[^{};]*?{[^}]*?}(?:[;\n]|$)?/gim,
      id = /@apply\s*\(?[^);]*\)?\s*(?:[;\n]|$)?/gim,
      jd = /[^;:]*?:[^;]*?var\([^;]*\)(?:[;\n]|$)?/gim,
      bd = /^@[^\s]*keyframes/,
      $c = /\s+/g;var M = !(window.ShadyDOM && window.ShadyDOM.inUse),
      kd;function ld(a) {
    kd = a && a.shimcssproperties ? !1 : M || !(navigator.userAgent.match(/AppleWebKit\/601|Edge\/15/) || !window.CSS || !CSS.supports || !CSS.supports("box-shadow", "0 0 0 var(--foo)"));
  }var md;window.ShadyCSS && void 0 !== window.ShadyCSS.cssBuild && (md = window.ShadyCSS.cssBuild);var N = !(!window.ShadyCSS || !window.ShadyCSS.disableRuntime);
  window.ShadyCSS && void 0 !== window.ShadyCSS.nativeCss ? kd = window.ShadyCSS.nativeCss : window.ShadyCSS ? (ld(window.ShadyCSS), window.ShadyCSS = void 0) : ld(window.WebComponents && window.WebComponents.flags);var O = kd;var nd = /(?:^|[;\s{]\s*)(--[\w-]*?)\s*:\s*(?:((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^)]*?\)|[^};{])+)|\{([^}]*)\}(?:(?=[;\s}])|$))/gi,
      od = /(?:^|\W+)@apply\s*\(?([^);\n]*)\)?/gi,
      pd = /(--[\w-]+)\s*([:,;)]|$)/gi,
      qd = /(animation\s*:)|(animation-name\s*:)/,
      rd = /@media\s(.*)/,
      sd = /\{[^}]*\}/g;var td = new Set();function P(a, b) {
    if (!a) return "";"string" === typeof a && (a = Vc(a));b && Q(a, b);return fd(a, O);
  }function ud(a) {
    !a.__cssRules && a.textContent && (a.__cssRules = Vc(a.textContent));return a.__cssRules || null;
  }function vd(a) {
    return !!a.parent && a.parent.type === cd;
  }function Q(a, b, c, d) {
    if (a) {
      var e = !1,
          f = a.type;if (d && f === ad) {
        var g = a.selector.match(rd);g && (window.matchMedia(g[1]).matches || (e = !0));
      }f === ed ? b(a) : c && f === cd ? c(a) : f === dd && (e = !0);if ((a = a.rules) && !e) for (e = 0, f = a.length, g = void 0; e < f && (g = a[e]); e++) Q(g, b, c, d);
    }
  }
  function wd(a, b, c, d) {
    var e = document.createElement("style");b && e.setAttribute("scope", b);e.textContent = a;xd(e, c, d);return e;
  }var R = null;function yd(a) {
    a = document.createComment(" Shady DOM styles for " + a + " ");var b = document.head;b.insertBefore(a, (R ? R.nextSibling : null) || b.firstChild);return R = a;
  }function xd(a, b, c) {
    b = b || document.head;b.insertBefore(a, c && c.nextSibling || b.firstChild);R ? a.compareDocumentPosition(R) === Node.DOCUMENT_POSITION_PRECEDING && (R = a) : R = a;
  }
  function zd(a, b) {
    for (var c = 0, d = a.length; b < d; b++) if ("(" === a[b]) c++;else if (")" === a[b] && 0 === --c) return b;return -1;
  }function Ad(a, b) {
    var c = a.indexOf("var(");if (-1 === c) return b(a, "", "", "");var d = zd(a, c + 3),
        e = a.substring(c + 4, d);c = a.substring(0, c);a = Ad(a.substring(d + 1), b);d = e.indexOf(",");return -1 === d ? b(c, e.trim(), "", a) : b(c, e.substring(0, d).trim(), e.substring(d + 1).trim(), a);
  }function Bd(a, b) {
    M ? a.setAttribute("class", b) : window.ShadyDOM.nativeMethods.setAttribute.call(a, "class", b);
  }
  var Cd = window.ShadyDOM && window.ShadyDOM.wrap || function (a) {
    return a;
  };function S(a) {
    var b = a.localName,
        c = "";b ? -1 < b.indexOf("-") || (c = b, b = a.getAttribute && a.getAttribute("is") || "") : (b = a.is, c = a.extends);return { is: b, F: c };
  }function Dd(a) {
    for (var b = [], c = "", d = 0; 0 <= d && d < a.length; d++) if ("(" === a[d]) {
      var e = zd(a, d);c += a.slice(d, e + 1);d = e;
    } else "," === a[d] ? (b.push(c), c = "") : c += a[d];c && b.push(c);return b;
  }
  function T(a) {
    if (void 0 !== md) return md;if (void 0 === a.__cssBuild) {
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
  function Ed(a) {
    a = void 0 === a ? "" : a;return "" !== a && O ? M ? "shadow" === a : "shady" === a : !1;
  };function Fd() {}function Gd(a, b) {
    Hd(U, a, function (c) {
      V(c, b || "");
    });
  }function Hd(a, b, c) {
    b.nodeType === Node.ELEMENT_NODE && c(b);var d;"template" === b.localName ? d = (b.content || b._content || b).childNodes : d = b.children || b.childNodes;if (d) for (b = 0; b < d.length; b++) Hd(a, d[b], c);
  }
  function V(a, b, c) {
    if (b) if (a.classList) c ? (a.classList.remove("style-scope"), a.classList.remove(b)) : (a.classList.add("style-scope"), a.classList.add(b));else if (a.getAttribute) {
      var d = a.getAttribute("class");c ? d && (b = d.replace("style-scope", "").replace(b, ""), Bd(a, b)) : Bd(a, (d ? d + " " : "") + "style-scope " + b);
    }
  }function Id(a, b, c) {
    Hd(U, a, function (d) {
      V(d, b, !0);V(d, c);
    });
  }function Jd(a, b) {
    Hd(U, a, function (c) {
      V(c, b || "", !0);
    });
  }
  function Kd(a, b, c, d, e) {
    var f = U;e = void 0 === e ? "" : e;"" === e && (M || "shady" === (void 0 === d ? "" : d) ? e = P(b, c) : (a = S(a), e = Ld(f, b, a.is, a.F, c) + "\n\n"));return e.trim();
  }function Ld(a, b, c, d, e) {
    var f = Md(c, d);c = c ? "." + c : "";return P(b, function (g) {
      g.c || (g.selector = g.g = Nd(a, g, a.b, c, f), g.c = !0);e && e(g, c, f);
    });
  }function Md(a, b) {
    return b ? "[is=" + a + "]" : a;
  }
  function Nd(a, b, c, d, e) {
    var f = Dd(b.selector);if (!vd(b)) {
      b = 0;for (var g = f.length, h = void 0; b < g && (h = f[b]); b++) f[b] = c.call(a, h, d, e);
    }return f.filter(function (l) {
      return !!l;
    }).join(",");
  }function Od(a) {
    return a.replace(Pd, function (b, c, d) {
      -1 < d.indexOf("+") ? d = d.replace(/\+/g, "___") : -1 < d.indexOf("___") && (d = d.replace(/___/g, "+"));return ":" + c + "(" + d + ")";
    });
  }
  function Qd(a) {
    for (var b = [], c; c = a.match(Rd);) {
      var d = c.index,
          e = zd(a, d);if (-1 === e) throw Error(c.input + " selector missing ')'");c = a.slice(d, e + 1);a = a.replace(c, "\ue000");b.push(c);
    }return { U: a, matches: b };
  }function Sd(a, b) {
    var c = a.split("\ue000");return b.reduce(function (d, e, f) {
      return d + e + c[f + 1];
    }, c[0]);
  }
  Fd.prototype.b = function (a, b, c) {
    var d = !1;a = a.trim();var e = Pd.test(a);e && (a = a.replace(Pd, function (h, l, k) {
      return ":" + l + "(" + k.replace(/\s/g, "") + ")";
    }), a = Od(a));var f = Rd.test(a);if (f) {
      var g = Qd(a);a = g.U;g = g.matches;
    }a = a.replace(Td, ":host $1");a = a.replace(Ud, function (h, l, k) {
      d || (h = Vd(k, l, b, c), d = d || h.stop, l = h.ka, k = h.value);return l + k;
    });f && (a = Sd(a, g));e && (a = Od(a));return a = a.replace(Wd, function (h, l, k, m) {
      return '[dir="' + k + '"] ' + l + m + ", " + l + '[dir="' + k + '"]' + m;
    });
  };
  function Vd(a, b, c, d) {
    var e = a.indexOf("::slotted");0 <= a.indexOf(":host") ? a = Xd(a, d) : 0 !== e && (a = c ? Yd(a, c) : a);c = !1;0 <= e && (b = "", c = !0);if (c) {
      var f = !0;c && (a = a.replace(Zd, function (g, h) {
        return " > " + h;
      }));
    }return { value: a, ka: b, stop: f };
  }function Yd(a, b) {
    a = a.split(/(\[.+?\])/);for (var c = [], d = 0; d < a.length; d++) if (1 === d % 2) c.push(a[d]);else {
      var e = a[d];if ("" !== e || d !== a.length - 1) e = e.split(":"), e[0] += b, c.push(e.join(":"));
    }return c.join("");
  }
  function Xd(a, b) {
    var c = a.match($d);return (c = c && c[2].trim() || "") ? c[0].match(ae) ? a.replace($d, function (d, e, f) {
      return b + f;
    }) : c.split(ae)[0] === b ? c : "should_not_match" : a.replace(":host", b);
  }function be(a) {
    ":root" === a.selector && (a.selector = "html");
  }Fd.prototype.c = function (a) {
    return a.match(":host") ? "" : a.match("::slotted") ? this.b(a, ":not(.style-scope)") : Yd(a.trim(), ":not(.style-scope)");
  };ea.Object.defineProperties(Fd.prototype, { a: { configurable: !0, enumerable: !0, get: function () {
        return "style-scope";
      } } });
  var Pd = /:(nth[-\w]+)\(([^)]+)\)/,
      Ud = /(^|[\s>+~]+)((?:\[.+?\]|[^\s>+~=[])+)/g,
      ae = /[[.:#*]/,
      Td = /^(::slotted)/,
      $d = /(:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/,
      Zd = /(?:::slotted)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/,
      Wd = /(.*):dir\((?:(ltr|rtl))\)(.*)/,
      Rd = /:(?:matches|any|-(?:webkit|moz)-any)/,
      U = new Fd();function W(a, b, c, d, e) {
    this.o = a || null;this.b = b || null;this.R = c || [];this.l = null;this.cssBuild = e || "";this.F = d || "";this.a = this.m = this.u = null;
  }function X(a) {
    return a ? a.__styleInfo : null;
  }function ce(a, b) {
    return a.__styleInfo = b;
  }W.prototype.c = function () {
    return this.o;
  };W.prototype._getStyleRules = W.prototype.c;function de(a) {
    var b = this.matches || this.matchesSelector || this.mozMatchesSelector || this.msMatchesSelector || this.oMatchesSelector || this.webkitMatchesSelector;return b && b.call(this, a);
  }var ee = /:host\s*>\s*/,
      fe = navigator.userAgent.match("Trident");function ge() {}function he(a) {
    var b = {},
        c = [],
        d = 0;Q(a, function (f) {
      ie(f);f.index = d++;f = f.f.cssText;for (var g; g = pd.exec(f);) {
        var h = g[1];":" !== g[2] && (b[h] = !0);
      }
    }, function (f) {
      c.push(f);
    });a.b = c;a = [];for (var e in b) a.push(e);return a;
  }
  function ie(a) {
    if (!a.f) {
      var b = {},
          c = {};je(a, c) && (b.s = c, a.rules = null);b.cssText = a.parsedCssText.replace(sd, "").replace(nd, "");a.f = b;
    }
  }function je(a, b) {
    var c = a.f;if (c) {
      if (c.s) return Object.assign(b, c.s), !0;
    } else {
      c = a.parsedCssText;for (var d; a = nd.exec(c);) {
        d = (a[2] || a[3]).trim();if ("inherit" !== d || "unset" !== d) b[a[1].trim()] = d;d = !0;
      }return d;
    }
  }
  function ke(a, b, c) {
    b && (b = 0 <= b.indexOf(";") ? le(a, b, c) : Ad(b, function (d, e, f, g) {
      if (!e) return d + g;(e = ke(a, c[e], c)) && "initial" !== e ? "apply-shim-inherit" === e && (e = "inherit") : e = ke(a, c[f] || f, c) || f;return d + (e || "") + g;
    }));return b && b.trim() || "";
  }
  function le(a, b, c) {
    b = b.split(";");for (var d = 0, e, f; d < b.length; d++) if (e = b[d]) {
      od.lastIndex = 0;if (f = od.exec(e)) e = ke(a, c[f[1]], c);else if (f = e.indexOf(":"), -1 !== f) {
        var g = e.substring(f);g = g.trim();g = ke(a, g, c) || g;e = e.substring(0, f) + g;
      }b[d] = e && e.lastIndexOf(";") === e.length - 1 ? e.slice(0, -1) : e || "";
    }return b.join(";");
  }
  function me(a, b) {
    var c = {},
        d = [];Q(a, function (e) {
      e.f || ie(e);var f = e.g || e.parsedSelector;b && e.f.s && f && de.call(b, f) && (je(e, c), e = e.index, f = parseInt(e / 32, 10), d[f] = (d[f] || 0) | 1 << e % 32);
    }, null, !0);return { s: c, key: d };
  }
  function ne(a, b, c, d) {
    b.f || ie(b);if (b.f.s) {
      var e = S(a);a = e.is;e = e.F;e = a ? Md(a, e) : "html";var f = b.parsedSelector;var g = !!f.match(ee) || "html" === e && -1 < f.indexOf("html");var h = 0 === f.indexOf(":host") && !g;"shady" === c && (g = f === e + " > *." + e || -1 !== f.indexOf("html"), h = !g && 0 === f.indexOf(e));if (g || h) c = e, h && (b.g || (b.g = Nd(U, b, U.b, a ? "." + a : "", e)), c = b.g || e), g && "html" === e && (c = b.g || b.J), d({ U: c, pa: h, za: g });
    }
  }
  function oe(a, b, c) {
    var d = {},
        e = {};Q(b, function (f) {
      ne(a, f, c, function (g) {
        de.call(a._element || a, g.U) && (g.pa ? je(f, d) : je(f, e));
      });
    }, null, !0);return { sa: e, oa: d };
  }
  function pe(a, b, c, d) {
    var e = S(b),
        f = Md(e.is, e.F),
        g = new RegExp("(?:^|[^.#[:])" + (b.extends ? "\\" + f.slice(0, -1) + "\\]" : f) + "($|[.:[\\s>+~])"),
        h = X(b);e = h.o;h = h.cssBuild;var l = qe(e, d);return Kd(b, e, function (k) {
      var m = "";k.f || ie(k);k.f.cssText && (m = le(a, k.f.cssText, c));k.cssText = m;if (!M && !vd(k) && k.cssText) {
        var r = m = k.cssText;null == k.Y && (k.Y = qd.test(m));if (k.Y) if (null == k.K) {
          k.K = [];for (var w in l) r = l[w], r = r(m), m !== r && (m = r, k.K.push(w));
        } else {
          for (w = 0; w < k.K.length; ++w) r = l[k.K[w]], m = r(m);r = m;
        }k.cssText = r;k.g = k.g || k.selector;
        m = "." + d;w = Dd(k.g);r = 0;for (var ca = w.length, Ia = void 0; r < ca && (Ia = w[r]); r++) w[r] = Ia.match(g) ? Ia.replace(f, m) : m + " " + Ia;k.selector = w.join(",");
      }
    }, h);
  }function qe(a, b) {
    a = a.b;var c = {};if (!M && a) for (var d = 0, e = a[d]; d < a.length; e = a[++d]) {
      var f = e,
          g = b;f.i = new RegExp("\\b" + f.keyframesName + "(?!\\B|-)", "g");f.a = f.keyframesName + "-" + g;f.g = f.g || f.selector;f.selector = f.g.replace(f.keyframesName, f.a);c[e.keyframesName] = re(e);
    }return c;
  }function re(a) {
    return function (b) {
      return b.replace(a.i, a.a);
    };
  }
  function se(a, b) {
    var c = te,
        d = ud(a);a.textContent = P(d, function (e) {
      var f = e.cssText = e.parsedCssText;e.f && e.f.cssText && (f = f.replace(gd, "").replace(hd, ""), e.cssText = le(c, f, b));
    });
  }ea.Object.defineProperties(ge.prototype, { a: { configurable: !0, enumerable: !0, get: function () {
        return "x-scope";
      } } });var te = new ge();var ue = {},
      ve = window.customElements;if (ve && !M && !N) {
    var we = ve.define;ve.define = function (a, b, c) {
      ue[a] || (ue[a] = yd(a));we.call(ve, a, b, c);
    };
  };function xe() {
    this.cache = {};
  }xe.prototype.store = function (a, b, c, d) {
    var e = this.cache[a] || [];e.push({ s: b, styleElement: c, m: d });100 < e.length && e.shift();this.cache[a] = e;
  };function ye() {}var ze = new RegExp(U.a + "\\s*([^\\s]*)");function Ae(a) {
    return (a = (a.classList && a.classList.value ? a.classList.value : a.getAttribute("class") || "").match(ze)) ? a[1] : "";
  }function Be(a) {
    var b = Cd(a).getRootNode();return b === a || b === a.ownerDocument ? "" : (a = b.host) ? S(a).is : "";
  }
  function Ce(a) {
    for (var b = 0; b < a.length; b++) {
      var c = a[b];if (c.target !== document.documentElement && c.target !== document.head) for (var d = 0; d < c.addedNodes.length; d++) {
        var e = c.addedNodes[d];if (e.nodeType === Node.ELEMENT_NODE) {
          var f = e.getRootNode(),
              g = Ae(e);if (g && f === e.ownerDocument && ("style" !== e.localName && "template" !== e.localName || "" === T(e))) Jd(e, g);else if (f instanceof ShadowRoot) for (f = Be(e), f !== g && Id(e, g, f), e = window.ShadyDOM.nativeMethods.querySelectorAll.call(e, ":not(." + U.a + ")"), g = 0; g < e.length; g++) {
            f = e[g];
            var h = Be(f);h && V(f, h);
          }
        }
      }
    }
  }
  if (!(M || window.ShadyDOM && window.ShadyDOM.handlesDynamicScoping)) {
    var De = new MutationObserver(Ce),
        Ee = function (a) {
      De.observe(a, { childList: !0, subtree: !0 });
    };if (window.customElements && !window.customElements.polyfillWrapFlushCallback) Ee(document);else {
      var Fe = function () {
        Ee(document.body);
      };window.HTMLImports ? window.HTMLImports.whenReady(Fe) : requestAnimationFrame(function () {
        if ("loading" === document.readyState) {
          var a = function () {
            Fe();document.removeEventListener("readystatechange", a);
          };document.addEventListener("readystatechange", a);
        } else Fe();
      });
    }ye = function () {
      Ce(De.takeRecords());
    };
  };var Ge = {};var He = Promise.resolve();function Ie(a) {
    if (a = Ge[a]) a._applyShimCurrentVersion = a._applyShimCurrentVersion || 0, a._applyShimValidatingVersion = a._applyShimValidatingVersion || 0, a._applyShimNextVersion = (a._applyShimNextVersion || 0) + 1;
  }function Je(a) {
    return a._applyShimCurrentVersion === a._applyShimNextVersion;
  }function Ke(a) {
    a._applyShimValidatingVersion = a._applyShimNextVersion;a._validating || (a._validating = !0, He.then(function () {
      a._applyShimCurrentVersion = a._applyShimNextVersion;a._validating = !1;
    }));
  };var Le = {},
      Me = new xe();function Y() {
    this.X = {};this.c = document.documentElement;var a = new Uc();a.rules = [];this.i = ce(this.c, new W(a));this.J = !1;this.a = this.b = null;
  }n = Y.prototype;n.flush = function () {
    ye();
  };n.ma = function (a) {
    return ud(a);
  };n.wa = function (a) {
    return P(a);
  };n.prepareTemplate = function (a, b, c) {
    this.prepareTemplateDom(a, b);this.prepareTemplateStyles(a, b, c);
  };
  n.prepareTemplateStyles = function (a, b, c) {
    if (!a._prepared && !N) {
      M || ue[b] || (ue[b] = yd(b));a._prepared = !0;a.name = b;a.extends = c;Ge[b] = a;var d = T(a),
          e = Ed(d);c = { is: b, extends: c };for (var f = [], g = a.content.querySelectorAll("style"), h = 0; h < g.length; h++) {
        var l = g[h];if (l.hasAttribute("shady-unscoped")) {
          if (!M) {
            var k = l.textContent;td.has(k) || (td.add(k), k = l.cloneNode(!0), document.head.appendChild(k));l.parentNode.removeChild(l);
          }
        } else f.push(l.textContent), l.parentNode.removeChild(l);
      }f = f.join("").trim() + (Le[b] || "");Ne(this);
      if (!e) {
        if (g = !d) g = od.test(f) || nd.test(f), od.lastIndex = 0, nd.lastIndex = 0;h = Vc(f);g && O && this.b && this.b.transformRules(h, b);a._styleAst = h;
      }g = [];O || (g = he(a._styleAst));if (!g.length || O) h = M ? a.content : null, b = ue[b] || null, d = Kd(c, a._styleAst, null, d, e ? f : ""), d = d.length ? wd(d, c.is, h, b) : null, a._style = d;a.a = g;
    }
  };n.qa = function (a, b) {
    Le[b] = a.join(" ");
  };n.prepareTemplateDom = function (a, b) {
    if (!N) {
      var c = T(a);M || "shady" === c || a._domPrepared || (a._domPrepared = !0, Gd(a.content, b));
    }
  };
  function Oe(a) {
    var b = S(a),
        c = b.is;b = b.F;var d = ue[c] || null,
        e = Ge[c];if (e) {
      c = e._styleAst;var f = e.a;e = T(e);b = new W(c, d, f, b, e);ce(a, b);return b;
    }
  }function Pe(a) {
    !a.a && window.ShadyCSS && window.ShadyCSS.CustomStyleInterface && (a.a = window.ShadyCSS.CustomStyleInterface, a.a.transformCallback = function (b) {
      a.ba(b);
    }, a.a.validateCallback = function () {
      requestAnimationFrame(function () {
        (a.a.enqueued || a.J) && a.flushCustomStyles();
      });
    });
  }
  function Ne(a) {
    if (!a.b && window.ShadyCSS && window.ShadyCSS.ApplyShim) {
      a.b = window.ShadyCSS.ApplyShim;a.b.invalidCallback = Ie;var b = !0;
    } else b = !1;Pe(a);return b;
  }
  n.flushCustomStyles = function () {
    if (!N) {
      var a = Ne(this);if (this.a) {
        var b = this.a.processStyles();if ((a || this.a.enqueued) && !Ed(this.i.cssBuild)) {
          if (O) {
            if (!this.i.cssBuild) for (a = 0; a < b.length; a++) {
              var c = this.a.getStyleForCustomStyle(b[a]);if (c && O && this.b) {
                var d = ud(c);Ne(this);this.b.transformRules(d);c.textContent = P(d);
              }
            }
          } else {
            Qe(this, b);Re(this, this.c, this.i);for (a = 0; a < b.length; a++) (c = this.a.getStyleForCustomStyle(b[a])) && se(c, this.i.u);this.J && this.styleDocument();
          }this.a.enqueued = !1;
        }
      }
    }
  };
  function Qe(a, b) {
    b = b.map(function (c) {
      return a.a.getStyleForCustomStyle(c);
    }).filter(function (c) {
      return !!c;
    });b.sort(function (c, d) {
      c = d.compareDocumentPosition(c);return c & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : c & Node.DOCUMENT_POSITION_PRECEDING ? -1 : 0;
    });a.i.o.rules = b.map(function (c) {
      return ud(c);
    });
  }
  n.styleElement = function (a, b) {
    if (N) {
      if (b) {
        X(a) || ce(a, new W(null));var c = X(a);c.l = c.l || {};Object.assign(c.l, b);Se(this, a, c);
      }
    } else if (c = X(a) || Oe(a)) if (a !== this.c && (this.J = !0), b && (c.l = c.l || {}, Object.assign(c.l, b)), O) Se(this, a, c);else if (this.flush(), Re(this, a, c), c.R && c.R.length) {
      b = S(a).is;var d;a: {
        if (d = Me.cache[b]) for (var e = d.length - 1; 0 <= e; e--) {
          var f = d[e];b: {
            var g = c.R;for (var h = 0; h < g.length; h++) {
              var l = g[h];if (f.s[l] !== c.u[l]) {
                g = !1;break b;
              }
            }g = !0;
          }if (g) {
            d = f;break a;
          }
        }d = void 0;
      }g = d ? d.styleElement : null;e = c.m;
      (f = d && d.m) || (f = this.X[b] = (this.X[b] || 0) + 1, f = b + "-" + f);c.m = f;f = c.m;h = te;h = g ? g.textContent || "" : pe(h, a, c.u, f);l = X(a);var k = l.a;k && !M && k !== g && (k._useCount--, 0 >= k._useCount && k.parentNode && k.parentNode.removeChild(k));M ? l.a ? (l.a.textContent = h, g = l.a) : h && (g = wd(h, f, a.shadowRoot, l.b)) : g ? g.parentNode || (fe && -1 < h.indexOf("@media") && (g.textContent = h), xd(g, null, l.b)) : h && (g = wd(h, f, null, l.b));g && (g._useCount = g._useCount || 0, l.a != g && g._useCount++, l.a = g);f = g;M || (g = c.m, l = h = a.getAttribute("class") || "", e && (l = h.replace(new RegExp("\\s*x-scope\\s*" + e + "\\s*", "g"), " ")), l += (l ? " " : "") + "x-scope " + g, h !== l && Bd(a, l));d || Me.store(b, c.u, f, c.m);
    }
  };
  function Se(a, b, c) {
    var d = S(b).is;if (c.l) {
      var e = c.l,
          f;for (f in e) null === f ? b.style.removeProperty(f) : b.style.setProperty(f, e[f]);
    }e = Ge[d];if (!(!e && b !== a.c || e && "" !== T(e)) && e && e._style && !Je(e)) {
      if (Je(e) || e._applyShimValidatingVersion !== e._applyShimNextVersion) Ne(a), a.b && a.b.transformRules(e._styleAst, d), e._style.textContent = Kd(b, c.o), Ke(e);M && (a = b.shadowRoot) && (a = a.querySelector("style")) && (a.textContent = Kd(b, c.o));c.o = e._styleAst;
    }
  }
  function Te(a, b) {
    return (b = Cd(b).getRootNode().host) ? X(b) || Oe(b) ? b : Te(a, b) : a.c;
  }function Re(a, b, c) {
    var d = Te(a, b),
        e = X(d),
        f = e.u;d === a.c || f || (Re(a, d, e), f = e.u);a = Object.create(f || null);d = oe(b, c.o, c.cssBuild);b = me(e.o, b).s;Object.assign(a, d.oa, b, d.sa);b = c.l;for (var g in b) if ((e = b[g]) || 0 === e) a[g] = e;g = te;b = Object.getOwnPropertyNames(a);for (e = 0; e < b.length; e++) d = b[e], a[d] = ke(g, a[d], a);c.u = a;
  }n.styleDocument = function (a) {
    this.styleSubtree(this.c, a);
  };
  n.styleSubtree = function (a, b) {
    var c = Cd(a),
        d = c.shadowRoot,
        e = a === this.c;(d || e) && this.styleElement(a, b);if (a = e ? c : d) for (a = Array.from(a.querySelectorAll("*")).filter(function (f) {
      return Cd(f).shadowRoot;
    }), b = 0; b < a.length; b++) this.styleSubtree(a[b]);
  };
  n.ba = function (a) {
    var b = this,
        c = T(a);c !== this.i.cssBuild && (this.i.cssBuild = c);if (!Ed(c)) {
      var d = ud(a);Q(d, function (e) {
        if (M) be(e);else {
          var f = U;e.selector = e.parsedSelector;be(e);e.selector = e.g = Nd(f, e, f.c, void 0, void 0);
        }O && "" === c && (Ne(b), b.b && b.b.transformRule(e));
      });O ? a.textContent = P(d) : this.i.o.rules.push(d);
    }
  };n.getComputedStyleValue = function (a, b) {
    var c;O || (c = (X(a) || X(Te(this, a))).u[b]);return (c = c || window.getComputedStyle(a).getPropertyValue(b)) ? c.trim() : "";
  };
  n.va = function (a, b) {
    var c = Cd(a).getRootNode(),
        d;b ? d = ("string" === typeof b ? b : String(b)).split(/\s/) : d = [];b = c.host && c.host.localName;if (!b && (c = a.getAttribute("class"))) {
      c = c.split(/\s/);for (var e = 0; e < c.length; e++) if (c[e] === U.a) {
        b = c[e + 1];break;
      }
    }b && d.push(U.a, b);O || (b = X(a)) && b.m && d.push(te.a, b.m);Bd(a, d.join(" "));
  };n.ja = function (a) {
    return X(a);
  };n.ua = function (a, b) {
    V(a, b);
  };n.xa = function (a, b) {
    V(a, b, !0);
  };n.ta = function (a) {
    return Be(a);
  };n.la = function (a) {
    return Ae(a);
  };Y.prototype.flush = Y.prototype.flush;
  Y.prototype.prepareTemplate = Y.prototype.prepareTemplate;Y.prototype.styleElement = Y.prototype.styleElement;Y.prototype.styleDocument = Y.prototype.styleDocument;Y.prototype.styleSubtree = Y.prototype.styleSubtree;Y.prototype.getComputedStyleValue = Y.prototype.getComputedStyleValue;Y.prototype.setElementClass = Y.prototype.va;Y.prototype._styleInfoForNode = Y.prototype.ja;Y.prototype.transformCustomStyleForDocument = Y.prototype.ba;Y.prototype.getStyleAst = Y.prototype.ma;Y.prototype.styleAstToString = Y.prototype.wa;
  Y.prototype.flushCustomStyles = Y.prototype.flushCustomStyles;Y.prototype.scopeNode = Y.prototype.ua;Y.prototype.unscopeNode = Y.prototype.xa;Y.prototype.scopeForNode = Y.prototype.ta;Y.prototype.currentScopeForNode = Y.prototype.la;Y.prototype.prepareAdoptedCssText = Y.prototype.qa;Object.defineProperties(Y.prototype, { nativeShadow: { get: function () {
        return M;
      } }, nativeCss: { get: function () {
        return O;
      } } });var Z = new Y(),
      Ue,
      Ve;window.ShadyCSS && (Ue = window.ShadyCSS.ApplyShim, Ve = window.ShadyCSS.CustomStyleInterface);
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
    }, nativeCss: O, nativeShadow: M, cssBuild: md, disableRuntime: N };Ue && (window.ShadyCSS.ApplyShim = Ue);Ve && (window.ShadyCSS.CustomStyleInterface = Ve);
}).call(this);

//# sourceMappingURL=webcomponents-sd.js.map