package arcs.api;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;
import javax.inject.Inject;

public class DeviceClientImpl implements DeviceClient {
  private static final String FIELD_MESSAGE = "message";
  private static final String MESSAGE_READY = "ready";
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
  private Map<String, ArcsEnvironment.DataListener> inProgress;
  private final PECInnerPortFactory portFactory;
  private final Map<String, PECInnerPort> portById = new HashMap<>();
  private final UiBroker uiBroker;

  @Inject
  public DeviceClientImpl(
      PortableJsonParser jsonParser,
      ArcsEnvironment environment,
      Map<String, ArcsEnvironment.DataListener> inProgress,
      PECInnerPortFactory portFactory,
      UiBroker uiBroker) {
    this.jsonParser = jsonParser;
    this.environment = environment;
    this.inProgress = inProgress;
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
        // TODO: Onstartup Arcs should be configuration based, not hardcoded.
        environment.sendMessageToArcs(jsonParser.stringify(jsonParser.emptyObject()
            .put("message", "runArc")
            .put("recipe", "Ingestion")
            .put("arcid", "ingestion-arc")), null);
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
    if (message.hasKey(FIELD_SESSION_ID)) {
      portById.put(id, portFactory.createPECInnerPort(id, message.getString(FIELD_SESSION_ID)));
    }

    PECInnerPort port = portById.get(id);
    port.processMessage(message);
  }
}
