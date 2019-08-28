/**
 * @license
 * Copyright (c) 2016 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

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
    return notes;
  }
  // walking subtree at `node`
  _annotateSubtree(node) {
    let childLocators;
    for (let i = 0, child = node.firstChild, previous = null, neo; child; i++) {
      // returns a locator only if a node in the subtree requires one
      const childLocator = this._annotateNode(child);
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
    const key = this.key++;
    const shouldLocate = this.cb(node, key, this.notes, this.opts);
    // recurse
    const locators = this._annotateSubtree(node);
    if (shouldLocate || locators) {
      const cl = Object.create(null);
      cl.key = key;
      if (locators) {
        cl.sub = locators;
      }
      return cl;
    }
  }
}

const locateNodes = function(root, locator, map) {
  map = map || [];
  for (const n in locator) {
    const loc = locator[n];
    if (loc) {
      const node = root.childNodes[n];
      // TODO(sjmiles): text-nodes sometimes evacipate when stamped, so map to the parentElement instead
      map[loc.key] = (node.nodeType === Node.TEXT_NODE) ? node.parentElement : node;
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
const annotatorImpl = function(node, key, notes, opts) {
  let tracking = false;
  // hook
  if (opts.annotator && opts.annotator(node, key, notes, opts)) {
    tracking = true;
  }
  // default
  switch (node.nodeType) {
    case Node.DOCUMENT_FRAGMENT_NODE:
      break;
    case Node.ELEMENT_NODE:
      return tracking || annotateElementNode(node, key, notes);
    case Node.TEXT_NODE:
      return tracking || annotateTextNode(node, key, notes);
  }
  return tracking;
};

const annotateTextNode = function(node, key, notes) {
  if (annotateMustache(node, key, notes, 'textContent', node.textContent)) {
    node.textContent = '';
    return true;
  }
};

const annotateElementNode = function(node, key, notes) {
  if (node.hasAttributes()) {
    let noted = false;
    for (let a$ = node.attributes, i = a$.length - 1, a; i >= 0 && (a = a$[i]); i--) {
      if (
        annotateEvent(node, key, notes, a.name, a.value) ||
        annotateMustache(node, key, notes, a.name, a.value) ||
        annotateDirective(node, key, notes, a.name, a.value)
      ) {
        node.removeAttribute(a.name);
        noted = true;
      }
    }
    return noted;
  }
};

const annotateMustache = function(node, key, notes, property, mustache) {
  if (mustache.slice(0, 2) === '{{') {
    if (property === 'class') {
      property = 'className';
    }
    let value = mustache.slice(2, -2);
    const override = value.split(':');
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

const annotateEvent = function(node, key, notes, name, value) {
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

const annotateDirective = function(node, key, notes, name, value) {
  if (name === 'xen:forward') {
    takeNote(notes, key, 'events', 'xen:forward', value);
    return true;
  }
};

const takeNote = function(notes, key, group, name, note) {
  const n$ = notes[key] || (notes[key] = Object.create(null));
  (n$[group] || (n$[group] = {}))[name] = note;
};

const annotator = new Annotator(annotatorImpl);

const annotate = function(root, key, opts) {
  return (root._notes ||
    (root._notes = annotator.annotate(root.content, {/*ids:{}*/}, key, opts))
  );
};

/* Annotation Consumer */
const mapEvents = function(notes, map, mapper) {
  // add event listeners
  for (const key in notes) {
    const node = map[key];
    const events = notes[key] && notes[key].events;
    if (node && events) {
      for (const name in events) {
        mapper(node, name, events[name]);
      }
    }
  }
};

const listen = function(controller, node, eventName, handlerName) {
  node.addEventListener(eventName, function(e) {
    if (controller[handlerName]) {
      return controller[handlerName](e, e.detail);
    } else if (controller.defaultHandler) {
      return controller.defaultHandler(handlerName, e);
    }
  });
};

const set = function(notes, map, scope, controller) {
  if (scope) {
    for (const key in notes) {
      const node = map[key];
      if (node) {
        // everybody gets a scope
        node.scope = scope;
        // now get your regularly scheduled bindings
        const mustaches = notes[key].mustaches;
        for (const name in mustaches) {
          const property = mustaches[name];
          if (property in scope) {
            _set(node, name, scope[property], controller);
          }
        }
      }
    }
  }
};

const _set = function(node, property, value, controller) {
  // TODO(sjmiles): the property conditionals here could be precompiled
  const modifier = property.slice(-1);
  if (property === 'style%' || property === 'style' || property === 'xen:style') {
    if (typeof value === 'string') {
      node.style.cssText = value;
    } else {
      Object.assign(node.style, value);
    }
  } else if (modifier == '$') {
    const n = property.slice(0, -1);
    if (typeof value === 'boolean' || value === undefined) {
      setBoolAttribute(node, n, Boolean(value));
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
  } else if (property === 'value') {
    // TODO(sjmiles): specifically dirty-check `value` to avoid resetting input elements
    if (node.value !== value) {
      node.value = value;
    }
  } else {
    node[property] = value;
  }
};

const setBoolAttribute = function(node, attr, state) {
  node[
    (state === undefined ? !node.hasAttribute(attr) : state)
      ? 'setAttribute'
      : 'removeAttribute'
  ](attr, '');
};

const _setSubTemplate = function(node, value, controller) {
  // TODO(sjmiles): subtemplate iteration ability specially implemented to support arcs (serialization boundary)
  // TODO(sjmiles): Aim to re-implement as a plugin.
  let {template, models} = value;
  if (!template) {
    const container = node.getRootNode();
    template = container.querySelector(`template[${value.$template}]`);
  } else {
    template = maybeStringToTemplate(template);
  }
  _renderSubtemplates(node, controller, template, models);
};

const _renderSubtemplates = function(container, controller, template, models) {
  let child = container.firstElementChild;
  let next;
  if (template && models) {
    models && models.forEach((model, i)=>{
      next = child && child.nextElementSibling;
      // use existing node if possible
      if (!child) {
        const dom = stamp(template).events(controller);
        child = dom.root.firstElementChild;
        if (child) {
          child._subtreeDom = dom;
          container.appendChild(child);
          if (!template._shapeWarning && dom.root.firstElementChild) {
            template._shapeWarning = true;
            console.warn(`xen-template: subtemplate has multiple root nodes: only the first is used.`, template);
          }
        }
      }
      if (child) {
        child._subtreeDom.set(model);
        child = next;
      }
    });
  }
  // remove extra nodes
  while (child) {
    next = child.nextElementSibling;
    child.remove();
    child = next;
  }
};

//window.stampCount = 0;
//window.stampTime = 0;

const stamp = function(template, opts) {
  //const startTime = performance.now();
  //window.stampCount++;
  template = maybeStringToTemplate(template);
  // construct (or use memoized) notes
  const notes = annotate(template, opts);
  // CRITICAL TIMING ISSUE #1:
  // importNode can have side-effects, like CustomElement callbacks (before we
  // can do any work on the imported subtree, before we can mapEvents, e.g.).
  // we could clone into an inert document (say a new template) and process the nodes
  // before importing if necessary.
  const root = document.importNode(template.content, true);
  // templates don't require a single container element, but sometimes they do have one...
  // capture the fire element, because it's harder to find after we insert the nodes into DOM
  const firstElement = root.firstElementChild;
  // map DOM to keys
  const map = locateNodes(root, notes.locator);
  // return dom manager
  const dom = {
    root,
    notes,
    map,
    firstElement,
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
    // support event-forwarding when stamping descendent template DOM
    // i.e. for objects (say, elements) that consume templates as input
    // see also: support for `xen:forward` attribute above
    forward: function() {
      mapEvents(notes, map, (node, eventName, handlerName) => {
        node.addEventListener(eventName, e => {
          //console.log(`xen::forward: forwarding [${eventName}]`);
          const wrapper = {eventName, handlerName, detail: e.detail, target: e.target};
          fire(node, 'xen:forward', wrapper, {bubbles: true});
        });
      });
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
  //window.stampTime += performance.now() - startTime;
  return dom;
};

const fire = (node, eventName, detail, init) => {
  const eventInit = init || {};
  eventInit.detail = detail;
  const event = new CustomEvent(eventName, eventInit);
  node.dispatchEvent(event);
  return event.detail;
};

const maybeStringToTemplate = template => {
  // TODO(sjmiles): need to memoize this somehow
  return (typeof template === 'string') ? createTemplate(template) : template;
};

const createTemplate = innerHTML => {
  return Object.assign(document.createElement('template'), {innerHTML});
};

export const Template = {
  createTemplate,
  setBoolAttribute,
  stamp,
  takeNote
};