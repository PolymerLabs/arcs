package arcs.api;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

public class PECInnerPortImpl implements PECInnerPort {
    private String id;
    private ShellApi shellApi;
    private ParticleExecutionContext pec;
    private ThingMapper mapper;
    private StorageProxyFactory storageProxyFactory;
    private PortableJsonParser jsonParser;

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
        String messageType = message.getString("messageType");
        PortableJson messageBody = message.getObject("messageBody");
        switch(messageType) {
            case "InstantiateParticle":
                ParticleSpec spec = ParticleSpec.fromJson(messageBody.getObject("spec"));
                PortableJson stores = messageBody.getObject("stores");
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
                mapper.establishThingMapping(messageBody.getString("identifier"), new Thing<NativeParticle>(particle));
                break;
            case "DefineHandle":
                String identifier = messageBody.getString("identifier");
                StorageProxy storageProxy = StorageProxyFactory.newProxy(
                    identifier,
                    TypeFactory.typeFromJson(messageBody.getObject("type")), messageBody.getString("name"), this);
                mapper.establishThingMapping(identifier, new Thing<StorageProxy>(storageProxy));
                break;
            case "SimpleCallback":
                // TODO: implement.
                break;
            default:
                throw new AssertionError("Unsupported message type: " + messageType);
        }
    }

    @Override
    public void InitializeProxy(StorageProxy storageProxy, Function<PortableJson, Void> callback) {
        PortableJson message = jsonParser.parse("{}");
        message.put("messageType", "InitializeProxy");
        PortableJson body = jsonParser.parse("{}");
        body.put("handle", mapper.identifierForThing(new Thing<StorageProxy>(storageProxy)));
        body.put("callback", mapper.createMappingForThing(
            new Thing<Function<PortableJson, Void>>(callback), /* requestedId= */ null));
        message.put("messageBody", body);
        postMessage(message);
    }

    @Override
    public void SynchronizeProxy(StorageProxy storageProxy, Function<PortableJson, Void> callback) {
        // TODO: Implement.
    }

    private void postMessage(PortableJson message) {
        message.put("id", this.id);
        shellApi.postMessage(jsonParser.stringify(message));
    }
}
