package arcs;

import jsinterop.annotations.JsType;
import jsinterop.annotations.JsOverlay;
import jsinterop.annotations.JsPackage;
import jsinterop.annotations.JsProperty;
import jsinterop.base.JsPropertyMap;
import jsinterop.base.Js;

/**
 * Typed models are Props and State used by the particle. This is extremely boilerplately
 * right now, and would be replaced by code-gen based on the Schema, so either protobufs,
 * or annotations. One could imagine a Java annotation processor like @AutoSchemaValue("Person.schema")
 * that constructs this.
 */
@JsType(isNative = true, name = "Object", namespace = JsPackage.GLOBAL)
public interface J2clParticleProps extends JsPropertyMap {

    @JsType(isNative = true, name = "Object", namespace = JsPackage.GLOBAL)
    public interface PersonDetails extends JsPropertyMap {
        @JsOverlay
        default String name() {
            return getAsAny("name").asString();
        }

        @JsOverlay
        default int age() {
            return getAsAny("age").asInt();
        }
    }

    @JsType(isNative = true, name = "Object", namespace = JsPackage.GLOBAL)
    public interface J2clParticleState extends PersonDetails {
        @JsOverlay
        default void setName(String name) {
            set("name", name);
        }

        @JsOverlay
        default void setAge(int age) {
            set("age", age);
        }

        @JsOverlay
        default int count() {
            return getAsAny("count").asInt();
        }

        @JsOverlay
        default void setCount(int newCount) {
            set("count", newCount);
        }

        @JsOverlay
        static J2clParticleState empty() {
            return Js.uncheckedCast(JsPropertyMap.of());
        }
    }

    @JsOverlay
    default PersonDetails person() {
        return getAsAny("person").uncheckedCast();
    }
}
