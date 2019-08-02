package arcs.api;

import javax.inject.Inject;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

public class ParticleExecutionContextImpl implements ParticleExecutionContext {
    private ParticleLoader particleLoader;
    private PortableJsonParser jsonParser;
    private ArrayList<Particle> particles;
    private HandleFactory handleFactory;

    @Inject
    public ParticleExecutionContextImpl(PortableJsonParser jsonParser,
                                        ParticleLoader particleLoader,
                                        HandleFactory handleFactory) {
        this.jsonParser = jsonParser;
        this.particleLoader = particleLoader;
        this.particles = new ArrayList<Particle>();
        this.handleFactory = handleFactory;
    }

    @Override
    public Particle instantiateParticle(ParticleSpec spec, Map<String, StorageProxy> proxies) {
        // TODO: use the full spec.implPath, instead of the filename.
        Particle particle = particleLoader.loadParticle(spec.getFileName()).flatMap(
            x -> Optional.ofNullable(x.createParticle())).orElse(null);
        particle.setSpec(spec);
        this.particles.add(particle);

        Map<String, Handle> handleMap = new HashMap();
        Map<Handle, StorageProxy> registerMap = new HashMap();

        for (String proxyName : proxies.keySet()) {
            StorageProxy storageProxy = proxies.get(proxyName);
            Handle handle = this.handleFactory.handleFor(
                storageProxy, proxyName, spec.isInput(proxyName), spec.isOutput(proxyName));
            handleMap.put(proxyName, handle);
            registerMap.put(handle, storageProxy);
        }

        particle.setHandles(handleMap);
        for (Handle handle : registerMap.keySet()) {
            StorageProxy storageProxy = registerMap.get(handle);
            storageProxy.register(particle, handle);
        }
        return particle;
    }
}
