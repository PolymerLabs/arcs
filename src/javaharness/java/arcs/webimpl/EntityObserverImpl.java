package arcs.webimpl;

import arcs.api.PortableJson;
import arcs.builtinparticles.EntityObserver;
import java.util.ArrayList;
import java.util.List;
import javax.inject.Inject;

public class EntityObserverImpl implements EntityObserver {
  private final List<EntityObserver.Listener> listeners = new ArrayList<>();

  @Inject
  public EntityObserverImpl() {}

  @Override
  public void registerListener(EntityObserver.Listener listener) {
    listeners.add(listener);
  }

  @Override
  public void onEntityReceived(PortableJson entity) {
    listeners.forEach(listener -> listener.onEntity(entity));
  }
}
