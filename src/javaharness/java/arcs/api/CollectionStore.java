package arcs.api;

public interface CollectionStore extends Store {
  // TODO: add parameters and return values.
  void get();
  void store(PortableJson add);
  void clear();
  void remove();
  PortableJson toList();
}
