/** A function that converts some input into a boolean, often use for calls like `filter`. */
export type Predicate<T> = (input: T) => boolean;

// static methods that hang off Predicate
export namespace Predicate {
  /** A Predicate that always succeeds */
  export const alwaysTrue = <T>() => true;
  /** A Predicate that always fails */
  export const alwaysFalse = <T>() => false;
  // TODO(lindner) and(..) negate(..) or(..) etc..
}
