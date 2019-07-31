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
import jsinterop.base.Js;
import jsinterop.annotations.JsMethod;
import jsinterop.annotations.JsFunction;

public class PortableJsonJsImpl implements PortableJson {
    private Any jsonObj;

    @JsMethod(namespace="<window>", name="eval")
    private native static Object eval(String js);

    @JsFunction
    interface Getter {
      Object get(Object obj, String key);
    }

    @JsFunction
    interface HasChecker {
        boolean has(Object obj, String key);
    }

    @JsFunction
    interface Setter {
      void set(Object obj, String key, Any value);
    }

    @JsFunction
    interface Keys {
        String[] get(Object obj);
    }

    private <T> T getValue(String key) {
      Getter getter = (Getter) eval("(obj, key) => { return obj[key]; }");
      return Js.uncheckedCast(getter.get(jsonObj, key));
    }

    private boolean hasStringKey(String key) {
      HasChecker hasChecker = (HasChecker) eval("(obj, key) => { return key in obj; }");
      return hasChecker.has(jsonObj, key);
    }

    private <T> void setValue(String key, T value) {
        Setter setter = (Setter) eval("(obj, key, value) => { obj[key] = value; };");
        setter.set(jsonObj, key, Js.asAny(value));
    }

    private List<String> getAllKeys() {
        Keys keys = (Keys) eval("(obj) => { return Object.keys(obj); }");
        return Arrays.asList(keys.get(jsonObj));
    }

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
        return getValue(key);
    }

    @Override
    public int getInt(String key) {
        return getValue(key);
    }

    @Override
    public double getNumber(String key) {
        return getValue(key);
    }

    @Override
    public boolean getBool(String key) {
        return getValue(key);
    }

    @Override
    public PortableJson getObject(String key) {
        return new PortableJsonJsImpl(getValue(key));
    }

    @Override
    public boolean hasKey(String key) {
        return hasStringKey(key);
    }

    @Override
    public void forEach(Consumer<String> callback) {
        List<String> keys = keys();
        for (String key : keys) {
            callback.accept(key);
        }
    }

    @Override
    public List<String> keys() {
        return getAllKeys();
    }

    @Override
    public List<String> asStringArray() {
        List<String> list = new ArrayList<>();
        forEach(str -> list.add(str));
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

    @Override
    public boolean equals(Object other) {
        return other instanceof PortableJsonJsImpl && hashCode() == other.hashCode();
    }

    @Override
    public int hashCode() {
        return Arrays.deepHashCode(keys().toArray()) *
               Arrays.deepHashCode(keys().stream().map(
                   key -> jsonObj.asPropertyMap().getAsAny(key)).collect(Collectors.toList()).toArray());
    }

    @Override
    public PortableJson put(String key, int num) {
        setValue(key, num);
        return this;
    }

    @Override
    public PortableJson put(String key, double num) {
        setValue(key, num);
        return this;
    }

    @Override
    public PortableJson put(String key, String value) {
        setValue(key, value);
        return this;
    }

    @Override
    public PortableJson put(String key, boolean bool) {
        setValue(key, bool);
        return this;
    }

    @Override
    public PortableJson put(String key, PortableJson obj) {
        setValue(key, ((PortableJsonJsImpl) obj).getRawObj());
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
        jsonObj.asArrayLike().setAt(index, obj);
        return this;
    }

    Any getRawObj() {
        return jsonObj;
    }
}
