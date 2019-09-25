package arcs.android.client;

import javax.inject.Inject;

import arcs.android.api.IRemotePecCallback;
import arcs.api.Id;
import arcs.api.IdGenerator;
import arcs.api.PECInnerPort;
import arcs.api.PECInnerPortFactory;
import arcs.api.Particle;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;

public class RemotePec {

  private final ArcsServiceBridge bridge;
  private final PECInnerPortFactory pecInnerPortFactory;
  private final PortableJsonParser jsonParser;

  private PECInnerPort pecInnerPort;
  private String arcId;
  private String pecId;
  private String providedSlotId;
  private final IdGenerator idGenerator;

  private final IRemotePecCallback callback =
      new IRemotePecCallback.Stub() {
        @Override
        public void onMessage(String message) {
          PortableJson json = jsonParser.parse(message);
          pecInnerPort.onReceivePecMessage(json);
        }
      };

  @Inject
  RemotePec(
      ArcsServiceBridge bridge,
      PECInnerPortFactory pecInnerPortFactory,
      PortableJsonParser jsonParser) {
    this.bridge = bridge;
    this.pecInnerPortFactory = pecInnerPortFactory;
    this.jsonParser = jsonParser;
    idGenerator = IdGenerator.newSession();
  }

  public void setArcId(String arcId) {
    if (this.arcId != null) {
      throw new IllegalStateException("Cannot override existing arcId " + this.arcId);
    }
    this.arcId = arcId;
  }

  public String getArcId() {
    return arcId;
  }

  public void setPecId(String pecId) {
    if (this.pecId != null) {
      throw new IllegalStateException("Cannot override existing pecId " + this.pecId);
    }
    this.pecId = pecId;
  }

  public String getProvidedSlotId() {
    return providedSlotId;
  }

  /**
   * Starts a new arc running the given recipe. The given particle implementation is attached to
   * that arc.
   */
  // TODO(mmandlis): This method should accept additional options: arcId and pecId.
  public void runArc(String recipe, Particle particle) {
    if (pecInnerPort != null) {
      throw new IllegalStateException("PEC has already been initialized.");
    }

    if (getArcId() == null) {
      setArcId(Id.newArcId().toString());
    }

    if (pecId == null) {
      setPecId(idGenerator.newChildId(Id.fromString(arcId), "pec").toString());
    }

    if (particle.getId() == null) {
      particle.setId(idGenerator.newChildId(Id.fromString(arcId), "particle").toString());
    }

    particle.setJsonParser(jsonParser);

    pecInnerPort =
        pecInnerPortFactory.createPECInnerPort(pecId, idGenerator.getSessionId());
    pecInnerPort.mapParticle(particle);

    providedSlotId = idGenerator.newChildId(Id.fromString(arcId), "slotId").toString();
    bridge.startArc(
        arcId, pecId, recipe, particle.getId(), particle.getName(), providedSlotId, callback);
  }

  /** Shuts down the running arc and remote PEC. */
  public void shutdown() {
    if (pecInnerPort == null) {
      return;
    }
    String pecId = this.pecInnerPort.getId();
    pecInnerPort = null;

    String arcId = this.arcId;
    this.arcId = null;

    bridge.stopArc(arcId, pecId);
  }
}
