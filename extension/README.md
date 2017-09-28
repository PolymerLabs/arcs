# arcs chrome extension

The extension does two things:

1) Synchronizes metadata from the browser to the shared Arcs system.
1) Provides an entry point to Arcs.

The first point is worth re-emphasizing. **The extension sends metadata from
pages you visit to a public firebase.** We've limited the extent of data
shared (only Product and Event entities are sent).

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

## notes & limitations

To restrict what's sent to firebase, only entities of
[Product](https://schema.org/Product) and [Event](https://schema.org/Event)
are synced to the global storage.

The extension automatically tags [Product] with #wishlist.
