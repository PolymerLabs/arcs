package arcs.impl;

import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import java.util.Collection;
import javax.inject.Inject;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

class PortableJsonParserAndroidImpl implements PortableJsonParser {

  @Inject
  public PortableJsonParserAndroidImpl() {}

  @Override
  public PortableJson parse(String json) {
    if (json.trim().startsWith("{")) {
      try {
        return new PortableJsonAndroidImpl(new JSONObject(json));
      } catch (JSONException e) {
        e.printStackTrace();
      }
    } else if (json.trim().startsWith("[")) {
      try {
        return new PortableJsonAndroidImpl(new JSONArray(json));
      } catch (JSONException e) {
        e.printStackTrace();
      }
    }
    return null;
  }

  @Override
  public String stringify(PortableJson json) {
    return ((PortableJsonAndroidImpl) json).stringify();
  }

  @Override
  public PortableJson emptyObject() {
    return new PortableJsonAndroidImpl(new JSONObject());
  }

  @Override
  public PortableJson emptyArray() {
    return new PortableJsonAndroidImpl(new JSONArray());
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
