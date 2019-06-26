package arcs.api;

import javax.inject.Inject;

public class PECInnerPortFactoryImpl implements PECInnerPortFactory {
    private ArcsEnvironment environment;
    private ParticleExecutionContext pec;
    private PortableJsonParser jsonParser;

    @Inject
    public PECInnerPortFactoryImpl(ArcsEnvironment environment,
                                   ParticleExecutionContext pec,
                                   PortableJsonParser jsonParser) {
        this.environment = environment;
        this.pec = pec;
        this.jsonParser = jsonParser;
    }

    @Override
    public PECInnerPort createPECInnerPort(String id) {
        return new PECInnerPortImpl(id, environment, pec, jsonParser);
    }
}
