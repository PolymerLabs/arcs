# Developer Shell

A harness for directly executing arcs. It provides a number of in-browser "files": a single
manifest and multiple particle files. On-disk files can be used via imports in the manifest:

- Relative to the arcs serving root:
  - `import 'https://$arcs/SomeTopLevel.recipe'`

- Relative to the `particles` directory:
  - `import 'https://$particles/Tutorial/3_JsonStore/JsonStore.recipe'`

Every recipe found will be executed in a separate arc. Repeated executions are independent.
Changes to any of the input files (in-browser or on disk) will be picked up on each execution.

The serialization for an arc can be displayed by clicking on the small arrow below the output panel.

Pressing `ctrl-enter` in any file panel is a shortcut for clicking `execute`.

The in-browser files can be exported as a combined text file (saving as multiple files is usually
blocked by the browser, and I would prefer not to add a client-side dependency on zip or tar).
