package arcs.builtinparticles;

import arcs.api.PortableJson;

public interface EntityObserver {
  static interface Listener {
    void onEntity(PortableJson entity);
  }

  void registerListener(Listener listener);

  void onEntityReceived(PortableJson entity);
}
