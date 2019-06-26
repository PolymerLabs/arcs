package arcs.webimpl;

import arcs.api.ArcsEnvironment;
import arcs.api.DeviceClient;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.PECInnerPort;
import arcs.api.PECInnerPortFactory;
import arcs.api.NativeParticle;
import jsinterop.annotations.JsType;

import javax.inject.Inject;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;

import static elemental2.dom.DomGlobal.window;

@JsType(namespace = "arcs")

public class DeviceClientJsImpl implements DeviceClient {
    private final String FIELD_MESSAGE = "message";
    private final String MESSAGE_READY = "ready";
    private final String MESSAGE_DATA = "data";
    private final String MESSAGE_PEC = "pec";
    private final String FIELD_TRANSACTION_ID = "tid";
    private final String FIELD_DATA = "data";
    private final String FIELD_PEC_ID = "id";

    private final PortableJsonParser jsonParser;
    private Map<String, ArcsEnvironment.DataListener> inProgress;
    private final PECInnerPortFactory portFactory;
    private final Map<String, PECInnerPort> portById = new HashMap<String, PECInnerPort>();

    @Inject
    public DeviceClientJsImpl(PortableJsonParser jsonParser,
                              Map<String, ArcsEnvironment.DataListener> inProgress,
                              PECInnerPortFactory portFactory) {
        this.jsonParser = jsonParser;
        this.inProgress = inProgress;
        this.portFactory = portFactory;
    }

    @Override
    public void receive(String json) {
        // window.console.log("receive called " + json);
        PortableJson content = jsonParser.parse(json);
        String message = content.getString(FIELD_MESSAGE);
        switch (message) {
            case MESSAGE_READY:
                window.console.log("Received 'ready' message");
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
