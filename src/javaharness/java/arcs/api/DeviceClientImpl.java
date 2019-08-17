package arcs.api;

import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;
import javax.inject.Inject;

public class DeviceClientImpl implements DeviceClient {
  private static final String FIELD_MESSAGE = "message";
  private static final String MESSAGE_PEC = "pec";
  private static final String FIELD_DATA = "data";
  private static final String FIELD_PEC_ID = "id";
  private static final String FIELD_SESSION_ID = "sessionId";
  private static final String MESSAGE_OUTPUT = "output";
  private static final String FIELD_SLOT_ID = "slotid";
  private static final String FIELD_RENDERING_CONTENT = "content";

  private static final Logger logger = Logger.getLogger(DeviceClient.class.getName());

  private final PortableJsonParser jsonParser;
  private Map<String, ArcsEnvironment.DataListener> inProgress;
  private final PECInnerPortFactory portFactory;
  private final Map<String, PECInnerPort> portById = new HashMap<>();

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
    // logger.info("receive called " + json);
    PortableJson content = jsonParser.parse(json);
    String message = content.getString(FIELD_MESSAGE);
    switch (message) {
      case MESSAGE_OUTPUT:
        String slotid = content.getString(FIELD_SLOT_ID);
        PortableJson renderingContent = content.getObject(FIELD_RENDERING_CONTENT);
        if (inProgress.containsKey(slotid)) {
            inProgress.get(slotid).onData(slotid, jsonParser.stringify(renderingContent));
        }
        // TODO: Arc's lifecycle needs to determine when the called should be removed.
        // inProgress.remove(slotid);
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
