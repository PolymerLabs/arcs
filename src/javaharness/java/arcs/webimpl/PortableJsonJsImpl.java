package arcs.webimpl;

import arcs.api.PortableJson;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.function.Consumer;
import java.util.stream.Collectors;
import jsinterop.base.Any;
import jsinterop.annotations.JsFunction;
import jsinterop.annotations.JsMethod;

public class PortableJsonJsImpl implements PortableJson {
    private Any jsonObj;

    public PortableJsonJsImpl(Any jsonObj) {
        this.jsonObj = jsonObj;
    }

    @Override
    public String getString(int index) {
        return jsonObj.asArray()[index].asString();
    }

    @Override
    public int getInt(int index) {
        return jsonObj.asArray()[index].asInt();

    }

    @Override
    public double getNumber(int index) {
        return jsonObj.asArray()[index].asDouble();
    }

    @Override
    public boolean getBool(int index) {
        return jsonObj.asArray()[index].asBoolean();
    }

    @Override
    public PortableJson getObject(int index) {
        return new PortableJsonJsImpl(jsonObj.asArray()[index]);
    }

    @Override
    public int getLength() {
        return jsonObj.asArray().length;
    }

    @Override
    public String getString(String key) {
        return jsonObj.asPropertyMap().getAsAny(key).asString();
    }

    @Override
    public int getInt(String key) {
        return jsonObj.asPropertyMap().getAsAny(key).asInt();
    }

    @Override
    public double getNumber(String key) {
        return jsonObj.asPropertyMap().getAsAny(key).asDouble();
    }

    @Override
    public boolean getBool(String key) {
        return jsonObj.asPropertyMap().getAsAny(key).asBoolean();
    }

    @Override
    public PortableJson getObject(String key) {
        return new PortableJsonJsImpl(jsonObj.asPropertyMap().getAsAny(key));
    }

    @Override
    public boolean hasKey(String key) {
        return jsonObj.asPropertyMap().has(key);
    }

    @Override
    public void forEach(Consumer<String> callback) {
        jsonObj.asPropertyMap().forEach(str -> callback.accept(str));
    }

    @Override
    public List<String> keys() {
        Set<String> keys = new HashSet<String>();
        forEach(key -> keys.add(key));
        return new ArrayList<String>(keys);
    }

    @Override
    public List<String> asStringArray() {
        List<String> list = new ArrayList<>();
        forEach(i -> list.add(getString(i)));
        return list;
    }

    @Override
    public List<PortableJson> asObjectArray() {
        List<PortableJson> list = new ArrayList<>();
        for (int i = 0; i < getLength(); ++i) {
            list.add(getObject(i));
        }
        return list;
    }

    @JsMethod(namespace="<window>", name="eval")
    private native static Object eval(String js);

    @JsFunction
    interface Equator {
        boolean equals(Object obj, Object other);
    }

    private boolean isEqual(PortableJsonJsImpl other) {
        Equator equator = (Equator) eval("(obj, other) => { let compare = (o1, o2) => { return Object.keys(o1).length == Object.keys(o2).length && Object.keys(o1).every(key => (!!o1[key] == !!o2[key]) || ((o1[key] instanceof Object) && (o2[key] instanceof Object) && compare(o1[key]), o2[key])); }; return compare(obj, other); }");
        return equator.equals(jsonObj, other.jsonObj);
    }

    @Override
    public boolean equals(Object other) {
        return other instanceof PortableJsonJsImpl && isEqual((PortableJsonJsImpl) other);
    }

    @Override
    public int hashCode() {
        throw new AssertionError("TODO: implement hashCode for PortableJsonJsImpl.");
    }

    @Override
    public PortableJson put(String key, int num) {
        jsonObj.asPropertyMap().set(key, num);
        return this;
    }

    @Override
    public PortableJson put(String key, double num) {
        jsonObj.asPropertyMap().set(key, num);
        return this;
    }

    @Override
    public PortableJson put(String key, String value) {
        jsonObj.asPropertyMap().set(key, value);
        return this;
    }

    @Override
    public PortableJson put(String key, boolean bool) {
        jsonObj.asPropertyMap().set(key, bool);
        return this;
    }

    @Override
    public PortableJson put(String key, PortableJson obj) {
        jsonObj.asPropertyMap().set(key, ((PortableJsonJsImpl) obj).getRawObj());
        return this;
    }

    @Override
    public PortableJson put(int index, int num) {
        jsonObj.asArrayLike().setAt(index, num);
        return this;
    }

    @Override
    public PortableJson put(int index, double num) {
        jsonObj.asArrayLike().setAt(index, num);
        return this;
    }

    @Override
    public PortableJson put(int index, String value) {
        jsonObj.asArrayLike().setAt(index, value);
        return this;
    }

    @Override
    public PortableJson put(int index, boolean bool) {
        jsonObj.asArrayLike().setAt(index, bool);
        return this;
    }

    @Override
    public PortableJson put(int index, PortableJson obj) {
        jsonObj.asArrayLike().setAt(index, ((PortableJsonJsImpl) obj).getRawObj());
        return this;
    }

    Any getRawObj() {
        return jsonObj;
    }
}
