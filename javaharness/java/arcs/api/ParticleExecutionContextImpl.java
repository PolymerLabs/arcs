package arcs.api;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import javax.inject.Inject;

public class ParticleExecutionContextImpl implements ParticleExecutionContext {
  private PortableJsonParser jsonParser;
  private ArrayList<Particle> particles;
  private HandleFactory handleFactory;

  @Inject
  public ParticleExecutionContextImpl(
      PortableJsonParser jsonParser, HandleFactory handleFactory) {
    this.jsonParser = jsonParser;
    this.particles = new ArrayList<>();
    this.handleFactory = handleFactory;
  }

  @Override
  public void initializeParticle(
      Particle particle,
      ParticleSpec spec,
      Map<String, StorageProxy> proxies,
      IdGenerator idGenerator) {
    Objects.requireNonNull(particle).setSpec(spec);
    particle.setJsonParser(jsonParser);
    this.particles.add(particle);

    Map<String, Handle> handleMap = new HashMap<>();
    Map<Handle, StorageProxy> registerMap = new HashMap<>();

    for (String proxyName : proxies.keySet()) {
      StorageProxy storageProxy = proxies.get(proxyName);
      Handle handle =
          this.handleFactory.handleFor(
              storageProxy,
              idGenerator,
              proxyName,
              particle.getId(),
              spec.isInput(proxyName),
              spec.isOutput(proxyName));
      handleMap.put(proxyName, handle);
      registerMap.put(handle, storageProxy);
    }

    particle.setHandles(handleMap);
    for (Handle handle : registerMap.keySet()) {
      StorageProxy storageProxy = registerMap.get(handle);
      storageProxy.register(particle, handle);
    }
  }
}
