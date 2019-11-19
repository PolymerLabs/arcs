package arcs

/**
 * Any object implementing this interface can be converted into a (pinned) stable heap pointer.
 * To avoid GC Leaks, eventually the ABI should have a dispose() method which releases
 * these pinned pointers. Right now, the lifetime of these objects depends on the Arcs Runtime
 * holding onto particle and handle references beyond the scope of the call.
 */
interface Addressable

