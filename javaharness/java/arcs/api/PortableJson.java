package arcs.api;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

/**
 * Portable representation of JSON structure.
 */
public class PortableJson {

  private Object jsonObject;

  PortableJson(JSONObject jsonObject) {
    this.jsonObject = jsonObject;
  }

  PortableJson(JSONArray jsonObject) {
    this.jsonObject = jsonObject;
  }

  String stringify() {
    return jsonObject.toString();
  }

  interface JsonObjectFunction<T> {
    T apply(JSONObject obj) throws JSONException;
  }

  interface JsonArrayFunction<T> {
    T apply(JSONArray arr) throws JSONException;
  }

  public String getString(int index) {
    return array(x -> x.getString(index));
  }

  public String getString(String key) {
    return object(x -> x.getString(key));
  }

  public int getInt(int index) {
    return array(x -> x.getInt(index));
  }

  public int getInt(String key) {
    return object(x -> x.getInt(key));
  }

  public double getNumber(int index) {
    return array(x -> x.getDouble(index));
  }

  public double getNumber(String key) {
    return object(x -> x.getDouble(key));
  }

  public boolean getBool(int index) {
    return array(x -> x.getBoolean(index));
  }

  public boolean getBool(String key) {
    return object(x -> x.getBoolean(key));
  }

  public PortableJson getObject(int index) {
    return array(x -> {
      JSONObject obj = x.optJSONObject(index);
      return obj == null
        ? new PortableJson(x.getJSONArray(index))
        : new PortableJson(obj);
    });
  }

  public PortableJson getObject(String key) {
    return object(x -> {
      JSONObject obj = x.optJSONObject(key);
      return obj == null
        ? new PortableJson(x.getJSONArray(key))
        : new PortableJson(obj);
    });
  }

  public int getLength() {
    return array(JSONArray::length);
  }

  public boolean hasKey(String key) {
    return object(x -> x.has(key));
  }

  public void forEach(Consumer<String> callback) {
    if (jsonObject instanceof JSONObject) {
      keys().forEach(callback::accept);
    } else {
      for (int i = 0; i < getLength(); ++i) {
        callback.accept(getString(i));
      }
    }
  }

  public List<String> keys() {
    return object(
      x -> {
        List<String> keyList = new ArrayList<>();
        x.keys().forEachRemaining(y -> keyList.add(y));
        return keyList;
      });
  }

  public List<String> asStringArray() {
    List<String> result = new ArrayList<>();
    for (int i = 0; i < getLength(); i++) {
      result.add(getString(i));
    }
    return result;
  }

  public List<PortableJson> asObjectArray() {
    List<PortableJson> result = new ArrayList<>();
    for (int i = 0; i < getLength(); i++) {
      result.add(getObject(i));
    }
    return result;
  }

  public PortableJson put(String key, int num) {
    object(x -> x.put(key, num));
    return this;
  }

  public PortableJson put(String key, double num) {
    object(x -> x.put(key, num));
    return this;
  }

  public PortableJson put(String key, String value) {
    object(x -> x.put(key, value));
    return this;
  }

  public PortableJson put(String key, boolean bool) {
    object(x -> x.put(key, bool));
    return this;
  }

  public PortableJson put(String key, PortableJson obj) {
    object(x -> x.put(key, obj.getRawObj()));
    return this;
  }

  public PortableJson put(int index, int num) {
    array(x -> x.put(index, num));
    return this;
  }

  public PortableJson put(int index, double num) {
    array(x -> x.put(index, num));
    return this;
  }

  public PortableJson put(int index, String value) {
    array(x -> x.put(index, value));
    return this;
  }

  public PortableJson put(int index, boolean bool) {
    array(x -> x.put(index, bool));
    return this;
  }

  public PortableJson put(int index, PortableJson obj) {
    array(x -> x.put(index, obj.getRawObj()));
    return this;
  }

  public int hashCode() {
    return getRawObj().hashCode();
  }

  public boolean equals(Object other) {
    if (!(other instanceof PortableJson)) {
      return false;
    }
    return stringify().equals(((PortableJson) other).stringify());
  }

  // TODO: Can we unify getObject and getArray?
  public PortableJson getArray(String key) {
    return object(x -> new PortableJson(x.getJSONArray(key)));
  }

  public PortableJson getArray(int index) {
    return array(x -> new PortableJson(x.getJSONArray(index)));
  }

  Object getRawObj() {
    return jsonObject;
  }

  private <T> T object(JsonObjectFunction<T> func) {
    try {
      return func.apply((JSONObject) jsonObject);
    } catch (JSONException e) {
      e.printStackTrace();
    }

    return null;
  }

  private <T> T array(JsonArrayFunction<T> func) {
    try {
      return func.apply((JSONArray) jsonObject);
    } catch (JSONException e) {
      e.printStackTrace();
    }

    return null;
  }
}
