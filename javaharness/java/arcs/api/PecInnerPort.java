package arcs.api;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Consumer;
import java.util.logging.Logger;

public class PecInnerPort {

  private static final String MESSAGE_TYPE_FIELD = "messageType";
  private static final String MESSAGE_BODY_FIELD = "messageBody";
  private static final String MESSAGE_PEC_ID_FIELD = "id";
  private static final String INDENTIFIER_FIELD = "identifier";
  private static final String INSTANTIATE_PARTICLE_MSG = "InstantiateParticle";
  private static final String REINSTANTIATE_PARTICLE_MSG = "ReinstantiateParticle";
  private static final String PARTICLE_SPEC_FIELD = "spec";
  private static final String PARTICLE_STORES_FIELD = "stores";
  private static final String PARTICLE_ID_FIELD = "id";
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
  private static final String OUTPUT_MSG = "Output";
  private static final String CONTENT_FIELD = "content";
  private static final String MESSAGE_PEC_MESSAGE_KEY = "message";
  private static final String MESSAGE_PEC_PEC_VALUE = "pec";
  private static final String MESSAGE_PEC_ENTITY_KEY = "entity";
  private static final String HANDLE_STORE_MSG = "HandleStore";
  private static final String HANDLE_PARTICLE_ID_FIELD = "particleId";
  private static final String HANDLE_TO_LIST_MSG = "HandleToList";
  private static final String HANDLE_REMOVE_MULTIPLE_MSG = "HandleRemoveMultiple";
  private static final String HANDLE_REMOVE_MSG = "HandleRemove";

  private static final Logger logger = Logger.getLogger(PecInnerPort.class.getName());

  private final String id;
  private final ArcsMessageSender arcsMessageSender;
  private final ThingMapper mapper;
  private final PortableJsonParser jsonParser;
  private final IdGenerator idGenerator;
  private final HandleFactory handleFactory;

  public PecInnerPort(
      String id,
      String sessionId,
      ArcsMessageSender arcsMessageSender,
      PortableJsonParser jsonParser,
      HandleFactory handleFactory) {
    this.id = id;
    this.arcsMessageSender = arcsMessageSender;
    this.mapper = new ThingMapper("j");
    this.jsonParser = jsonParser;
    this.handleFactory = handleFactory;
    this.idGenerator = sessionId == null ? IdGenerator.newSession() : new IdGenerator(sessionId);
  }

  public String getId() {
    return id;
  }

  @SuppressWarnings("unchecked")
  public void onReceivePecMessage(PortableJson message) {
    String messageType = message.getString(MESSAGE_TYPE_FIELD);
    PortableJson messageBody = message.getObject(MESSAGE_BODY_FIELD);
    switch (messageType) {
      case INSTANTIATE_PARTICLE_MSG:
      case REINSTANTIATE_PARTICLE_MSG:
        {
          ParticleSpec spec = ParticleSpec.fromJson(messageBody.getObject(PARTICLE_SPEC_FIELD));
          PortableJson stores = messageBody.getObject(PARTICLE_STORES_FIELD);
          Map<String, StorageProxy> proxies = new HashMap<>();
          stores.forEach(
              proxyName -> {
                String proxyId = stores.getString(proxyName);
                proxies.put(proxyName, mapper.thingForIdentifier(proxyId).getStorageProxy());
              });

          String particleId = messageBody.getString(PARTICLE_ID_FIELD);
          if (mapper.hasThingForIdentifier(particleId)) {
           // Non-factory instantiation of a Particle.
            Particle particle = mapper.thingForIdentifier(particleId).getParticle();
            initializeParticle(particle, spec, proxies, idGenerator);
            // TODO: implement proper capabilities.
            particle.setOutput((content) -> output(particle, content));
          } else {
            throw new RuntimeException("Unexpected instantiate call for " + particleId);
          }

          break;
        }
      case DEFINE_HANDLE_MSG:
        String identifier = messageBody.getString(INDENTIFIER_FIELD);
        StorageProxy storageProxy =
            StorageProxyFactory.newProxy(
                identifier,
                TypeFactory.typeFromJson(messageBody.getObject(HANDLE_TYPE_FIELD)),
                messageBody.getString(HANDLE_NAME_FIELD),
                this,
                jsonParser);
        mapper.establishThingMapping(identifier, new Thing<>(storageProxy));
        break;
      case SIMPLE_CALLBACK_MSG:
        String callbackId = messageBody.getString(CALLBACK_FIELD);
        Consumer<PortableJson> callback =
            (Consumer<PortableJson>) mapper.thingForIdentifier(callbackId).getConsumer();
        PortableJson data = messageBody.getObject(DATA_FIELD);
        callback.accept(data);
        break;
      case START_RENDER_MSG:
        {
          String particleId = messageBody.getString(PARTICLE_FIELD);
          Particle particle = mapper.thingForIdentifier(particleId).getParticle();
          String slotName = messageBody.getString(SLOT_NAME_FIELD);
          logger.info(
              "Unexpected StartRender call for particle "
              + particle.getName() + " slot " + slotName
              );
          break;
        }
      case STOP_RENDER_MSG:
        {
          String particleId = messageBody.getString(PARTICLE_FIELD);
          Particle particle = mapper.thingForIdentifier(particleId).getParticle();
          String slotName = messageBody.getString(SLOT_NAME_FIELD);
          logger.info(
              "Unexpected StopRender call for particle "
              + particle.getName() + " slot " + slotName
              );
          break;
        }
      case STOP_MSG:
      case DEV_TOOLS_CONNECTED_MSG:
        // TODO: not supported yet.
        break;
      default:
        throw new AssertionError("Unsupported message type: " + messageType);
    }
  }

  public void mapParticle(Particle particle) {
    mapper.establishThingMapping(particle.getId(), new Thing<>(particle));
  }

  public void initializeProxy(StorageProxy storageProxy, Consumer<PortableJson> callback) {
    PortableJson message = constructMessage(INITIALIZE_PROXY_MSG);
    PortableJson body = message.getObject(MESSAGE_BODY_FIELD);
    body.put(PROXY_HANDLE_ID_FIELD, mapper.identifierForThing(new Thing<>(storageProxy)));
    body.put(
        PROXY_CALLBACK_FIELD,
        mapper.createMappingForThing(new Thing<>(callback), /* requestedId= */ null));
    postMessage(message);
  }

  public void synchronizeProxy(StorageProxy storageProxy, Consumer<PortableJson> callback) {
    PortableJson message = constructMessage(SYNCHRONIZE_PROXY_MSG);
    PortableJson body = message.getObject(MESSAGE_BODY_FIELD);
    body.put(PROXY_HANDLE_ID_FIELD, mapper.identifierForThing(new Thing<>(storageProxy)));
    body.put(
        PROXY_CALLBACK_FIELD,
        mapper.createMappingForThing(new Thing<>(callback), /* requestedId= */ null));
    postMessage(message);
  }

  public void handleStore(
      StorageProxy storageProxy,
      Consumer<PortableJson> callback,
      PortableJson data,
      String particleId) {
    postMessage(constructHandleMessage(HANDLE_STORE_MSG, storageProxy, callback, data, particleId));
  }

  public void handleToList(StorageProxy storageProxy, Consumer<PortableJson> callback) {
    postMessage(
        constructHandleMessage(
            HANDLE_TO_LIST_MSG, storageProxy, callback, /* data= */ null, /* particleId= */ null));
  }

  public void handleRemove(
      StorageProxy storageProxy,
      Consumer<PortableJson> callback,
      PortableJson data,
      String particleId) {
    postMessage(
        constructHandleMessage(HANDLE_REMOVE_MSG, storageProxy, callback, data, particleId));
  }

  public void handleRemoveMultiple(
      StorageProxy storageProxy,
      Consumer<PortableJson> callback,
      PortableJson data,
      String particleId) {
    postMessage(
        constructHandleMessage(
            HANDLE_REMOVE_MULTIPLE_MSG, storageProxy, callback, data, particleId));
  }

  public void output(Particle particle, PortableJson content) {
    PortableJson message = constructMessage(OUTPUT_MSG);
    PortableJson body = message.getObject(MESSAGE_BODY_FIELD);
    body.put(PARTICLE_FIELD, mapper.identifierForThing(new Thing<>(particle)));
    body.put(CONTENT_FIELD, content);
    postMessage(message);
  }

  private void initializeParticle(
    Particle particle,
    ParticleSpec spec,
    Map<String, StorageProxy> proxies,
    IdGenerator idGenerator) {
    Objects.requireNonNull(particle).setSpec(spec);
    particle.setJsonParser(jsonParser);

    Map<String, Handle> handleMap = new HashMap<>();
    Map<Handle, StorageProxy> registerMap = new HashMap<>();

    for (String proxyName : proxies.keySet()) {
      StorageProxy storageProxy = proxies.get(proxyName);
      Handle handle =
        this.handleFactory.handleFor(
          storageProxy,
          idGenerator,
          proxyName,
          particle.getId(),
          spec.isInput(proxyName),
          spec.isOutput(proxyName));
      handleMap.put(proxyName, handle);
      registerMap.put(handle, storageProxy);
    }

    particle.setHandles(handleMap);
    for (Handle handle : registerMap.keySet()) {
      StorageProxy storageProxy = registerMap.get(handle);
      storageProxy.register(particle, handle);
    }
  }

  private PortableJson constructMessage(String messageType) {
    PortableJson message = jsonParser.emptyObject();
    message.put(MESSAGE_TYPE_FIELD, messageType);
    message.put(MESSAGE_BODY_FIELD, jsonParser.emptyObject());
    return message;
  }

  private PortableJson constructHandleMessage(
      String messageType,
      StorageProxy storageProxy,
      Consumer<PortableJson> callback,
      PortableJson data,
      String particleId) {
    PortableJson message = constructMessage(messageType);
    PortableJson body = message.getObject(MESSAGE_BODY_FIELD);
    body.put(PROXY_HANDLE_ID_FIELD, mapper.identifierForThing(new Thing<>(storageProxy)));
    body.put(
        PROXY_CALLBACK_FIELD,
        mapper.createMappingForThing(new Thing<>(callback), /* requestedId= */ null));
    if (data != null) {
      body.put(DATA_FIELD, data);
    }
    if (particleId != null) {
      body.put(HANDLE_PARTICLE_ID_FIELD, particleId);
    }
    return message;
  }

  private void postMessage(PortableJson message) {
    PortableJson json = jsonParser.emptyObject();
    json.put(MESSAGE_PEC_MESSAGE_KEY, MESSAGE_PEC_PEC_VALUE);
    json.put(MESSAGE_PEC_ID_FIELD, this.id);
    json.put(MESSAGE_PEC_ENTITY_KEY, message);
    arcsMessageSender.sendMessageToArcs(jsonParser.stringify(json));
  }
}
