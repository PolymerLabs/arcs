package arcs.android;

import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import java.util.Collection;
import javax.inject.Inject;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

class AndroidPortableJsonParser implements PortableJsonParser {

  @Inject
  public AndroidPortableJsonParser() {}

  @Override
  public PortableJson parse(String json) {
    if (json.trim().startsWith("{")) {
      try {
        return new AndroidPortableJson(new JSONObject(json));
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
    } else if (json.trim().startsWith("[")) {
      try {
        return new AndroidPortableJson(new JSONArray(json));
      } catch (JSONException e) {
        throw new RuntimeException(e);
      }
    }
    return null;
  }

  @Override
  public String stringify(PortableJson json) {
    return ((AndroidPortableJson) json).stringify();
  }

  @Override
  public PortableJson emptyObject() {
    return new AndroidPortableJson(new JSONObject());
  }

  @Override
  public PortableJson emptyArray() {
    return new AndroidPortableJson(new JSONArray());
  }

  @Override
  public PortableJson fromStringArray(Collection<String> collection) {
    PortableJson array = emptyArray();
    final int[] i = {0};
    collection.forEach(x -> array.put(i[0]++, x));
    return array;
  }

  @Override
  public PortableJson fromObjectArray(Collection<PortableJson> collection) {
    PortableJson array = emptyArray();
    final int[] i = {0};
    collection.forEach(x -> array.put(i[0]++, x));
    return array;
  }
}
