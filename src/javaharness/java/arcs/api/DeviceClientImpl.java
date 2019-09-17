package arcs.api;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;
import javax.inject.Inject;

public class DeviceClientImpl implements DeviceClient {
  private static final String FIELD_MESSAGE = "message";
  private static final String MESSAGE_READY = "ready";
  private static final String FIELD_READY_RECIPES = "recipes";
  private static final String MESSAGE_DATA = "data";
  private static final String MESSAGE_OUTPUT = "output";
  private static final String MESSAGE_PEC = "pec";
  private static final String FIELD_TRANSACTION_ID = "tid";
  private static final String FIELD_DATA = "data";
  private static final String FIELD_PEC_ID = "id";
  private static final String FIELD_SESSION_ID = "sessionId";

  private static final Logger logger = Logger.getLogger(DeviceClient.class.getName());

  private final PortableJsonParser jsonParser;
  private final ArcsEnvironment environment;
  private final PECInnerPortFactory portFactory;
  private final Map<String, PECInnerPort> portById = new HashMap<>();
  private final UiBroker uiBroker;

  @Inject
  public DeviceClientImpl(
      PortableJsonParser jsonParser,
      ArcsEnvironment environment,
      PECInnerPortFactory portFactory,
      UiBroker uiBroker) {
    this.jsonParser = jsonParser;
    this.environment = environment;
    this.portFactory = portFactory;
    this.uiBroker = uiBroker;
  }

  @Override
  public void receive(String json) {
    PortableJson content = jsonParser.parse(json);
    String message = content.getString(FIELD_MESSAGE);
    switch (message) {
      case MESSAGE_READY:
        logger.info("logger: Received 'ready' message");
        environment.fireReadyEvent(content.getArray(FIELD_READY_RECIPES).asStringArray());
        break;
      case MESSAGE_DATA:
        logger.warning("logger: Received deprected 'data' message");
        PortableJson dataJson = content.getObject(FIELD_DATA);
        environment.fireDataEvent(
            String.valueOf(content.getInt(FIELD_TRANSACTION_ID)),
            dataJson == null ? null : jsonParser.stringify(dataJson));
        break;
      case MESSAGE_PEC:
        processPecMessage(content.getObject(FIELD_DATA));
        break;
      case MESSAGE_OUTPUT:
        if (!uiBroker.render(content)) {
          logger.warning("Skipped rendering content for " + content.getString("containerSlotName"));
        }
        break;
      default:
        throw new AssertionError("Received unsupported message: " + message);
    }
  }

  private void processPecMessage(PortableJson message) { 
    String id = message.getString(FIELD_PEC_ID);
    if (!portById.containsKey(id)) {
      portById.put(id, portFactory.createPECInnerPort(id, message.getString(FIELD_SESSION_ID)));
    }

    PECInnerPort port = portById.get(id);
    port.processMessage(message);
  }

  @Override
  public void startArc(String json, Particle particle) {
    PortableJson request = jsonParser.parse(json);
    request.put("message", "runArc");
    if (!request.hasKey("arcId")) {
      request.put("arcId", request.getString("recipe").toLowerCase() + "-arc");
    }
    if (!request.hasKey("pecId")) {
      request.put("pecId", request.getString("recipe").toLowerCase() + "-pec");
    }
    if (particle != null) {
      request.put("particleId", particle.getId()).put("particleName", particle.getName());
    }

    createPecForParticle(request.getString("pecId"), particle);
    environment.sendMessageToArcs(jsonParser.stringify(request), null);
  }

  protected void createPecForParticle(String pecid, Particle particle) {
    if (!portById.containsKey(pecid)) {
      portById.put(pecid, portFactory.createPECInnerPort(pecid, null));
    }
    PECInnerPort port = portById.get(pecid);
    if (particle != null) {
      port.mapParticle(particle);
    }
  }
}
