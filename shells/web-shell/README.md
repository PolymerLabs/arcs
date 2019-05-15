# web-shell Flags

e.g. https://live.arcs.dev/shells/web-shell/?log&storage=$firebase/scott

## Setting User-Persona/Storage-Key

### Today, the User-Persona is identified exactly by a Storage-Key: you are where your stuff is.

* persona=[storage-key]
  * use `storage-key`

#### To create a custom User-Persona for one of the existing servers, macros are provided:

* persona=$firebase/[name]
  * appends [name] to the arcs-owned firebase instance key, e.g. firebase://arcs-storage.firebaseio.com.../[name]
* persona=$pouchdb/[name]
  * appends [name] to the default pouchdb key, e.g. pouchdb://local/arcs/[name]

#### other options:

* no flag
  * use the same storage as last time, otherwise `default`
* persona=pouchdb
  * local pouch storage, e.g. pouchdb://local/arcs
* persona=firebase
  * arcs-owned firebase instance, e.g. firebase://arcs-storage.firebaseio.com...
* persona=default
  * use the default (currently `pouchdb`)

#### Aliases

* storage=...
  * For backward compatibility, you can use `storage` in place of `persona`.

## Logging

* no flag
  * set logging level to 0
* log
  * set logging level to 2
* log=[level]
  * set logging level to [level]

#### Log Levels

* 0 = no logging
* 1 = particles/runtime-logging only
* 2 = add shell logging
