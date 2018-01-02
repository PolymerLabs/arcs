// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// Returns an array of Schema.org entities extracted from the given document
// or an empty array if none were found.
async function extractEntities(doc, windowLocation) {
  let microdata = extractMicrodata(doc.documentElement);
  let results = [];
  if (microdata.length) {
    results.push(...microdata);
  }

  let linkImage =
      doc.querySelector('link[rel~="image_src"], link[rel~="icon"]');
  let pageEntity = {
    '@type': 'http://schema.org/WebPage',
    name: doc.title,
    url: windowLocation.toString()
  };
  if (linkImage && linkImage.href) {
    pageEntity.image = linkImage.href;
  }
  results.push(pageEntity);
  results = results.concat(extractManifests());
  return results;
}

// This is out in a separate function, as extractMicrodata() may be replaced
// with a library for https://github.com/PolymerLabs/arcs/issues/431
function extractManifests() {
  const manifestType = 'text/x-arcs-manifest';
  return Array.prototype.map.call(
      document.querySelectorAll('link[type="' + manifestType + '"]'), link => {
        return {'@type': manifestType, url: link.href};
      });
}

// Extracts entities embedded in microdata from the page.
// Mostly follows http://schema.org/docs/gs.html
function extractMicrodata(root) {
  function entityWalker(root) {
    return document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (node.hasAttribute('itemscope') || node.hasAttribute('itemtype')) {
          if (node.hasAttribute('itemprop')) {
            // The entity is a property of another entity.
            return NodeFilter.FILTER_SKIP;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    });
  }

  function propWalker(root) {
    return document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (node == root) {
          return NodeFilter.FILTER_SKIP;
        }
        let parent = node.parentElement;
        if (parent && parent != root &&
            (parent.hasAttribute('itemscope') ||
             parent.hasAttribute('itemtype'))) {
          // No need to look for props inside nested entities.
          return NodeFilter.FILTER_REJECT;
        }
        if (node.hasAttribute('itemprop')) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      }
    });
  }

  function extractProperty(node) {
    let prop = node.getAttribute('itemprop');
    let value;
    if (node.hasAttribute('content')) {
      // TODO: Is it valid to prefer 'content' over all?
      // tandy has <meta itemprop="itemCondition" itemtype="http://schema.org/OfferItemCondition" content="http://schema.org/NewCondition"
      // officeworks has <a itemprop="sameAs" content="http://www.facebook.com/officeworks">http://www.facebook.com/officeworks</a>, the twitter
      // ebay has <div itemprop=x content=y>
      value = node.getAttribute('content');
    } else if (node.getAttribute('itemtype')) {
      value = extractEntity(node);
    } else if (node.tagName == 'LINK') {
      // TODO: untested
      value = node.href;
    } else if (node.tagName == 'META') {
      value = node.content;
    } else if (node.tagName == 'IMG') {
      value = node.src;
    } else if (node.tagName == 'A') {
      value = node.href;
    } else if (node.tagName == 'TIME') {
      // TODO: untested
      value = node.datetime;
    }
    if (value == undefined) {
      value = node.textContent.replace(/(^\s*|\s*$)/g, '');
    }
    return {prop, value};
  }

  function* extractProperties(node) {
    let walker = propWalker(node);
    while (walker.nextNode()) {
      yield extractProperty(walker.currentNode);
    }
  }

  function extractEntity(node) {
    let result = {};
    if (node.hasAttribute('itemtype')) {
      result['@type'] = node.getAttribute('itemtype');
    }
    for (let {prop, value} of extractProperties(node)) {
      if (typeof result[prop] != 'undefined') {
        if (!Array.isArray(result[prop])) {
          result[prop] = [result[prop]];
        }
        result[prop].push(value);
      } else {
        result[prop] = value;
      }
    }
    return result;
  }

  function* extractEntities(root) {
    let walker = entityWalker(root);
    while (walker.nextNode()) {
      yield extractEntity(walker.currentNode);
    }
  }

  return [...extractEntities(root)];
}
