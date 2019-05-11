package arcs;

import jsinterop.annotations.JsType;

/** 
 * This represents the native ES6 "Object" object, so we can extend it.
 * TODO: remove in factor of using Elemental2.
 */
@JsType(namespace="<window>", name = "Object", isNative = true)
public class JsObject {
}
