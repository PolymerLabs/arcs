/*
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/* global browser */

const assert = require('assert');
const {URL} = require('url');

const divider = `\n`;

function pierceShadows(selectors) {
  return browser.execute(function(selectors) {
    return pierceShadows(selectors);
  }, selectors);
}

function pierceShadowsSingle(selectors) {
  return browser.execute(function(selectors) {
    return pierceShadowsSingle(selectors);
  }, selectors);
}

/** Wait a short, approximate time (up to 10 seconds) in 100ms increments. */
function wait(msToWait) {
  let msWaited = 0;
  const msIncrement = 100;
  const start = Date.now();
  browser.waitUntil(() => {
    msWaited += msIncrement;
    return msWaited > msToWait;
  }, 10000, `we should have exited after a few iterations`, msIncrement);
}

/**
 * Search the list of elements, return the one that matches (ignoring case
 * differences) the textQuery.
 * This method ignores case under the theory that a close match is better than
 * none, and probably indicates an innocuous change in (for instance) the
 * suggestion text rather than a change in functionality. This can be
 * revisited if that changes.
 * Return an error if there are multiple matches, null if there are none.
 * The return format should be an object with the format:
 *   {id: <element-id>, text: <found text>}
 */
function searchElementsForText(elements, textQuery) {
  if (!elements || 0 == elements.length) {
    return;
  }

  const textToId = elements.map(value => {
    return {
      id: value.ELEMENT,
      text: browser.elementIdText(value.ELEMENT).value
    };
  });
  assert.ok(textToId.length > 0, textToId);
  assert.equal(textToId.length, elements.length);

  const matches = textToId.reduce((accumulator, currentValue) => {
    const found =
        currentValue.text.toLowerCase().includes(textQuery.toLowerCase()) ?
        currentValue :
        null;
    if (accumulator && found) {
      throw Error(`found two matches:\nmatch 1: ${
          JSON.stringify(accumulator)}\nmatch 2: ${JSON.stringify(found)}`);
    } else if (accumulator) {
      return accumulator;
    }

    return found;
  }, null);

  return matches;
}

/** Load the selenium utils into the current page. */
function loadSeleniumUtils() {
  // wait for the page to load a bit. In the future, if we use this with
  // non-arcs pages, we should move this out.
  //browser.waitForVisible('<app-main>');
  //browser.waitForVisible('<footer>');
  browser.waitForVisible('<app-shell>');

  const result = browser.execute(function(baseUrl) {
    document.head.appendChild(Object.assign(document.createElement('script'), {
      type: 'text/javascript',
      src: `${baseUrl}/shell/test/selenium-utils.js`
    }));
  }, browser.options.baseUrl);

  browser.waitUntil(() => {
    try {
      // To see if our selenium-utils has finished loading, try one of the
      // methods (pierceShadows()) with an arbitrary argument. If the utils
      // haven't loaded yet this will throw an exception.
      browser.execute('pierceShadows(["head"])');
    } catch (e) {
      if (e.message.includes('pierceShadows is not defined')) {
        console.log(
            `spin-waiting for pierceShadows to load; the error indicates it's not yet loaded so waitUntil will try again (up to a point). Error: ${
                e}`);
        return false;
      }
      throw e;
    }
    return true;
  });
}

/**
 * Wait until the element specified by selectors is visible. Unlike the
 * normal #waitForVisible()
 * (http://webdriver.io/api/utility/waitForVisible.html) this will traverse
 * the shadow DOM.
 */
function waitForVisible(selectors) {
  browser.waitUntil(() => {
    const selected = pierceShadows(selectors);
    if (!selected.value || selected.value.length <= 0) {
      console.log(`Couldn't find element with selector ${selectors}`);
      return false;
    }
    let visible = selected.value.reduce((elem, currentValue) => {
      let eid = browser.elementIdDisplayed(selected.value[0].ELEMENT);
      return currentValue && eid.value;
    }, true);
    if (!visible) {
      console.log(`A selected element not visible (element ${
          selected.value} of selector ${selectors})`);
      return false;
    } else {
      console.log(`All selected elements are visible (element ${
          selected.value} of selector ${selectors})`);
      return true;
    }
  }, 10000, `selectors ${selectors} never selected anything`, 500);
}

function glowElement() {
  return pierceShadowsSingle(['app-shell', 'shell-ui', '[glowable]']);
}

/** Wait for the glow-throb to stop. */
function waitForStillness() {
  const element = glowElement();
  const attribute = 'glowing';

  // Currently, the dots sometimes stop & start again. We're introducing a
  // fudge factor here - the dots have to be stopped for a few consecutive
  // checks before we'll consider them really stopped.
  let matches = 0;
  const desiredMatches = 2;

  // Failures here due to 'the dancing dots can't stop won't stop' tend do
  // indicate two things:
  // - Our calculations to reach a 'stable' state may just be taking a long
  //   time. Increasing the timeout (or making the test scenario simpler) may
  //   be enough.
  // - An exception during calculation may have prevented the animation from
  //   ever stopping. Check the console (comment out headless in
  //   `wdio.conf.js` to get the browser visible; see README.md for more
  //   information) and see if there's an error.
  const noGlow = () => {
    const result = browser.elementIdAttribute(element.value.ELEMENT, attribute);
    if (null == result.value) {
      matches += 1;
    } else {
      if (matches > 0) {
        console.log(
          `demo-tests: the glow restarted. This may indicate a bug, or that global data was changed by another client.`);
      }
      matches = 0;
    }
    return matches > desiredMatches;
  };
  browser.waitUntil(noGlow, 20000, `the glow can't stop won't stop`, 500);
}

function clickElement(selector) {
  console.log(divider);
  const element = pierceShadowsSingle(['app-shell', 'shell-ui'].concat([selector]));
  if (!element) {
    console.warn(`demo-tests: couldn't find element [${selector}]`);
  } else {
    console.log(`demo-tests: clicking [${selector}]`);
    browser.elementIdClick(element.value.ELEMENT);
  }
}

function initTestWithNewArc(testTitle, useSolo) {
  // clean up extra open tabs
  const openTabs = browser.getTabIds();
  browser.switchTab(openTabs[0]);
  openTabs.slice(1).forEach(tabToClose => {
    browser.close(tabToClose);
  });
  // setup url params
  let firebaseKey = new Date().toISOString() + testTitle;
  firebaseKey = firebaseKey.replace(/\W+/g, '-').replace(/\./g, '_');
  console.log(`running test "${testTitle}" with firebaseKey "${firebaseKey}"`);
  const urlParams = [
    `testFirebaseKey=${firebaseKey}`,
    //`log`,
    'user=*selenium'
  ];
  if (useSolo) {
    urlParams.push(`solo=${browser.options.baseUrl}shell/artifacts/canonical.manifest`);
  }
  // note - baseUrl (currently specified on the command line) must end in a
  // trailing `/`, and this must not begin with a preceding `/`.
  // `browser.url()` will prefix its argument with baseUrl, and avoiding a
  // doubling `//` situation avoids some bugs.
  browser.url(`shell/apps/web/?${urlParams.join('&')}`);
  assert.equal('Arcs', browser.getTitle());

  //createNewUserIfNotLoggedIn();
  //createNewArc();

  // use a solo URL pointing to our local recipes
  //browser.url(`${browser.getUrl()}&${urlParams.join('&')}`);

  // that page load (`browser.url()`) will drop our utils, so load again.
  loadSeleniumUtils();

  // check out some basic structure relative to the app footer
  //const footerPath = getFooterPath();
  //assert.ok(pierceShadowsSingle(footerPath.slice(0, 1)).value);
  //assert.ok(pierceShadowsSingle(footerPath).value);
}

// function createNewUserIfNotLoggedIn() {
//   loadSeleniumUtils();
//   if (browser.getUrl().includes('user=')) {
//     return;
//   }
//   const newUsersNameSelectors =
//       ['app-shell', 'shell-ui', 'user-picker', '#new-users-name'];
//   waitForVisible(newUsersNameSelectors);
//   const element = pierceShadowsSingle(newUsersNameSelectors);
//   const elementId = element.value.ELEMENT;
//   // create a user 'Selenium'
//   browser.elementIdValue(elementId, ['Selenium', 'Enter']);
//   waitForStillness();
// }

/**
 * Create a new arc, switch to that tab (toggling back to the first tab to
 * reset the webdriver window state).
 */
// function createNewArc() {
//   assert.equal(1, browser.windowHandles().value.length);

//   // create a new arc, switch to that tab (toggling back to the first tab to
//   // reset the webdriver window state).
//   browser.waitForVisible('div[title="New Arc"]');
//   browser.click('div[title="New Arc"]');
//   browser.switchTab(browser.windowHandles().value[0]);
//   browser.switchTab(browser.windowHandles().value[1]);
// }

function openSystemUi() {
  clickElement('[touchBar]');
  wait(200);
}

function allSuggestions() {
  waitForStillness();
  openSystemUi();
  clickElement('input[search]');
  browser.keys('*');
  //clickElement('[search]');
  //wait(200);
  //clickElement('#searchButton');
}

function getAtLeastOneSuggestion() {
  const allSuggestions = pierceShadows(['[slotid="suggestions"]', 'suggestion-element']);
  if (!allSuggestions.value) {
    console.log('No suggestions found.');
    return false;
  }
  return allSuggestions;
}

function waitForSuggestion(substring) {
  _waitForAndMaybeAcceptSuggestion(substring, false);
}

function acceptSuggestion(substring) {
  _waitForAndMaybeAcceptSuggestion(substring, true);
}

function _waitForAndMaybeAcceptSuggestion(substring, accept) {
  console.log(divider);
  console.log(`waiting for suggestion [${substring}]`);
  waitForStillness();
  const findSuggestion = () => {
    const suggestions = getAtLeastOneSuggestion();
    try {
      const suggestion = searchElementsForText(suggestions.value, substring);
      if (!suggestion) {
        console.log(`couldn't find suggestion '${substring}'.`);
        return false;
      }
      console.log(`found suggestion "${suggestion.text}"`);
      if (accept) {
        browser.elementIdClick(suggestion.id);
      }
      return true;
    } catch (e) {
      if (e.message.includes('stale element reference')) {
        console.log(`got a not-entirely-unexpected error, but waitUntil will try again (up to a point). Error: ${e}`);
        return false;
      }
      throw e;
    }
  };
  browser.waitUntil(findSuggestion, 5000, `couldn't find suggestion ${substring}`);
  //console.log(`${accept ? 'Accepted' : 'Found'} suggestion: ${substring}`);
  if (accept) {
    console.log(`accepted suggestion: ${substring}`);
  }
  console.log(divider);
  // TODO: return the full suggestion text for further verification.
}

function particleSelectors(slotName, selectors) {
  //return [`[slotid="${slotName}"]`].concat(selectors);
  return selectors;
}

/**
 * Click in the main arcs app, in the slot with the name 'slotName', using the
 * specified selectors, filtering by the optional textQuery.
 */
function clickInParticles(slotName, selectors, textQuery) {
  waitForStillness();
  if (!selectors) {
    selectors = [];
  }
  const realSelectors = particleSelectors(slotName, selectors);
  const clickSomething = () => {
    const pierced = pierceShadows(realSelectors);
    assert.ok(pierced);
    if (!pierced.value || pierced.value.length == 0) {
      return false;
    }
    let selected;
    if (textQuery) {
      selected = searchElementsForText(pierced.value, textQuery).id;
    } else {
      if (1 == pierced.value.length) {
        selected = pierced.value[0].ELEMENT;
      } else {
        throw Error(`found multiple matches for ${realSelectors}: ${
            pierced.value}`);
      }
    }
    if (selected) {
      console.log(`click: clickInParticles`);
      browser.elementIdClick(selected);
      return true;
    } else {
      return false;
    }
  };
  browser.waitUntil(clickSomething, 5000,
    `couldn't find anything to click with selectors ${realSelectors} textQuery ${textQuery}`);
}

/**
 * Grab some data from the page, refresh the page, and validate that the data
 * hasn't changed.
 */
function testAroundRefresh() {
  const getOrCompare = expectedValues => {
    let actualValues = {};
    // Unfortunately, the title isn't consistent either. See #697.
    //const titleElem = pierceShadowsSingle(['app-shell', 'shell-ui', '#arc-title']);
    //actualValues.title = browser.elementIdText(titleElem.value.ELEMENT).value;

    // Disable verification of suggestions through a reload until #697 is
    // fixed.
    //const suggestionsElement = getAtLeastOneSuggestion();
    //actualValues.suggestions = suggestionsElement ?
    //    suggestionsElement.value.map(suggestion => {
    //      return browser.elementIdText(suggestion.ELEMENT).value;
    //    }) :
    //    [];

    // The differences in actual vs expected often isn't clear in the error
    // output; logging everything helps.
    if (expectedValues) {
      console.log('expectedValues', expectedValues);
      console.log('actualValues', actualValues);
    }
    for (let key in expectedValues) {
      console.log(`key: ${key}`);
      assert.equal(actualValues[key], expectedValues[key]);
    }

    return actualValues;
  };
  const expectedValues = getOrCompare();
  browser.refresh();
  loadSeleniumUtils();
  waitForStillness();
  getOrCompare(expectedValues);
}

describe('Arcs demos', function() {
  it('can book a restaurant', /** @this Context */ function() {
    initTestWithNewArc(this.test.fullTitle(), true);
    allSuggestions();
    acceptSuggestion('Find restaurants');
    // Our location is relative to where you are now, so this list is dynamic.
    // Rather than trying to mock this out let's just grab the first
    // restaurant.
    const restaurantSelectors = particleSelectors('root', ['#webtest-title']);
    waitForVisible(restaurantSelectors);
    waitForSuggestion('Make a reservation');
    let restaurantNodes = pierceShadows(restaurantSelectors);
    console.log(`click: restaurantSelectors`);
    browser.elementIdClick(restaurantNodes.value[0].ELEMENT);
    acceptSuggestion('Table for 2');
    acceptSuggestion('from your calendar');
    testAroundRefresh();

    // debug hint: to drop into debug mode with a REPL; also a handy way to
    // see the state at the end of the test:
    // browser.debug();

    // debug hint: if you'd like to see the browser logs (you suspect an
    // error, for instance):
    // browser.log('browser').value.forEach(log => {
    //   console.log(`${log.level}:${log.source}:${log.message}`);
    // });
  });

  it('can buy gifts', /** @this Context */ function() {
    initTestWithNewArc(this.test.fullTitle(), true);
    allSuggestions();
    acceptSuggestion(
        `Show products from your browsing context (Minecraft Book plus 2 other items) and choose from Products recommended based on products from your browsing context and Claire's wishlist (Book: How to Draw plus 2 other items)`);
    browser.waitForVisible('[slotid="action"]');
    browser.waitForVisible('[slotid="annotation"]');
    // TODO: click the 'Add' buttons to move products from recommended to shortlist and
    // (1) verify product was moved,
    // (2) verify 'action' slot is not visible after all products were moved.
    [
      'Buy gifts for Claire\'s Birthday on 2017-08-04, Estimate arrival date for products',
      'Check manufacturer information for products from your browsing context',
      'Find alternate shipping',
      `Recommendations based on Claire\'s wishlist`
      // TODO: add 'and Claire\'s wishlist' when regex is supported.
    ].forEach(suggestion => {
      wait(8000);
      openSystemUi();
      acceptSuggestion(suggestion);
    });

    // Verify each product has non empty annotation text.
    let annotations = browser.getText('[slotid="annotation"]');
    assert.equal(6, annotations.length);
    assert.ok(annotations.length > 0 && annotations.every(a => a.length > 0));
  });
});

describe('Arcs system', function() {
  it('can load with global manifests', /** @this Context */ function() {
    initTestWithNewArc(this.test.fullTitle());

    // remove solo from our URL to use the default
    //const url = new URL(browser.getUrl());
    //url.searchParams.delete('solo');
    //browser.url(url.href);

    // load our utils in the new page
    //loadSeleniumUtils();

    // () => {
    //   getAtLeastOneSuggestion();
    //   // we hit at least a single suggestion, good enough!
    //   return true;
    // },

    waitForStillness();
    browser.waitUntil(getAtLeastOneSuggestion, 5000,
        `couldn't find any suggestions; this might indicate that a global manifest failed to load`);

    // treat the fact that we found any suggestions as a good enough
    // indication that there aren't any major issues with globally available
    // manifests.
  });
});
