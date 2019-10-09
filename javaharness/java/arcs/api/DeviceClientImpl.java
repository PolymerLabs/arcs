package arcs.api;

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
  private final PecPortManager pecPortManager;
  private final UiBroker uiBroker;

  @Inject
  public DeviceClientImpl(
      PortableJsonParser jsonParser,
      ArcsEnvironment environment,
      PecPortManager pecPortManager,
      UiBroker uiBroker) {
    this.jsonParser = jsonParser;
    this.environment = environment;
    this.pecPortManager = pecPortManager;
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
        logger.warning("logger: Received deprecated 'data' message");
        break;
      case MESSAGE_PEC:
        deliverPecMessage(content.getObject(FIELD_DATA));
        break;
      case MESSAGE_OUTPUT:
        if (!uiBroker.render(content.getObject(FIELD_DATA))) {
          logger.warning(
              "Skipped rendering content for "
                  + content.getObject("data").getString("containerSlotName"));
        }
        break;
      default:
        throw new AssertionError("Received unsupported message: " + message);
    }
  }

  private void deliverPecMessage(PortableJson message) {
    String pecId = message.getString(FIELD_PEC_ID);
    String sessionId =
        message.hasKey(FIELD_SESSION_ID) ? message.getString(FIELD_SESSION_ID) : null;
    pecPortManager.deliverPecMessage(pecId, sessionId, message);
  }
}
