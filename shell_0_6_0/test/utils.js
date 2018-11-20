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
exports.defaultTimeout = exports.seconds(15);

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

exports.whenExists = async function(selector, timeout) {
  let resolve;
  let reject;
  const result = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  let fail = false;
  setTimeout(() => fail = true, timeout || exports.defaultTimeout);
  const tryQuery = () => setTimeout(async () => {
    if (fail) {
      //console.log(`rejecting "${selector}"`);
      reject(new Error(`timedout waiting for "${selector}"`));
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
  return clickJson(await exports.whenExists(selector, timeout));
};

exports.keys = async function(selector, keys, timeout) {
  await exports.click(selector, timeout);
  await browser.keys(keys);
};

exports.openNewArc = async function(testTitle, useSolo) {
  // clean up extra open tabs
  const openTabs = browser.getTabIds();
  browser.switchTab(openTabs[0]);
  openTabs.slice(1).forEach(tabToClose => {
    browser.close(tabToClose);
  });
  // setup url params
  //let firebaseKey = new Date().toISOString() + testTitle;
  //firebaseKey = firebaseKey.replace(/\W+/g, '-').replace(/\./g, '_');
  //console.log(`running test "${testTitle}" with firebaseKey "${firebaseKey}"`);
  const urlParams = [
    //`testFirebaseKey=${firebaseKey}`,
    `log`,
    'user=selenium'
  ];
  //if (useSolo) {
  //  urlParams.push(`solo=${browser.options.baseUrl}/artifacts/canonical.manifest`);
  //}
  // note - baseUrl (currently specified on the command line) must end in a
  // trailing `/`, and this must not begin with a preceding `/`.
  // `browser.url()` will prefix its argument with baseUrl, and avoiding a
  // doubling `//` situation avoids some bugs.
  browser.url(`shell_0_6_0/web-shell/?${urlParams.join('&')}`);
  //await browser.pause(2000);
};
