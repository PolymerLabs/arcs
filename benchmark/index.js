#!/usr/bin/env node --require esm --require source-map-support/register
import commander from 'commander';
import puppeteer from 'puppeteer';

commander
  .version('1.0.0')
  .description('Arcs Benchmark Tool')
  .option('-u --url [url]', 'Base URL to benchmark', 'http://localhost:8786/shells/web-shell/index.html?storage=pouchdb://local/user')
  .option('-d --debug', 'Use to debug runs, opens browser and dumps console', false)
  .option('-t --tracing', 'Enables tracing', false);

commander.parse(process.argv);

const args = process.argv.slice(2);
let page;

(async () => {
  try {
    /** The URL where Arcs is running */
    const arcsUrl = commander.url;
    /** The origin of the url, used for security and permissions */
    const arcsOrigin = new URL(arcsUrl).origin;
    
    const launchOptions = {};
    if (commander.debug) {
      launchOptions.headless = false;
    }
    const browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    // Deal with the location prompt by pre-accepting it.
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(arcsOrigin, ['geolocation']);
    
    if (commander.debug) {
      page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    }

    if (commander.tracing) {
      await page.tracing.start({path: 'trace.json'});
    }

    await page.goto(arcsUrl, {waitUntil: 'networkidle2'});

    
    console.log('► FINDING THE SEARCH INPUT BOX');
    // use copy-js-path in devtools to get these
    // see https://github.com/GoogleChrome/puppeteer/issues/858
    const searchBox = `document.querySelector('body > web-shell').shadowRoot.querySelector('web-shell-ui').shadowRoot.querySelector('system-ui').shadowRoot.querySelector('div > div:nth-child(2) > panel-ui').shadowRoot.querySelector('div:nth-child(2) > div:nth-child(1) > input')`;

    const searchInput = await page.evaluateHandle(searchBox);


    console.log('► GETTING THE SIZE OF THE INPUT BOX, MOVING MOUSE AND FOCUS INPUT');
    // Get the size of the input box and move the mouse there and focus
    const {x, y} = await searchInput.boundingBox();
    page.mouse.move(0, 0);
    page.mouse.move(x, y);
    page.mouse.click(x, y);
    await searchInput.focus();


    console.log('► SEARCHING FOR RESTAURANTS');
    await searchInput.type('Restaurants', {delay: 200});

    console.log('► WAITING FOR FIRST SUGGESTION');
    // TODO(lindner): can probably find this from the suggestion-element title
    const firstSuggestion = `document.querySelector('body > web-shell').shadowRoot.querySelector('web-shell-ui > div > div > suggestion-element')`;

    const slotResult = await page.waitForFunction(firstSuggestion);

    console.log('► CLICKING ON RESTAURANT SUGGESTION, WAITING FOR RESULTS');
    await slotResult.tap();


    const firstRestaurant = `document.querySelector('body > web-shell').shadowRoot.querySelector('#arc').shadowRoot.querySelector('div:nth-child(3) > div:nth-child(2)').shadowRoot.querySelector('div:nth-child(5) > div:nth-child(1)')`;

    const firstRestaurantResult = await page.waitForFunction(firstRestaurant);

    // TODO Scroll result list

    console.log('► FOUND RESTAURANT, CLICKING ON FIRST RESULT');
    await firstRestaurantResult.tap();

    // TODO Click on one-up Close box
    // TODO reload entire page?
    // TODO Reopen Search Box and move to another demo

    await page.waitFor(30000);
    
    if (commander.debug) {
      await page.waitFor(12000);
    }
    if (commander.tracing) {
      await page.tracing.stop();
    }
    await browser.close();
  } catch (err) {
    console.error(err);
  } finally {
    console.log('DONE');
  }
})();
