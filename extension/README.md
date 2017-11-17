# Arcs Chrome extension

The extension does two things:

1. Synchronizes metadata from the browser to your Arc.
1. Provides an entry point to Arcs.

Currently (and temporarily) synchronization happens via a **public** firebase.
Eventually the sync will be to a private data store (perhaps firebase, perhaps
not).

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

## Testing

Unit tests can be run in browser by opening index.test.html or on the command
line with `npm install && npm test`.

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

To restrict what's sent to firebase, most entities are stripped out in
event-page.js#filterResponse(). Notable inclusions are
[Product](https://schema.org/Product) and [Event](https://schema.org/Event),
but check the code for the authoritative list.

The extension automatically tags [Product] with #shortlist, and all other
views with #browserContext.

## TODOs

Nothing is ever complete.

- [ ] Tags are how we differentiate between views. Once firebase supports it,
  put additional tags on all views created by the extension (as many as
  possible - the more information in tags, the better matches we'll be able to
  find).
- [ ] De-duplicate data - some pages embed entities multiple times, and
  reloads can cause the same information to be in the view many times. Keep
  track of what we've sent and only send new entities.
