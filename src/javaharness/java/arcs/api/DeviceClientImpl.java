package arcs.api;

import javax.inject.Inject;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

public class DeviceClientImpl implements DeviceClient {
  private static final String FIELD_MESSAGE = "message";
  private static final String MESSAGE_READY = "ready";
  private static final String MESSAGE_DATA = "data";
  private static final String MESSAGE_PEC = "pec";
  private static final String FIELD_TRANSACTION_ID = "tid";
  private static final String FIELD_DATA = "data";
  private static final String FIELD_PEC_ID = "id";
  private static final String FIELD_SESSION_ID = "sessionId";

  private static final Logger LOGGER = Logger.getLogger(DeviceClient.class.getName());

  private final PortableJsonParser jsonParser;
  private Map<String, ArcsEnvironment.DataListener> inProgress;
  private final PECInnerPortFactory portFactory;
  private final Map<String, PECInnerPort> portById = new HashMap<String, PECInnerPort>();

  @Inject
  public DeviceClientImpl(
      PortableJsonParser jsonParser,
      Map<String, ArcsEnvironment.DataListener> inProgress,
      PECInnerPortFactory portFactory) {
    this.jsonParser = jsonParser;
    this.inProgress = inProgress;
    this.portFactory = portFactory;
  }

  @Override
  public void receive(String json) {
    // LOGGER.info("receive called " + json);
    PortableJson content = jsonParser.parse(json);
    String message = content.getString(FIELD_MESSAGE);
    switch (message) {
      case MESSAGE_READY:
        LOGGER.info("LOGGER: Received 'ready' message");
        break;
      case MESSAGE_DATA:
        String transactionId = String.valueOf(content.getInt(FIELD_TRANSACTION_ID));
        if (inProgress.containsKey(transactionId)) {
          PortableJson dataJson = content.getObject(FIELD_DATA);
          if (dataJson != null) {
            inProgress.get(transactionId).onData(transactionId, jsonParser.stringify(dataJson));
          }
          inProgress.remove(transactionId);
        }
        break;
      case MESSAGE_PEC:
        postMessage(content.getObject(FIELD_DATA));
        break;
      default:
        throw new AssertionError("Received unsupported message: " + message);
    }
  }

  protected void postMessage(PortableJson msg) {
    String id = msg.getString(FIELD_PEC_ID);
    if (msg.hasKey(FIELD_SESSION_ID)) {
      portById.put(id, portFactory.createPECInnerPort(id, msg.getString(FIELD_SESSION_ID)));
    }

    PECInnerPort port = portById.get(id);
    port.handleMessage(msg);
  }
}
