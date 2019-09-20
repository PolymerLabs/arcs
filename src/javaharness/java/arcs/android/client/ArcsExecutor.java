package arcs.android.client;

import arcs.api.Id;
import arcs.api.IdGenerator;
import arcs.api.Particle;
import arcs.api.PortableJsonParser;
import javax.inject.Inject;
import javax.inject.Provider;

/** Helper class for running Arcs outside the main Arcs service. */
public class ArcsExecutor {

  private final PortableJsonParser jsonParser;
  private final Provider<RemotePec> remotePecProvider;

  @Inject
  ArcsExecutor(PortableJsonParser jsonParser, Provider<RemotePec> remotePecProvider) {
    this.jsonParser = jsonParser;
    this.remotePecProvider = remotePecProvider;
  }

  /**
   * Starts a new arc running the given recipe. The given particle implementation is attached to
   * that arc.
   */
  public void runArc(String recipe, Particle particle) {
    IdGenerator idGenerator = IdGenerator.newSession();
    Id arcId = Id.newArcId();
    Id pecId = idGenerator.newChildId(arcId, "pec");
    Id particleId = idGenerator.newChildId(pecId, "particle");

    particle.setId(particleId.toString());
    particle.setJsonParser(jsonParser);

    // Start up a Remote PEC.
    remotePecProvider.get().init(arcId.toString(), pecId.toString(), recipe, particle);
  }
}
