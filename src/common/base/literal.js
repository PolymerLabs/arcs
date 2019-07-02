/**
 * The base type for Literals, i.e. objects that have been serialized into JSON.
 *
 * ## Note
 * `JSON.parse(...)` returns an `any` type. Our definition for literal types is stricter: we demand that values are at
 * least objects (they cannot be `null`, `undefined`, or primitive types).
 */
export interface Literal {
}

/**
 * An interface for types that can be converted to and from a `Literal` type.
 *
 * @param T the origin type
 * @param Lit a Literal type, akin to JSON.
 */
export interface Literalizable<T, Lit extends Literal> {

  /** Convert the current instance into a Literal */
  prototype: {
    toLiteral(): Lit;
  };

  /** @return the original type from a Literal, statically */
  fromLiteral(literal: Lit): T;
}
