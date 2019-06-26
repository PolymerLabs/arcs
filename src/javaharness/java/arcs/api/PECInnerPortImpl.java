package arcs.api;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

public class PECInnerPortImpl implements PECInnerPort {
    private static final String MESSAGE_TYPE_FIELD = "messageType";
    private static final String MESSAGE_BODY_FIELD = "messageBody";
    private static final String MESSAGE_PEC_ID_FIELD = "id";
    private static final String INDENTIFIER_FIELD = "identifier";
    private static final String INSTANTIATE_PARTICLE_MSG = "InstantiateParticle";
    private static final String PARTICLE_SPEC_FIELD = "spec";
    private static final String PARTICLE_STORES_FIELD = "stores";
    private static final String DEFINE_HANDLE_MSG = "DefineHandle";
    private static final String HANDLE_TYPE_FIELD = "type";
    private static final String HANDLE_NAME_FIELD = "name";
    private static final String SIMPLE_CALLBACK_MSG = "SimpleCallback";
    private static final String INITIALIZE_PROXY_MSG = "InitializeProxy";
    private static final String PROXY_HANDLE_ID_FIELD = "handle";
    private static final String PROXY_CALLBACK_FIELD = "callback";

    private final String id;
    private final ShellApi shellApi;
    private final ParticleExecutionContext pec;
    private final ThingMapper mapper;
    private final PortableJsonParser jsonParser;

    public PECInnerPortImpl(String id,
                            ShellApi shellApi,
                            ParticleExecutionContext pec,
                            PortableJsonParser jsonParser) {
        this.id = id;
        this.shellApi = shellApi;
        this.pec = pec;
        this.mapper = new ThingMapper("j");
        this.jsonParser = jsonParser;
    }

    @Override
    public void handleMessage(PortableJson message) {
        String messageType = message.getString(MESSAGE_TYPE_FIELD);
        PortableJson messageBody = message.getObject(MESSAGE_BODY_FIELD);
        switch(messageType) {
            case INSTANTIATE_PARTICLE_MSG:
                ParticleSpec spec = ParticleSpec.fromJson(messageBody.getObject(PARTICLE_SPEC_FIELD));
                PortableJson stores = messageBody.getObject(PARTICLE_STORES_FIELD);
                Map<String, StorageProxy> proxies = new HashMap<String, StorageProxy>();
                stores.forEach(proxyName -> {
                    String proxyId = stores.getString(proxyName);
                    proxies.put(proxyName, mapper.thingForIdentifier(proxyId).getStorageProxy());
                });

                NativeParticle particle = pec.instantiateParticle(spec, proxies);
                if (particle == null) {
                    // TODO: improve error handling.
                    throw new AssertionError("Cannot instantiate particle " + spec.name);
                }
                mapper.establishThingMapping(messageBody.getString(INDENTIFIER_FIELD), new Thing<NativeParticle>(particle));
                break;
            case DEFINE_HANDLE_MSG:
                String identifier = messageBody.getString(INDENTIFIER_FIELD);
                StorageProxy storageProxy = StorageProxyFactory.newProxy(
                    identifier,
                    TypeFactory.typeFromJson(messageBody.getObject(HANDLE_TYPE_FIELD)),
                    messageBody.getString(HANDLE_NAME_FIELD),
                    this);
                mapper.establishThingMapping(identifier, new Thing<StorageProxy>(storageProxy));
                break;
            case SIMPLE_CALLBACK_MSG:
                // TODO: implement.
                break;
            default:
                throw new AssertionError("Unsupported message type: " + messageType);
        }
    }

    @Override
    public void InitializeProxy(StorageProxy storageProxy, Consumer<PortableJson> callback) {
        PortableJson message = jsonParser.parse("{}");
        message.put(MESSAGE_TYPE_FIELD, INITIALIZE_PROXY_MSG);
        PortableJson body = jsonParser.parse("{}");
        body.put(PROXY_HANDLE_ID_FIELD, mapper.identifierForThing(new Thing<StorageProxy>(storageProxy)));
        body.put(PROXY_CALLBACK_FIELD, mapper.createMappingForThing(
            new Thing<Consumer<PortableJson>>(callback), /* requestedId= */ null));
        message.put(MESSAGE_BODY_FIELD, body);
        postMessage(message);
    }

    @Override
    public void SynchronizeProxy(StorageProxy storageProxy, Consumer<PortableJson> callback) {
        // TODO: Implement.
    }

    private void postMessage(PortableJson message) {
        // TODO: add support for PEC messages in pipes-shell-2 bus.
        // message.put(MESSAGE_PEC_ID_FIELD, this.id);
        // shellApi.postMessage(jsonParser.stringify(message));
    }
}
