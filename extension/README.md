# arcs chrome extension

The extension does two things:

1) Synchronizes metadata from the browser to the shared Arcs system.
1) Provides an entry point to Arcs.

The first point is worth re-emphasizing. **The extension sends metadata from
pages you visit to a public firebase.** We've limited the extent of data
shared to allow the extension to be tested while we continue working on the
platform.

## installation

Load the extension as an 'unpacked extension' at
[chrome://extensions](chrome://extensions).

## interaction

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

## testing

There are a few scenarios that should reliably work after enabling the
extension.

1) Visit a store with embedded data [Products](https://schema.org/Product)
  such as [Google Cardboard](https://store.google.com/product/google_cardboard).
  Verify that:
    - The 'arc' logo appears on the Browser Action.
    - Clicking on the Browser Action includes your sample data (in my case,
      Google Cardboard) in a recipe. For a product, try the "Buy products"
      recipe. If too many things appear, go full-screen and disable any extra
      recipes.
1) Open the New Tab, and verify it has access to the information from all
  tabs. Open another product (such as [LG Watch](https://store.google.com/product/lg_watch_style)
  and verify that shows up in the arc.
1) Visit a page with an embedded manifest like 
  [index-with-arcs](https://smalls.github.io/arcs-custom-events/index-with-arcs.html). Verify that the custom actions appear.

## notes & limitations

To restrict what's sent to firebase, most entities are stripped out in
event-page.js#filterResponse(). Notable inclusions are
[Product](https://schema.org/Product) and [Event](https://schema.org/Event),
but check the code for the authoritative list.

The extension automatically tags [Product] with #shortlist, and all other
views with #browserContext.

## todos

Nothing is ever complete.

- [ ] Views should be created in the user's profile, so they can be consumed
  in other arcs (and as they aren't meant to be shared to other users by
  default).
- [ ] When initializing the extension, pull in data from all open tabs. The
  current version depends on the extension being on from browser startup, and
  there's a hook from each tab that's opened to send over entities from that
  tab.
- [ ] Tags are how we differentiate between views. Once firebase supports it,
  put additional tags on all views created by the extension (as many as
  possible - the more information in tags, the better matches we'll be able to
  find).
- [ ] De-duplicate data - some pages embed entities multiple times, and
  reloads can cause the same information to be in the view many times. Keep
  track of what we've sent and only send new entities.
