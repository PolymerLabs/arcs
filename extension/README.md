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

## notes & limitations

To restrict what's sent to firebase, most entities are stripped out in
event-page.js#filterResponse(). Notable inclusions are (but not limited to)
[Product](https://schema.org/Product) and [Event](https://schema.org/Event).

The extension automatically tags [Product] with #shortlist.
