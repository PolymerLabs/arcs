/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

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

/* Annotator */
// tree walker that generates arbitrary data using visitor function `cb`
// `cb` is called as `cb(node, key, notes)`
// where
//   `node` is a visited node.
//   `key` is a handle which identifies the node in a map generated by `Annotator.locateNodes`.
class Annotator {
  constructor(cb) {
    this.cb = cb;
  }
  // For subtree at `node`, produce annotation object `notes`.
  // the content of `notes` is completely determined by the behavior of the
  // annotator callback function supplied at the constructor.
  annotate(node, notes, opts) {
    this.notes = notes;
    this.opts = opts || 0;
    this.key = this.opts.key || 0;
    notes.locator = this._annotateSubtree(node);
    //console.log('notes:', notes);
    return notes;
  }
  // walking subtree at `node`
  _annotateSubtree(node) {
    let childLocators;
    for (let i = 0, child = node.firstChild, previous = null, neo; child; i++) {
      // returns a locator only if a node in the subtree requires one
      let childLocator = this._annotateNode(child);
      // only when necessary, maintain a sparse array of locators
      if (childLocator) {
        (childLocators = childLocators || {})[i] = childLocator;
      }
      // `child` may have been evacipated by visitor
      neo = previous ? previous.nextSibling : node.firstChild;
      if (neo === child) {
        previous = child;
        child = child.nextSibling;
      } else {
        child = neo;
        i--;
      }
    }
    // is falsey unless there was at least one childLocator
    return childLocators;
  }
  _annotateNode(node) {
    // visit node
    let key = this.key++;
    let shouldLocate = this.cb(node, key, this.notes, this.opts);
    // recurse
    //console.group(node.localName||'#text');
    let locators = this._annotateSubtree(node);
    //console.groupEnd();
    if (shouldLocate || locators) {
      //console.log('capturing', key, '('+(node.localName||'#text')+')');
      let cl = Object.create(null);
      cl.key = key;
      if (locators) {
        cl.sub = locators;
      }
      return cl;
    }
  }
}

let locateNodes = function(root, locator, map) {
  map = map || [];
  for (let n in locator) {
    let loc = locator[n];
    if (loc) {
      let node = root.childNodes[n];
      if (node.nodeType == Node.TEXT_NODE && node.parentElement) {
        // TODO(mmandlis): remove this line and the (property === 'textContent') clause
        // in _set() method, in favor of explicit innerHTML binding.
        map[loc.key] = node.parentElement;
      } else {
        map[loc.key] = node;
      }
      if (loc.sub) {
        // recurse
        locateNodes(node, loc.sub, map);
      }
    }
  }
  return map;
};

/* Annotation Producer */
// must return `true` for any node whose key we wish to track
let annotatorImpl = function(node, key, notes, opts) {
  // hook
  if (opts.annotator && opts.annotator(node, key, notes, opts)) {
    return true;
  }
  // default
  switch (node.nodeType) {
    case Node.DOCUMENT_FRAGMENT_NODE:
      return;
    case Node.ELEMENT_NODE:
      return annotateElementNode(node, key, notes);
    case Node.TEXT_NODE:
      return annotateTextNode(node, key, notes);
  }
};

let annotateTextNode = function(node, key, notes) {
  if (annotateMustache(node, key, notes, 'textContent', node.textContent)) {
    node.textContent = '';
    return true;
  }
};

let annotateElementNode = function(node, key, notes) {
  if (node.hasAttributes()) {
    let noted = false;
    for (let a$ = node.attributes, i = a$.length - 1, a; i >= 0 && (a = a$[i]); i--) {
      if (
        annotateEvent(node, key, notes, a.name, a.value) ||
        annotateMustache(node, key, notes, a.name, a.value)
      ) {
        node.removeAttribute(a.name);
        noted = true;
      }
    }
    return noted;
  }
};

let annotateMustache = function(node, key, notes, property, mustache) {
  if (mustache.slice(0, 2) === '{{') {
    if (property === 'class') {
      property = 'className';
    }
    let value = mustache.slice(2, -2);
    let override = value.split(':');
    if (override.length === 2) {
      property = override[0];
      value = override[1];
    }
    takeNote(notes, key, 'mustaches', property, value);
    if (value[0] === '$') {
      takeNote(notes, 'xlate', value, true);
    }
    return true;
  }
};

let annotateEvent = function(node, key, notes, name, value) {
  if (name.slice(0, 3) === 'on-') {
    if (value.slice(0, 2) === '{{') {
      value = value.slice(2, -2);
      console.warn(
        `Xen: event handler for '${name}' expressed as a mustache, which is not supported. Using literal value '${value}' instead.`
      );
    }
    takeNote(notes, key, 'events', name.slice(3), value);
    return true;
  }
};

let takeNote = function(notes, key, group, name, note) {
  let n$ = notes[key] || (notes[key] = Object.create(null));
  (n$[group] || (n$[group] = {}))[name] = note;
  //console.log('[%s]::%s.{{%s}}:', key, group, name, note);
};

let annotator = new Annotator(annotatorImpl);

let annotate = function(root, key, opts) {
  return (root._notes ||
    (root._notes = annotator.annotate(root.content, {/*ids:{}*/}, key, opts))
  );
};

/* Annotation Consumer */
let mapEvents = function(notes, map, mapper) {
  // add event listeners
  for (let key in notes) {
    let node = map[key];
    let events = notes[key] && notes[key].events;
    if (node && events) {
      for (let name in events) {
        mapper(node, name, events[name]);
      }
    }
  }
};

let listen = function(controller, node, eventName, handlerName) {
  node.addEventListener(eventName, function(e) {
    if (controller[handlerName]) {
      return controller[handlerName](e, e.detail);
    }
  });
};

let set = function(notes, map, scope, controller) {
  if (scope) {
    for (let key in notes) {
      let node = map[key];
      if (node) {
        // everybody gets a scope
        node.scope = scope;
        // now get your regularly scheduled bindings
        let mustaches = notes[key].mustaches;
        for (let name in mustaches) {
          let property = mustaches[name];
          if (property in scope) {
            _set(node, name, scope[property], controller);
          }
        }
      }
    }
  }
};

let _set = function(node, property, value, controller) {
  let modifier = property.slice(-1);
  //console.log('_set: %s, %s, '%s'', node.localName || '(text)', property, value);
  if (property === 'style%' || property === 'style') {
    if (typeof value === 'string') {
      node.style.cssText = value;
    } else {
      Object.assign(node.style, value);
    }
  } else if (modifier == '$') {
    let n = property.slice(0, -1);
    if (typeof value === 'boolean') {
      setBoolAttribute(node, n, value);
    } else {
      node.setAttribute(n, value);
    }
  } else if (property === 'textContent') {
    if (value && (value.$template || value.template)) {
      _setSubTemplate(node, value, controller);
    } else {
      node.textContent = (value || '');
    }
  } else if (property === 'unsafe-html') {
    node.innerHTML = value || '';
  } else {
    node[property] = value;
  }
};

const createTemplate = innerHTML => {
  return Object.assign(document.createElement('template'), {innerHTML});
};

let _setSubTemplate = function(node, value, controller) {
  // TODO(sjmiles): sub-template iteration ability
  // specially implemented to support arcs (serialization boundary)
  // Aim to re-implement as a plugin.
  let template = value.template;
  if (!template) {
    let container = node.getRootNode();
    template = container.querySelector(`template[${value.$template}]`);
  } else if (typeof template === 'string') {
    template = createTemplate(template);
  }
  node.textContent = '';
  if (template && value.models) {
    for (let m of value.models) {
      stamp(template).events(controller).set(m).appendTo(node);
    }
  }
};

let setBoolAttribute = function(node, attr, state) {
  node[
    (state === undefined ? !node.hasAttribute(attr) : state)
      ? 'setAttribute'
      : 'removeAttribute'
  ](attr, '');
};

const maybeStringToTemplate = template => {
  // TODO(sjmiles): need to memoize this somehow
  return (typeof template === 'string') ? createTemplate(template) : template;
};

let stamp = function(template, opts) {
  template = maybeStringToTemplate(template);
  // construct (or use memoized) notes
  let notes = annotate(template, opts);
  // CRITICAL TIMING ISSUE #1:
  // importNode can have side-effects, like CustomElement callbacks (before we
  // can do any work on the imported subtree, before we can mapEvents, e.g.).
  // we could clone into an inert document (say a new template) and process the nodes
  // before importing if necessary.
  let root = document.importNode(template.content, true);
  // map DOM to keys
  let map = locateNodes(root, notes.locator);
  // return dom manager
  let dom = {
    root: root,
    notes: notes,
    map: map,
    $(slctr) {
      return this.root.querySelector(slctr);
    },
    set: function(scope) {
      scope && set(notes, map, scope, this.controller);
      return this;
    },
    events: function(controller) {
      // TODO(sjmiles): originally `controller` was expected to be an Object with event handler
      // methods on it (typically a custom-element stamping a template).
      // In Arcs, we want to attach a generic handler (Function) for any event on this node.
      // Subtemplate stamping gets involved because they need to reuse whichever controller.
      // I suspect this can be simplified, but right now I'm just making it go.
      if (controller && typeof controller !== 'function') {
        controller = listen.bind(this, controller);
      }
      this.controller = controller;
      if (controller) {
        mapEvents(notes, map, controller);
      }
      return this;
    },
    appendTo: function(node) {
      if (this.root) {
        // TODO(sjmiles): assumes this.root is a fragment
        node.appendChild(this.root);
      } else {
        console.warn('Xen: cannot appendTo, template stamped no DOM');
      }
      // TODO(sjmiles): this.root is no longer a fragment
      this.root = node;
      return this;
    }
  };
  return dom;
};

let Xen = {
  createTemplate,
  setBoolAttribute,
  stamp
};

export default Xen;
