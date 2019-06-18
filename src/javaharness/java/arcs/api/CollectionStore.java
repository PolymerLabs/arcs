package arcs.api;

public interface CollectionStore extends Store {
  // TODO: add parameters and return values.
  void get();
  void store();
  void clear();
  void remove();
  void toList();
}
