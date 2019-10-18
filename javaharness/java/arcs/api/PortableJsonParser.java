package arcs.api;

import java.util.Collection;

/** Portable JSON parser that works on either JS or Android environment. */
public interface PortableJsonParser {
  PortableJson parse(String json);

  String stringify(PortableJson json);

  PortableJson emptyObject();

  PortableJson emptyArray();

  PortableJson fromStringArray(Collection<String> collection);

  PortableJson fromObjectArray(Collection<PortableJson> collection);
}


