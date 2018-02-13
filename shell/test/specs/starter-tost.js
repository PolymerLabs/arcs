/*
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const assert = require('assert');
const { URL } = require('url');

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
  browser.waitUntil(
    () => {
      msWaited += msIncrement;
      return msWaited > msToWait;
    },
    10000,
    `we should have exited after a few iterations`,
    msIncrement
  );
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
    const found = currentValue.text.toLowerCase().includes(textQuery.toLowerCase()) ? currentValue : null;
    if (accumulator && found) {
      throw Error(`found two matches ${accumulator}, ${found}`);
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
  browser.waitForVisible('<app-main>');
  browser.waitForVisible('<footer>');

  var result = browser.execute(function(baseUrl) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `${baseUrl}/test/selenium-utils.js`;
    document.getElementsByTagName('head')[0].appendChild(script);
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
          `spin-waiting for pierceShadows to load; the error indicates it's not yet loaded so waitUntil will try again (up to a point). Error: ${e}`
        );
        return false;
      }
      throw e;
    }
    return true;
  });
}

/** Wait until the element specified by selectors is visible. Unlike the
 * normal #waitForVisible()
 * (http://webdriver.io/api/utility/waitForVisible.html) this will traverse
 * the shadow DOM. */
function waitForVisible(selectors) {
  browser.waitUntil(
    () => {
      const selected = pierceShadows(selectors);
      return selected.value && selected.value.length > 0;
    },
    2500,
    `selectors ${selectors} never selected anything`,
    500
  );
}

function dancingDotsElement() {
  return pierceShadowsSingle([
    'arc-footer',
    'x-toast[app-footer]',
    'dancing-dots'
  ]);
}

/** Wait for the dancing dots to stop. */
function waitForStillness() {
  var element = dancingDotsElement();

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
  browser.waitUntil(
    () => {
      var result = browser.elementIdAttribute(element.value.ELEMENT, 'animate');
      if (null == result.value) {
        matches += 1;
      } else {
        if (matches > 0) {
          console.log(
            `The dots restarted their dance. This may indicate a bug, or that global data was changed by another client.`
          );
        }
        matches = 0;
      }
      return matches > desiredMatches;
    },
    20000,
    `the dancing dots can't stop won't stop`,
    500
  );
}

/**
 * The suggestions drawer animates open & closing.
 * Add additional logic to deal with this. */
function openSuggestionDrawer() {
  const _isSuggestionsDrawerOpen = () => {
    const footer = pierceShadowsSingle(getFooterPath());
    const isOpen = browser.elementIdAttribute(footer.value.ELEMENT, 'open');
    return isOpen.value;
  };

  const suggestionsOpen = _isSuggestionsDrawerOpen();
  if (!suggestionsOpen) {
    const dancingDots = dancingDotsElement();
    console.log(`click: suggestions drawer closed`);
    browser.elementIdClick(dancingDots.value.ELEMENT);

    // registering the 'open' state may take a little bit
    browser.waitUntil(
      _isSuggestionsDrawerOpen,
      1000,
      `the suggestions drawer isn't registering with state 'open' after a click`,
      100
    );

    // after the 'open' state, wait a beat for the animation to finish. This
    // should only be 80ms but in practice we need a bit more.
    wait(200);

    if (!_isSuggestionsDrawerOpen()) {
      console.log('suggestions drawer not opening?');
      throw Error(`suggestions drawer never opened even after a click`);
    }
  }
}

function getFooterPath() {
  return ['arc-footer', 'x-toast[app-footer]'];
}

function initTestWithNewArc() {
  // clean up extra open tabs
  const openTabs = browser.getTabIds();
  browser.switchTab(openTabs[0]);
  openTabs.slice(1).forEach(tabToClose => {
    browser.close(tabToClose);
  });

  // TODO(smalls) should we create a user on the fly?
  // note - baseUrl (currently specified on the command line) must end in a
  // trailing '/', and this must not begin with a preceding '/'.
  browser.url(`apps/web/?user=-L-YGQo_7f3izwPg6RBn`);

  assert.equal('Arcs', browser.getTitle());

  // create a new arc, switch to that tab (toggling back to the first tab to
  // reset the webdriver window state).
  createNewArc();

  // use a solo URL pointing to our local recipes
  browser.url(
    `${browser.getUrl()}&solo=${
      browser.options.baseUrl
    }artifacts/canonical.manifest`
  );
  loadSeleniumUtils();

  // check out some basic structure relative to the app footer
  const footerPath = getFooterPath();
  assert.ok(pierceShadowsSingle(footerPath.slice(0, 1)).value);
  assert.ok(pierceShadowsSingle(footerPath).value);
}

function createNewArc() {
  assert.equal(1, browser.windowHandles().value.length);

  // create a new arc, switch to that tab (toggling back to the first tab to
  // reset the webdriver window state).
  browser.waitForVisible('div[title="New Arc"]');
  browser.click('div[title="New Arc"]');
  browser.switchTab(browser.windowHandles().value[0]);
  browser.switchTab(browser.windowHandles().value[1]);
}

function allSuggestions() {
  waitForStillness();
  openSuggestionDrawer();

  const magnifier = pierceShadowsSingle(
    getFooterPath().concat(['div[search]', 'i#search-button'])
  );
  console.log(`click: allSuggestions`);
  browser.elementIdClick(magnifier.value.ELEMENT);
}

function getAtLeastOneSuggestion() {
  const allSuggestions = pierceShadows([
    'div[slotid="suggestions"]',
    'suggestion-element'
  ]);
  if (!allSuggestions.value || 0 == allSuggestions.value) {
    console.log('No suggestions found.');
    return false;
  }
  return allSuggestions;
}

function waitForSuggestion(textSubstring) {
  _waitForAndMaybeAcceptSuggestion(textSubstring, false);
}

function acceptSuggestion(textSubstring) {
  _waitForAndMaybeAcceptSuggestion(textSubstring, true);
}

function _waitForAndMaybeAcceptSuggestion(textSubstring, accept) {
  console.log(`Waiting for: ${textSubstring}`);
  waitForStillness();
  openSuggestionDrawer();
  let footerPath = getFooterPath();

  browser.waitUntil(
    () => {
      const allSuggestions = getAtLeastOneSuggestion();
      try {
        const desiredSuggestion = searchElementsForText(
          allSuggestions.value,
          textSubstring
        );
        if (!desiredSuggestion) {
          console.log(`Couldn't find suggestion '${textSubstring}'.`);
          return false;
        }

        console.log(`found: desiredSuggestion "${desiredSuggestion}"`);
        if (accept) browser.elementIdClick(desiredSuggestion.id);
        return true;
      } catch (e) {
        if (e.message.includes('stale element reference')) {
          console.log(
            `got a not-entirely-unexpected error, but waitUntil will try again (up to a point). Error: ${e}`
          );
          return false;
        }

        throw e;
      }
    },
    5000,
    `couldn't find suggestion ${textSubstring}`
  );
  // TODO: return the full suggestion text for further verification.
  console.log(`${accept ? 'Accepted' : 'Found'} suggestion: ${textSubstring}`);
}

function particleSelectors(slotName, selectors) {
  return ['arc-host', `div[slotid="${slotName}"]`].concat(selectors);
}

/**
 * Click in the main arcs app, in the slot with the name 'slotName', using the
 * specified selectors, filtering by the optional textQuery.
 */
function clickInParticles(slotName, selectors, textQuery) {
  waitForStillness();

  if (!selectors) selectors = [];
  const realSelectors = particleSelectors(slotName, selectors);

  browser.waitUntil(
    () => {
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
          throw Error(
            `found multiple matches for ${realSelectors}: ${pierced.value}`
          );
        }
      }

      if (selected) {
        console.log(`click: clickInParticles`);
        browser.elementIdClick(selected);
        return true;
      } else {
        return false;
      }
    },
    5000,
    `couldn't find anything to click with selectors ${realSelectors} textQuery ${textQuery}`
  );
}

describe('test Arcs demo flows', function() {
  it('can use the restaurant demo flow', function() {
    initTestWithNewArc();

    allSuggestions();

    acceptSuggestion('Find restaurants');

    // Our location is relative to where you are now, so this list is dynamic.
    // Rather than trying to mock this out let's just grab the first
    // restaurant.
    const restaurantSelectors = particleSelectors('root', [
      'div.item',
      'div.title'
    ]);
    waitForVisible(restaurantSelectors);
    waitForSuggestion('Make a reservation');
    let restaurantNodes = pierceShadows(restaurantSelectors);
    console.log(`click: restaurantSelectors`);
    browser.elementIdClick(restaurantNodes.value[0].ELEMENT);

    acceptSuggestion('Table for 2');
    acceptSuggestion('from your calendar');

    // debug hint: to drop into debug mode with a REPL; also a handy way to
    // see the state at the end of the test:
    // browser.debug();

    // debug hint: if you'd like to see the browser logs (you suspect an
    // error, for instance):
    // browser.log('browser').value.forEach(log => {
    //   console.log(`${log.level}:${log.source}:${log.message}`);
    // });
  });

  it('can use the gift shopping demo flow', function() {
    initTestWithNewArc();

    allSuggestions();

    acceptSuggestion(
      `Show products from your browsing context (Minecraft Book plus 2 other items) and choose from Products recommended based on products from your browsing context and Claire's wishlist (Book: How to Draw plus 2 other items)`
    );

    browser.waitForVisible('div[slotid="action"]');
    browser.waitForVisible('div[slotid="annotation"]');

    // TODO: click the 'Add' buttons to move products from recommended to shortlist and
    // (1) verify product was moved,
    // (2) verify 'action' slot is not visible after all products were moved.

    acceptSuggestion(
      'Buy gifts for Claire, estimate arrival date for Products'
    );
    acceptSuggestion(
      'Check manufacturer information for products from your browsing context'
    );
    acceptSuggestion(
      'Recommendations based on Products recommended based on products from your browsing context'
      // TODO: add 'and Claire\'s wishlist' when regex is supported.
    );

    // Verify each product has non empty annotation text.
    let annotations = browser.getText('div[slotid="annotation"]');
    assert.equal(6, annotations.length);
    assert.ok(annotations.length > 0 && annotations.every(a => a.length > 0));
  });

  it('can use an arc with the default global manifests', function() {
    initTestWithNewArc();

    // remove solo from our URL to use the default
    const url = new URL(browser.getUrl());
    url.searchParams.delete('solo');
    browser.url(url.href);

    // load our utils in the new page
    loadSeleniumUtils();

    waitForStillness();
    browser.waitUntil(
      () => {
        getAtLeastOneSuggestion();

        // we hit at least a single suggestion, good enough!
        return true;
      },
      5000,
      `couldn't find any suggestions; this might indicate that a global manifest failed to load`
    );

    // treat the fact that we found any suggestions as a good enough
    // indication that there aren't any major issues with globally available
    // manifests.
  });
});
