package arcs.api;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import javax.inject.Inject;

public class ArcsApiImpl implements ArcsApi {
  public final PortableJsonParser jsonParser;
  public final Map<String, List<Function<PortableJson, String>>> handlerByMethod = new HashMap<>();

  @Inject
  public ArcsApiImpl(PortableJsonParser jsonParser) {
    this.jsonParser = jsonParser;
  }

  @Override
  public void registerHandler(String method, Function<PortableJson, String> handler) {
    if (!handlerByMethod.containsKey(method)) {
      handlerByMethod.put(method, new ArrayList<>());
    }
    handlerByMethod.get(method).add(handler);
  }

  @Override
  public String[] call(String method, PortableJson request) {
    if (!handlerByMethod.containsKey(method)) {
      throw new AssertionError("Unsupported method " + method);
    }
    List<String> ids = new ArrayList<>();
    for (Function<PortableJson, String> handler : handlerByMethod.get(method)) {
      String id = handler.apply(request);
      if (id != null) {
        ids.add(id);
      }
    }
    return ids.toArray(new String[0]);
  }
}
