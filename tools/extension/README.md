# Arcs Chrome extension

The extension does a few things:

1. Parses webpages you visit for schema.org entities, and provides that data
to Arcs.
1. Allows webpages to specify manifests that are loaded into your Arcs
instance.
1. Provides an entry point to Arcs.

The extension reads out schema.org-compatible data from web pages that are
open when you activate the extension (by opening a new tab, activating the
browser action, or manually).  When you accept suggestions that contain those
stores, they are synchronized to a **public** firebase.

Eventually, the sync will be to your private data store (perhaps firebase,
but other options will be available).

Please be aware of this limitation as you think about what sites to visit
while using this extension. A best practice until these limitations are
removed is to use this in a non-primary profile or a secondary browser.

## Installation

Load the extension as an 'unpacked extension' at
[chrome://extensions](chrome://extensions).

## Interaction

As mentioned above, Arcs consumes metadata from the browser in the background
at Arcs extensions startup and when a new page loads.

The extension is visible in two places:

* A browser action (an icon to the right of the address bar). Clicking this
  will read additional data from the current page (like the address) into the
  Arcs context and will open Arcs in a popup.
* Opening a new tab will open Arcs.

Custom actions may be visible on some pages that you visit. Try the
[index-with-arcs](https://smalls.github.io/arcs-custom-events/index-with-arcs.html)
in the [arcs-custom-events](https://github.com/smalls/arcs-custom-events)
repository.

## Embedding Manifests

Manifests can be embedded into web pages, allowing sites to extend Arcs with
additional custom functionality or data types. This is done via a link element
as in this example:

```
  <link rel="arcs-manifest" type="text/x-arcs-manifest"
          href="arcs/custom.manifest">
```

This will load the manifest as `arcs/custom.manifest` into Arcs instances that
are triggered from the browser (either via the popup or new tab).
  

## Testing

Unit tests can be run in browser by opening index.test.html or on the command
line (from arcs) with `tools/install && npm test`.

For manual testing, there are a few scenarios that should reliably work after
enabling the extension.

1. Visit a page with embedded data. [Products](https://schema.org/Product)
  such as [Google Cardboard](https://store.google.com/product/google_cardboard)
  is an easy option. Verify that:
    - The 'arc' logo appears on the Browser Action.
    - Clicking on the Browser Action includes your sample data (in my case,
      Google Cardboard) in a recipe. For a product, try the "Buy products"
      recipe. If too many things appear, go full-screen and disable any extra
      recipes.
1. Open the New Tab, and verify it has access to the information from all
  tabs. Open another product (such as [LG Watch](https://store.google.com/product/lg_watch_style)
  and verify that shows up in the arc.
1. Visit a page with an embedded manifest like
  [index-with-arcs](https://smalls.github.io/arcs-custom-events/index-with-arcs.html). Verify that the custom actions appear.

## Notes and Limitations

The extension automatically tags [Product] with #shortlist, and all other
stores with #browserContext.

## TODOs

Nothing is ever complete.

- [ ] Tags are how we differentiate between stores. Once firebase supports it,
  put additional tags on all stores created by the extension (as many as
  possible - the more information in tags, the better matches we'll be able to
  find).
- [ ] De-duplicate data - some pages embed entities multiple times, and
  reloads can cause the same information to be in the store many times. Keep
  track of what we've sent and only send new entities.
