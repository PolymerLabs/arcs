package arcs.api;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

// copied from storage-proxy.ts
public class StorageProxyScheduler {
  private boolean scheduled = false;
  private Map<Particle, Map<Handle, List<Args>>> queues = new HashMap<>();
  private PortablePromise.Resolver idleResolver;
  private PortablePromise<Void> idle;
  private PortablePromiseFactory promiseFactory;

  private static final Logger LOGGER = Logger.getLogger(StorageProxyScheduler.class.getName());

  StorageProxyScheduler(PortablePromiseFactory promiseFactory) {
    this.promiseFactory = promiseFactory;
  }

  public static class Args {
    String kind;
    Particle particle;
    PortableJson details;

    Args(String kind, Particle particle, PortableJson details) {
      this.kind = kind;
      this.particle = particle;
      this.details = details;
    }
  }

  // TODO: break apart args here, sync events should flush the queue.
  void enqueue(Particle particle, Handle handle, String kind, PortableJson details) {
    if (!queues.containsKey(particle)) {
      queues.put(particle, new HashMap<>());
    }
    Map<Handle, List<Args>> byHandle = queues.get(particle);
    if (!byHandle.containsKey(handle)) {
      byHandle.put(handle, new ArrayList<Args>());
    }
    List<Args> queue = byHandle.get(handle);
    queue.add(new Args(kind, particle, details));
    schedule();
  }

  public boolean busy() {
    return queues.size() > 0;
  }

  private void updateIdle() {
    if (idleResolver != null && !busy()) {
      idleResolver.resolve(null);
      idle = null;
      idleResolver = null;
    }
  }

  public PortablePromise<Void> isIdle() {
    if (!busy()) {
      return promiseFactory.newPromise(null);
    }
    if (idle == null) {
      idle =
          promiseFactory.newPromise(
              (resolver, rejecter) -> {
                idleResolver = resolver;
              });
    }
    return idle;
  }

  private void schedule() {
    if (scheduled) {
      return;
    }
    scheduled = true;
    promiseFactory
        .newPromise(null)
        .then(
            Void -> {
              scheduled = false;
              dispatch();
            });
  }

  private void dispatch() {
    // TODO: should we process just one particle per task?
    while (queues.size() > 0) {
      Particle particle = queues.keySet().toArray(new Particle[0])[0];
      Map<Handle, List<Args>> byHandle = queues.get(particle);
      queues.remove(particle);
      for (Map.Entry<Handle, List<Args>> entry : byHandle.entrySet()) {
        for (Args args : entry.getValue()) {
          try {
            entry.getKey().notify(args.kind, args.particle, args.details);
          } catch (Throwable e) {
            LOGGER.info("Error dispatching to particle" + e.toString());
            // TODO: report system exception
          }
        }
      }
    }
    updateIdle();
  }
}
