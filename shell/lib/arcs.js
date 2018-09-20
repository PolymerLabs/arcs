//
// TODO(sjmiles): either export actual Arcs or an Object that will be populated later
//
// I tried to use dynamic imports to differentiate between the built and source (debug) versions of runtime,
// but the webpack built artifact is not itself a module that can `export`. Fallback position is to use
// the global, but the load timing is different.
//
if (!window.Arcs) {
  window.Arcs = {};
}
export default window.Arcs;

