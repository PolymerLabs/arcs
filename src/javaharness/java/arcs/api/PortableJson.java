package arcs.api;

import java.util.List;
import java.util.function.Consumer;

/** Portable representation of JSON structure. */
public interface PortableJson {
  // Array methods
  String getString(int index);

  String getString(String key);

  int getInt(int index);

  int getInt(String key);

  double getNumber(int index);

  double getNumber(String key);

  boolean getBool(int index);

  boolean getBool(String key);

  PortableJson getObject(int index);

  PortableJson getObject(String key);

  int getLength();

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
