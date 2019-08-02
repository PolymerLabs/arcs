package arcs.api;

import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClient;
import arcs.api.Particle;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.PECInnerPort;
import arcs.api.PECInnerPortFactory;

import javax.inject.Inject;
import java.util.HashMap;
import java.util.logging.Logger;
import java.util.Map;

public class DeviceClientImpl implements DeviceClient {
    private final String FIELD_MESSAGE = "message";
    private final String MESSAGE_READY = "ready";
    private final String MESSAGE_DATA = "data";
    private final String MESSAGE_PEC = "pec";
    private final String FIELD_TRANSACTION_ID = "tid";
    private final String FIELD_DATA = "data";
    private final String FIELD_PEC_ID = "id";

    private static final Logger LOGGER = Logger.getLogger(DeviceClient.class.getName());

    private final PortableJsonParser jsonParser;
    private Map<String, ArcsEnvironment.DataListener> inProgress;
    private final PECInnerPortFactory portFactory;
    private final Map<String, PECInnerPort> portById = new HashMap<String, PECInnerPort>();

    @Inject
    public DeviceClientImpl(PortableJsonParser jsonParser,
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

    private void postMessage(PortableJson msg) {
        PECInnerPort port = getOrCreatePort(msg.getString(FIELD_PEC_ID));
        port.handleMessage(msg);
    }

    private PECInnerPort getOrCreatePort(String id) {
        if (!this.portById.containsKey(id)) {
            this.portById.put(id, this.portFactory.createPECInnerPort(id));
        }
        return this.portById.get(id);
    }
}
