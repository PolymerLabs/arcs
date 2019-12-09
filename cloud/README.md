# Arcs Cloud Server

## NOTE

As of the time of writing (Nov 4, 2019) code in this directory is in
need of review and updating. Things known to be broken:

* Use of `rollup` to build and reference Arcs Runtime dependencies
* Use of Docker to build images and hook in to cloud build

All example usage and notes below are subject to this notice and are
likely to require edits or other rework to be functional.

## Basic Usage

Execute the following commands to start the Arcs cloud server

```
npm --prefix=.. run server
npm --prefix=.. run server:start
```

Then activate the usage of the pouchdb server by opening

  http://localhost:8080/shells/web-shell?storage=pouchdb://localhost:8080/user

## Server Layout / Configuration

By default the server runs on port 8080.  You can override this by passing in the base port like this:

```
  npm start -- 8000
```

The server exposes a `/db` endpoint mapped to an in-memory pouchdb instance.  A basic `index.html`
page is provided with links to various functionality.

## Environment Variables

The following environment variables can be used to customize the server behavior.

- `TARGET_DISK` if present enables storage of data on disk.
- `ARCS_USER_ID` is the Profile Arc for a specific user to do cloud planning for.
- `STORAGE_KEY_BASE` specifies where to store generated cloud planning data.  Default is  `pouchdb://localhost:8080/user`

Here's an example of using environment variables:

```
  env TARGET_DISK=/var/arcs/db ARCS_USER_ID=-LMtek9LSN6eSMg97nXV STORAGE_KEY_BASE=https://dev.example.com:8080/user npm start
```


## Development

### Basics

You will find the node source and tests in the `src` and `test`
directories.  The following are common commands that you will want to use:

- `npm run build` builds code, runs tests and then lints.
- `npm test` builds code, runs tests and then lints.
- `npm run lint` just lints.
- `npm run lint:fix` lints and fixes.
- `npm run watch` starts a server and runs test as you make changes.

For many of these commands you can pass optional arguments.  For
example you can also pass the `--fix` argument to lint by executing
the following command

```
  npm run lint -- --fix
```

### Debugging

Use the `DEBUG` environment variable to add more debugging output.
Use `*` for all messages or a substring that matches the messages you
want to see.

```
   DEBUG=* npm start
 ```

