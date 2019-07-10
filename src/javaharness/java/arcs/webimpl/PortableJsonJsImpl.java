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
        jsonObj.asArrayLike().setAt(index, obj);
        return this;
    }

    Any getRawObj() {
        return jsonObj;
    }
}
