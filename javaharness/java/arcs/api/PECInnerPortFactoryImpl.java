package arcs.api;

import javax.inject.Inject;

public class PECInnerPortFactoryImpl implements PECInnerPortFactory {
  private final ShellApi shellApi;
  private final ParticleExecutionContext pec;
  private final PortableJsonParser jsonParser;

  @Inject
  public PECInnerPortFactoryImpl(
      ShellApi shellApi,
      ParticleExecutionContext pec,
      PortableJsonParser jsonParser) {
    this.shellApi = shellApi;
    this.pec = pec;
    this.jsonParser = jsonParser;
  }

  @Override
  public PECInnerPort createPECInnerPort(String id, String sessionId) {
    return new PECInnerPortImpl(id, sessionId, shellApi, pec, jsonParser);
  }
}
