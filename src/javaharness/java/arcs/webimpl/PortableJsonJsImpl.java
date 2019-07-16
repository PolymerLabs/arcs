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

    private <T> T getValue(String key) {
      Getter getter = (Getter) eval("(obj, key) => { return obj[key]; }");
      return Js.uncheckedCast(getter.get(jsonObj, key));
    }

    @JsFunction
    interface GetterI {
      Object get(Object obj, int index);
    }

    private <T> T getValue(int index) {
      GetterI getter = (GetterI) eval("(obj, index) => { return obj[index]; }");
      return Js.uncheckedCast(getter.get(jsonObj, index));
    }

    @JsFunction
    interface HasChecker {
        boolean has(Object obj, String key);
    }

    private boolean hasStringKey(String key) {
      HasChecker hasChecker = (HasChecker) eval("(obj, key) => { return key in obj; }");
      return hasChecker.has(jsonObj, key);
    }

    @JsFunction
    interface Setter {
      void set(Object obj, String key, Any value);
    }

    private <T> void setValue(String key, T value) {
        Setter setter = (Setter) eval("(obj, key, value) => { obj[key] = value; };");
        setter.set(jsonObj, key, Js.asAny(value));
    }

    // Define explicit method to avoid conversion of int to Integer.
    private void setValue(String key, int value) {
        Setter setter = (Setter) eval("(obj, key, value) => { obj[key] = value; };");
        setter.set(jsonObj, key, Js.asAny(value));
    }

    @JsFunction
    interface SetterI {
      void set(Object obj, int index, Any value);
    }

    private <T> void setValue(int index, T value) {
        SetterI setter = (SetterI) eval("(obj, index, value) => { obj[index] = value; };");
        setter.set(jsonObj, index, Js.asAny(value));
    }

    @JsFunction
    interface Keys {
        String[] get(Object obj);
    }

    private List<String> getAllKeys() {
        Keys keys = (Keys) eval("(obj) => { return Object.keys(obj); }");
        return Arrays.asList(keys.get(jsonObj));
    }

    @JsFunction
    interface Equator {
        boolean equals(Object obj, Object other);
    }

    private boolean isEqual(PortableJsonJsImpl other) {
        Equator equator = (Equator) eval("(obj, other) => { let compare = (o1, o2) => { return Object.keys(o1).length == Object.keys(o2).length && Object.keys(o1).every(key => (!!o1[key] == !!o2[key]) || ((o1[key] instanceof Object) && (o2[key] instanceof Object) && compare(o1[key]), o2[key])); }; return compare(obj, other); }");
        return equator.equals(jsonObj, other.jsonObj);
    }

    public PortableJsonJsImpl(Any jsonObj) {
        this.jsonObj = jsonObj;
    }

    @Override
    public String getString(int index) {
        return getValue(index);
    }

    @Override
    public int getInt(int index) {
        return getValue(index);
    }

    @Override
    public double getNumber(int index) {
        return getValue(index);
    }

    @Override
    public boolean getBool(int index) {
        return getValue(index);
    }

    @Override
    public PortableJson getObject(int index) {
        return getValue(index) instanceof PortableJsonJsImpl ? getValue(index) : new PortableJsonJsImpl(getValue(index));
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
        double num = getValue(key);
        return (int) num;
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
        return other instanceof PortableJsonJsImpl && isEqual((PortableJsonJsImpl) other);
    }

    @Override
    public int hashCode() {
        throw new AssertionError("hashCode is not supported for PortableJsonJsImpl.");
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
        setValue(index, num);
        return this;
    }

    @Override
    public PortableJson put(int index, double num) {
        setValue(index, num);
        return this;
    }

    @Override
    public PortableJson put(int index, String value) {
        setValue(index, value);
        return this;
    }

    @Override
    public PortableJson put(int index, boolean bool) {
        setValue(index, bool);
        return this;
    }

    @Override
    public PortableJson put(int index, PortableJson obj) {
        setValue(index, obj);
        return this;
    }

    Any getRawObj() {
        return jsonObj;
    }
}
