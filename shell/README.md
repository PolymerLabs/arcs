# `shell` contains Arcs front-ends

## Links to `arcs-live` front-ends

### Web

https://polymerlabs.github.io/arcs-live/shell/apps/web/

### VR

https://polymerlabs.github.io/arcs-live/shell/apps/vr/

### ChromeCast

https://polymerlabs.github.io/arcs-live/shell/apps/chromecast/

## Utility applications

### User Context Browser (useful in particular for extracting user ids)

https://polymerlabs.github.io/arcs-live/shell/apps/utils/FBGraph/

## Notes

### URL Parameters

* `user=<userid>`
  * Force a particular user.
  * Most recent user is persisted in _localStorage_
  * Shell will remove this parameter from the URL after setting the user
    (so one can share a URL without forcing a user).
* `solo=<url>`
  * Use the manifest at `url` to supply recipes instead of the default set.
* `serial[=true]`
  * Use serializations to load Arcs, instead of step playback.
* `log[=<0, 1, 2...>]`
  * Set the shell's logging level. Default is 0 (off).
* `arc=<key>`
  * Load the arc stored at `key`
* `search=<search terms>`
  * Preload `search terms` as the Suggestion search.

