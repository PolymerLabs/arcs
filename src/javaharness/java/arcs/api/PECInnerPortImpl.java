package arcs.api;

import javax.inject.Inject;
import java.util.HashMap;
import java.util.Map;

public class PECInnerPortImpl implements PECInnerPort {
    private ShellApi shellApi;
    private ParticleExecutionContext pec;
    private ThingMapper mapper;
    private StorageProxyFactory storageProxyFactory;

    @Inject
    public PECInnerPortImpl(ShellApi shellApi, ParticleExecutionContext pec) {
      this.shellApi = shellApi;
      this.pec = pec;
      this.mapper = new ThingMapper("j");
    }

    @Override
    public void handleMessage(PortableJson message) {
        String messageType = message.getString("messageType");
        PortableJson messageBody = message.getObject("messageBody");
        String identifier = messageBody.getString("identifier");
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
                mapper.establishThingMapping(identifier, new Thing<NativeParticle>(particle));
                break;
            case "DefineHandle":
                StorageProxy storageProxy =
                StorageProxyFactory.newProxy(
                    identifier,
                    TypeFactory.typeFromJson(messageBody.getObject("type")), messageBody.getString("name"), this);
                mapper.establishThingMapping(identifier, new Thing<StorageProxy>(storageProxy));
                break;
            default:
                throw new AssertionError("Unsupported message type: " + messageType);
        }
    }

    @Override
    public void InitializeProxy(StorageProxy storageProxy) {
        // TODO: Implement.
        shellApi.postMessage("InitializeProxy: " + storageProxy.id);
    }

    @Override
    public void SynchronizeProxy(StorageProxy storageProxy) {
        // TODO: Implement.
        shellApi.postMessage("SynchronizeProxy: " + storageProxy.id);
    }
}
