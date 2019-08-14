package arcs.api;

import java.util.function.Function;

public interface ArcsApi {
  void registerHandler(String method, Function<PortableJson, String> handler);

  String[] call(String method, PortableJson request);
}
