# arcs-cdn

## Arcs Webapp

https://polymerlabs.github.io/arcs-cdn/v0.3/apps/web/

The webapp can be configured with URL parameters:

* solo=[path]
  * Uses only the manifest at [path] to bootstrap the Arc context.
* manifest=[path]
  * Uses manifest at [path] in addition to the set of manifests published in the Arcs (admin) database.
* arc=*
  * Create a new arc
* arc=[arc-firebase-key]
  * Load arc specified by [arc-firebase-key]
* user=[name]
  * Select (or create) user with [name]
* search=[search terms]
  * Preload the search box with [search terms]
* root=[path]
  * Override the root path used to locate CDN resources (advanced).

Example:

https://polymerlabs.github.io/arcs-cdn/v0.3/apps/web/?solo=local.manifest
