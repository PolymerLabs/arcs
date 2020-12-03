# Planning in the Shell

By default plans are produced and consumed locally in the browser.
When using [arcs-live](https://live.arcs.dev/shells/web-shell/) default suggestions storage is `volatile`.

## URL params
Suggestions storage can be controlled by **plannerStorage** url param.

* Navigate to the Arcs page and use **volatile** storage for suggestion:
https://live.arcs.dev/shells/web-shell/?plannerStorage=volatile

* Navigate to the Arcs page and use **PouchDb** storage for suggestion:
https://live.arcs.dev/shells/web-shell?plannerStorage=pouchdb://local/random-db-name
The suggestion values will be found in Chrome's inspector, under Application > Storage > Local Storage.

Arcs storage can be controlled by **storage** url param.
* Navigate to the Arcs page and use **PouchDb** storage for both - arcs and suggestions:
https://localhost:8080/shells/web-shell?storage=pouchdb://localhost:8080/user/&plannerStorage=pouchdb://localhost:8080/user/


To populate Arcs Extension strategy explorer, add the **plannerDebug** url param:
https://live.arcs.dev/shells/web-shell/?plannerDebug

# Remote Planning
To consume plans produced on the server, disable shell planning with an **plannerOnlyConsumer** url param, ie:
https://live.arcs.dev/shells/web-shell/?plannerOnlyConsumer=true

## Firebase
To run planning on the server use the following command:
```
/shells/planner-shell $ serve.sh
```

Or with DevTools:
```
/shells/planner-shell $ serve.sh --explore
```
Access DevTools for remote planner at: http://localhost:8080/devools/.


or debug with:
```
/shells/planner-shell $ debug.sh
```

The remote planning is performed per user for all their arcs.
The default user is **planner** (currently to override, set environment variable or update code [link](https://github.com/PolymerLabs/arcs/blob/master/shells/planner-shell/index.js#L23)).

## PouchDB
To test remote planning with Pouch you will need to run a Pouch Server instance by following these steps:

1. Build the server by executing:
```
/server $ npm run server
```
2. Start the server on port 8080 by running
```
/server $ env {args} npm run server:start
```
Optionally prefix your command with the following optional environment arguments:
```
DEBUG=true
ARCS_USER_ID=xxxxx
STORAGE_KEY_BASE  (default is pouchdb://localhost:8080/user/)
```

More information on how to bring up a Pouch server on a Personal Cloud Server: [gh/cloud/REAMDE.md](https://github.com/PolymerLabs/arcs/blob/master/cloud/README.md)


# Storage info
## Firebase
To browse at Arcs data, go to firebase console.

The default storage key is:
https://firebase.corp.google.com/u/0/project/arcs-storage/database/arcs-storage/data/0_6_0/
In Firebase the arcs are serialized at:
`/0_6_0/userid--arckey`
for example:
`/0_6_0/maria--LT0GE_Jn6C-uGHHiWA7`

Suggestions are serialized at: `/0_6_0/userid/suggestions/arckey`
for example:
`/0_6_0/maria/suggestions/LT0GE_Jn6C-uGHHiWA7`

Search is serialized at: `/0_6_0/userid/search/`
for example: `/0_6_0/maria/search`

## PouchDB
Pouch DB uses similar key base structure.

For local mode you can find the contents of the PouchDB data in the 'Application' tab of the Web Inspector. Look in IndexedDB for an entry that matches the name of the Pouch Database (by default 'user').

TODO: add sample keys here.

