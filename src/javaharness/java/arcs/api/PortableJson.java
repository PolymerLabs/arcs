package arcs.api;

import java.util.List;
import java.util.function.Consumer;

/** Portable representation of JSON structure. */
public interface PortableJson {
  // Array methods
  String getString(int index);

  int getInt(int index);

  double getNumber(int index);

  boolean getBool(int index);

  PortableJson getObject(int index);

  int getLength();

  // Object methods
  String getString(String key);

  int getInt(String key);

  double getNumber(String key);

  boolean getBool(String key);

  PortableJson getObject(String key);

  boolean hasKey(String key);

  // Iterator methods.
  void forEach(Consumer<String> callback);

  List<String> keys();

  List<String> asStringArray();

  List<PortableJson> asObjectArray();

  // Object setters
  PortableJson put(String key, int num);

  PortableJson put(String key, double num);

  PortableJson put(String key, String value);

  PortableJson put(String key, boolean bool);

  PortableJson put(String key, PortableJson obj);

  // Array setters
  PortableJson put(int index, int num);

  PortableJson put(int index, double num);

  PortableJson put(int index, String value);

  PortableJson put(int index, boolean bool);

  PortableJson put(int index, PortableJson obj);
}
