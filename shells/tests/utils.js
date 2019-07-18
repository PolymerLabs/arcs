/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/*
TODO(sjmiles): WDIO pain notes:

I'm still a newb, but I stumbled on these things:

1. mode is `sync` in .conf, but seems like everything needs to `await` ... maybe a config problem, maybe
   some kind of automatic switch
2. wdio `click` commands are performed via position, so transitions and overlays create havok. I'm using a
   element-based `click` instead.
3. `web JSON object` is completely undocumented, afaict. I had to figure out usage by trial-and-error.

*/

/* global browser */

exports.seconds = s => s * 1e3;
exports.defaultTimeout = exports.seconds(30);
exports.shellUrl = `shells/web-shell`;

const storageKeyByType = {
  'pouchdb': `pouchdb://local/user`,
  'firebase': `firebase://arcs-storage-test.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8`
};

const installUtils = async () => {
  return browser.execute(() => {
    const result = {};
    const find = (element, selector) => {
      let result;
      while (element && !result) {
        if (element.matches(selector)) {
          result = element;
        }
        // if we didn't find it yet, descend into children (ignoring <style>)
        if (!result && element.localName !== 'style') {
          result = find(element.firstElementChild, selector);
        }
        // if we didn't find it yet, descend into shadowDOM
        if (!result && element.shadowRoot) {
          result = find(element.shadowRoot.firstElementChild, selector);
        }
        element = element.nextElementSibling;
      }
      return result;
    };
    const deepQuery = selector => {
      const element = find(document.body.firstElementChild, selector);
      result.element = element;
      return element;
    };
    window.wdio = {
      deepQuery,
      result
    };
  });
};

const deepQuerySelector = async selector => {
  return browser.execute(selector => {
    return window.wdio.deepQuery(selector);
  }, selector);
};

// TODO(sjmiles): not obvious how to use `await` inside of `browser.execute`,
// so waitFor exists at the wdio level (instead of browser-side, as I would prefer)
exports.waitFor = async function(selector, timeout) {
  await installUtils();
  //
  timeout = timeout || 20e3;
  let fail = false;
  setTimeout(() => fail = true, timeout);
  //
  let resolve;
  let reject;
  const result = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  //
  const tryQuery = () => setTimeout(async () => {
    if (fail) {
      reject(new Error(`timedout [${Math.floor(timeout/1e3)}] waiting for "${selector}"`));
    } else {
      const result = await deepQuerySelector(selector);
      console.log(result);
      if (result) {
        resolve(result);
      } else {
        tryQuery();
      }
    }
  }, 100);
  tryQuery();
  //
  return result;
};

exports.click = async function(selector, timeout) {
  const element = await exports.waitFor(selector, timeout);
  if (element) {
    return browser.execute(async (selector, timeout) => {
      const element = window.wdio.result.element;
      //console.log(`click: found element [${element.localName}]`);
      if (element) {
        element.click();
        element.focus();
      }
    }, selector, timeout);
  }
};

exports.keys = async function(selector, keys, timeout) {
  await exports.click(selector, timeout);
  await browser.keys(keys);
};

/**
 * Start a new arc in the webdriver environment.
 * @param storage pouchdb or firebase
 */

exports.openNewArc = async function(testTitle, storageType, useSolo) {
  // clean up extra open tabs
  //const openTabs = browser.getTabIds();
  //browser.switchTab(openTabs[0]);
  //openTabs.slice(1).forEach(tabToClose => {
  //  browser.close(tabToClose);
  //});
  const storageKey = storageKeyByType[storageType];
  let storage;
  let suffix;
  switch (storageType) {
    case 'pouchdb':
      // setup url params
      suffix = `${Date.now()}-${testTitle}`.replace(/\W+/g, '-').replace(/\./g, '_');
      storage = `${storageKey}/${suffix}/`;
      break;
    case 'firebase':
      suffix = `${new Date().toISOString()}_${testTitle}`.replace(/\W+/g, '-').replace(/\./g, '_');
      storage = `${storageKey}/${suffix}`;
      //console.log(`running test "${testTitle}" with firebaseKey "${firebaseKey}"`);
      break;
    default:
      throw new Error('must specify firebase/pouchdb parameter');
  }
  console.log(`\n\nrunning test "${testTitle}" [${storage}]\n`);
  const urlParams = [
    //`log`,
    `plannerStorage=volatile`,
    `persona=${storage}`
  ];
  if (useSolo) {
    urlParams.push(`solo=${browser.options.baseUrl}/artifacts/canonical.manifest`);
  }
  // note - baseUrl (currently specified on the command line) must end in a
  // trailing `/`, and this must not begin with a preceding `/`.
  // `browser.url()` will prefix its argument with baseUrl, and avoiding a
  // doubling `//` situation avoids some bugs.
  await browser.url(`${exports.shellUrl}/?${urlParams.join('&')}`);
  // only to ensure time for the app to configure itself
  await exports.waitFor('input[search]');
};

