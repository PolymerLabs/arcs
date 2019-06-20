package arcs.api;

import javax.inject.Inject;

public class PECInnerPortFactoryImpl implements PECInnerPortFactory {
    private ShellApi shellApi;
    private ParticleExecutionContext pec;
    private PortableJsonParser jsonParser;

    @Inject
    public PECInnerPortFactoryImpl(ShellApi shellApi, ParticleExecutionContext pec, PortableJsonParser jsonParser) {
        this.shellApi = shellApi;
        this.pec = pec;
        this.jsonParser = jsonParser;
    }

    @Override
    public PECInnerPort createPECInnerPort(String id) {
        return new PECInnerPortImpl(id, shellApi, pec, jsonParser);
    }
}
