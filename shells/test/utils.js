/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

exports.shellUrl = `shells/web-shell`;

exports.keys = function(selector, keys, timeout) {
  browser.$(selector).click();
  browser.keys(keys);
};

/**
 * Start a new arc in the webdriver environment.  Performs the following
 * steps:
 * - Calculates a persona based on the storgeType
 * - Opens a new window to the web shell
 * - Exposes system ui
 * - Waits for animations
 * - Clicks on the search box.
 *
 * @param testTitle Displayed in logs
 * @param storage the storage type to test firebase, firebasetest, pouchdb.
 */
exports.openNewArc = function(testTitle, storageType) {
  const user = 'selenium-' + Date.now();  // unique enough for now.

  console.log(`running test "${testTitle}" [${storageType}]`);
  const urlParams = [
    `log`,
    `plannerStorage=volatile`,
    `persona=$${storageType}/${user}`
  ];

  // note - baseUrl (currently specified on the command line) must end in a
  // trailing `/`, and this must not begin with a preceding `/`.
  // `browser.url()` will prefix its argument with baseUrl, and avoiding a
  // doubling `//` situation avoids some bugs.
  browser.url(`${exports.shellUrl}/?${urlParams.join('&')}`);

  // Move to the touchbar div to expose the system UI
  $('web-shell-ui').shadow$('system-ui').shadow$('div[touchbar]').moveTo();

  // Wait for Animations to complete
  $('web-shell-ui').shadow$('system-ui').shadow$('div[state=over]').waitForDisplayed();

  // Wait for the Search box to display, then click on it.
  $('web-shell-ui').shadow$('system-ui').shadow$('panel-ui').shadow$('input[search]').waitForDisplayed();
  $('web-shell-ui').shadow$('system-ui').shadow$('panel-ui').shadow$('input[search]').click();
  browser.pause(100);
};

/**
 * Wait for a suggestion and clicks on it.
 *
 * Executes the following steps:
 * - Waits for a suggestion containing the text to be displayed.
 * - Clicks the suggestion.
 *
 * @param titleMatch matching text to look for.
 */
exports.clickSuggestion = (titleMatch) => {

  console.log('Looking for suggestion containing ' + titleMatch);
  const suggestion = $(`suggestion-element[title*="${titleMatch}"]`);
  suggestion.waitForDisplayed();

  console.warn('Found suggestion ' + suggestion.getText());
  browser.pause(1000);
  suggestion.click();
};
