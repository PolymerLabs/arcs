WebShell Flags

e.g. https://polymerlabs.github.io/arcs-live/shells/web-shell/?storage=pouchdb&user=barney

Setting Storage Provider

* no flag
  * use the same storage as last time, otherwise `default`
* storage=pouchdb
  * local pouch storage, e.g. pouchdb://local/arcs
* storage=firebase
  * arcs-owned firebase instance, e.g. firebase://arcs-storage.firebaseio.com...
* storage=default
  * use the default (currently `pouchdb`)
* storage=[storage-key]
  * use `storage-key`

User

* no flag
  * use the same user as last time, otherwise `user`
* user=[user]
  * use `[user]`, created as needed

Logging

* no flag
  * set logging level to 0
* log
  * set logging level to 2
* log=[level]
  * set logging level to [level]

Log Levels

* 0 = no logging
* 1 = particles/runtime-logging only
* 2 = add shell logging
