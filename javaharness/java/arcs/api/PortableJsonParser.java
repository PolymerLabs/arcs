package arcs.api;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Collection;

import javax.inject.Inject;

/** Portable JSON parser. */
public class PortableJsonParser {

  @Inject
  public PortableJsonParser() {}

  public PortableJson parse(String json) {
    if (json.trim().startsWith("{")) {
      try {
        return new PortableJson(new JSONObject(json));
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
    } else if (json.trim().startsWith("[")) {
      try {
        return new PortableJson(new JSONArray(json));
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
    }
    return null;
  }

  public String stringify(PortableJson json) {
    return json.stringify();
  }

  public PortableJson emptyObject() {
    return new PortableJson(new JSONObject());
  }

  public PortableJson emptyArray() {
    return new PortableJson(new JSONArray());
  }

  public PortableJson fromStringArray(Collection<String> collection) {
    PortableJson array = emptyArray();
    final int[] i = {0};
    collection.forEach(x -> array.put(i[0]++, x));
    return array;
  }

  public PortableJson fromObjectArray(Collection<PortableJson> collection) {
    PortableJson array = emptyArray();
    final int[] i = {0};
    collection.forEach(x -> array.put(i[0]++, x));
    return array;
  }
}
