package arcs.api;

import javax.inject.Inject;

public class PecInnerPortFactoryImpl implements PecInnerPortFactory {
  private final ArcsEnvironment environment;
  private final ParticleExecutionContext pec;
  private final PortableJsonParser jsonParser;

  @Inject
  public PecInnerPortFactoryImpl(
      ArcsEnvironment environment,
      ParticleExecutionContext pec,
      PortableJsonParser jsonParser) {
    this.environment = environment;
    this.pec = pec;
    this.jsonParser = jsonParser;
  }

  @Override
  public PecInnerPort createPECInnerPort(String id, String sessionId) {
    return new PecInnerPortImpl(id, sessionId, environment, pec, jsonParser);
  }
}
