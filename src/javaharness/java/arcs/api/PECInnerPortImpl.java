package arcs.api;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
    private static final String CALLBACK_FIELD = "callback";
    private static final String DATA_FIELD = "data";
    private static final String INITIALIZE_PROXY_MSG = "InitializeProxy";
    private static final String SYNCHRONIZE_PROXY_MSG = "SynchronizeProxy";
    private static final String PROXY_HANDLE_ID_FIELD = "handle";
    private static final String PROXY_CALLBACK_FIELD = "callback";
    private static final String START_RENDER_MSG = "StartRender";
    private static final String PARTICLE_FIELD = "particle";
    private static final String SLOT_NAME_FIELD = "slotName";
    private static final String PROVIDED_SLOTS_FIELD = "providedSlots";
    private static final String CONTENT_TYPES_FIELD = "contentTypes";
    private static final String STOP_RENDER_MSG = "StopRender";
    private static final String STOP_MSG = "Stop";
    private static final String DEV_TOOLS_CONNECTED_MSG = "DevToolsConnected";
    private static final String RENDER_MSG = "Render";
    private static final String CONTENT_FIELD = "content";

    private final String id;
    private ArcsEnvironment environment;
    private final ParticleExecutionContext pec;
    private final ThingMapper mapper;
    private final PortableJsonParser jsonParser;

    public PECInnerPortImpl(String id,
                            ArcsEnvironment environment,
                            ParticleExecutionContext pec,
                            PortableJsonParser jsonParser) {
        this.id = id;
        this.environment = environment;
        this.pec = pec;
        this.mapper = new ThingMapper("j");
        this.jsonParser = jsonParser;
    }

    @Override
    public void handleMessage(PortableJson message) {
        String messageType = message.getString(MESSAGE_TYPE_FIELD);
        PortableJson messageBody = message.getObject(MESSAGE_BODY_FIELD);
        switch(messageType) {
            case INSTANTIATE_PARTICLE_MSG: {
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
            }
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
                String callbackId = messageBody.getString(CALLBACK_FIELD);
                Consumer<PortableJson> callback = mapper.thingForIdentifier(callbackId).getConsumer();
                PortableJson data = messageBody.getObject(DATA_FIELD);
                callback.accept(data);
                break;
            case START_RENDER_MSG: {
                String particleId = messageBody.getString(PARTICLE_FIELD);
                NativeParticle particle = mapper.thingForIdentifier(particleId).getParticle();
                String slotName = messageBody.getString(SLOT_NAME_FIELD);
                Map<String, String> providedSlots = new HashMap<>();
                PortableJson providedSlotsJson = messageBody.getObject(PROVIDED_SLOTS_FIELD);
                for (int i = 0; i < providedSlotsJson.keys().size(); ++i) {
                    String name = providedSlotsJson.keys().get(i);
                    providedSlots.put(name, providedSlotsJson.getString(name));
                }
                List<String> contentTypes = new ArrayList<>();
                PortableJson contentTypesJson = messageBody.getObject(CONTENT_TYPES_FIELD);
                contentTypesJson.forEach(i -> contentTypes.add(contentTypesJson.getString(i)));
                particle.addSlotProxy(new SlotProxy(this, particle, slotName, providedSlots, jsonParser));
                particle.renderSlot(slotName, contentTypes);
                break;
            }
            case STOP_RENDER_MSG: {
                String particleId = messageBody.getString(PARTICLE_FIELD);
                NativeParticle particle = mapper.thingForIdentifier(particleId).getParticle();
                String slotName = messageBody.getString(SLOT_NAME_FIELD);
                if (!particle.hasSlotProxy(slotName)) {
                    throw new AssertionError("StopRender called for particle " +
                        particle.getName() + " slot "+ slotName + " without StartRender call.");
                }
                particle.removeSlotProxy(slotName);
                break;
            }
            case STOP_MSG:
                // TODO: not supported yet.
                break;
            case DEV_TOOLS_CONNECTED_MSG:
                // TODO: not supported yet.
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
        PortableJson message = jsonParser.parse("{}");
        message.put(MESSAGE_TYPE_FIELD, SYNCHRONIZE_PROXY_MSG);
        PortableJson body = jsonParser.parse("{}");
        body.put(PROXY_HANDLE_ID_FIELD, mapper.identifierForThing(new Thing<StorageProxy>(storageProxy)));
        body.put(PROXY_CALLBACK_FIELD, mapper.createMappingForThing(
            new Thing<Consumer<PortableJson>>(callback), /* requestedId= */ null));
        message.put(MESSAGE_BODY_FIELD, body);
        postMessage(message);
    }

    @Override
    public void Render(NativeParticle particle, String slotName, PortableJson content) {
        PortableJson message = jsonParser.parse("{}");
        message.put(MESSAGE_TYPE_FIELD, RENDER_MSG);
        PortableJson body = jsonParser.parse("{}");
        body.put(PARTICLE_FIELD, mapper.identifierForThing(new Thing<NativeParticle>(particle)));
        body.put(SLOT_NAME_FIELD, slotName);
        body.put(CONTENT_FIELD, content);
        message.put(MESSAGE_BODY_FIELD, body);
        postMessage(message);
    }

    private void postMessage(PortableJson message) {
        environment.sendMessageToArcs(
                    "{\"message\": \"pec\", \"id\": \"" + this.id +
                    "\", \"entity\": " + jsonParser.stringify(message) + "}", null);
    }
}
