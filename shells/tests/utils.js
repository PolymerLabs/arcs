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
   simple element-based `click` instead.
3. `web JSON object` is completely undocumented, afaict. I had to figure out usage by trial-and-error.

*/

exports.seconds = s => s * 1e3;
exports.defaultTimeout = exports.seconds(30);
exports.shellUrl = `shells/web-shell`;

const storageKeyByType = {
  'pouchdb': `pouchdb://local/user`,
  'firebase': `firebase://arcs-storage-test.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8`
};

function deepQuerySelector(selector) {
  return browser.execute(function(selector) {
    const find = (element, selector) => {
      let result;
      while (element && !result) {
        result = element.matches(selector) ? element : find(element.firstElementChild, selector);
        if (!result && element.shadowRoot) {
          result = find(element.shadowRoot.firstElementChild, selector);
        }
        element = element.nextElementSibling;
      }
      return result;
    };
    return find(document.body.firstElementChild, selector);
  }, selector);
}

exports.waitFor = async function(selector, timeout) {
  timeout = timeout || exports.defaultTimeout;
  let resolve;
  let reject;
  const result = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  let fail = false;
  setTimeout(() => fail = true, timeout);
  const tryQuery = () => setTimeout(async () => {
    if (fail) {
      //console.log(`rejecting "${selector}"`);
      reject(new Error(`timedout [${Math.floor(timeout/1e3)}] waiting for "${selector}"`));
      //resolve(true);
    } else {
      const element = await deepQuerySelector(selector);
      if (element && element.value) {
        //console.log(`resolving "${selector}"`);
        resolve(element);
      } else {
        tryQuery();
      }
    }
  }, 100);
  tryQuery();
  return result;
};

async function clickJson(webJSON) {
  return browser.execute(function(element) {
    element.click();
    element.focus();
  }, webJSON.value);
}

exports.click = async function(selector, timeout) {
  return clickJson(await exports.waitFor(selector, timeout));
};

exports.keys = async function(selector, keys, timeout) {
  await exports.click(selector, timeout);
  await browser.keys(keys);
};

/**
 * Start a new arc in the webdriver environment.
 * @param storage pouchdb or firebase
 */

exports.openNewArc = async function(testTitle, useSolo, storageType) {
  // clean up extra open tabs
  const openTabs = browser.getTabIds();
  browser.switchTab(openTabs[0]);
  openTabs.slice(1).forEach(tabToClose => {
    browser.close(tabToClose);
  });

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
  console.log(`running test "${testTitle}" [${storage}]`);
  const urlParams = [
    //`testFirebaseKey=${firebaseKey}`,
    //`log`,
    `plannerStorage=volatile`,
    `storage=${storage}`,
    'user=selenium'
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
