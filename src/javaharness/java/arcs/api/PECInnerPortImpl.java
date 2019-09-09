package arcs.api;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.logging.Logger;

public class PECInnerPortImpl implements PECInnerPort {
  private static final String MESSAGE_TYPE_FIELD = "messageType";
  private static final String MESSAGE_BODY_FIELD = "messageBody";
  private static final String MESSAGE_PEC_ID_FIELD = "id";
  private static final String INDENTIFIER_FIELD = "identifier";
  private static final String INSTANTIATE_PARTICLE_MSG = "InstantiateParticle";
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

  private static final Logger logger = Logger.getLogger(PECInnerPortImpl.class.getName());

  private final String id;
  private final ArcsEnvironment environment;
  private final ParticleExecutionContext pec;
  private final ThingMapper mapper;
  private final PortableJsonParser jsonParser;
  private final PortablePromiseFactory promiseFactory;
  private final IdGenerator idGenerator;

  public PECInnerPortImpl(
      String id,
      String sessionId,
      ArcsEnvironment environment,
      ParticleExecutionContext pec,
      PortableJsonParser jsonParser,
      PortablePromiseFactory promiseFactory) {
    this.id = id;
    this.environment = environment;
    this.pec = pec;
    this.mapper = new ThingMapper("j");
    this.jsonParser = jsonParser;
    this.promiseFactory = promiseFactory;
    this.idGenerator = new IdGenerator(sessionId);
  }

  @SuppressWarnings("unchecked")
  @Override
  public void handleMessage(PortableJson message) {
    String messageType = message.getString(MESSAGE_TYPE_FIELD);
    PortableJson messageBody = message.getObject(MESSAGE_BODY_FIELD);
    switch (messageType) {
      case INSTANTIATE_PARTICLE_MSG:
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
          Particle particle = pec.instantiateParticle(particleId, spec, proxies, idGenerator);
          if (particle == null) {
            // TODO: improve error handling.
            throw new AssertionError("Cannot instantiate particle " + spec.name);
          }

          mapper.establishThingMapping(
              messageBody.getString(INDENTIFIER_FIELD), new Thing<>(particle));

          // TODO: implement proper capabilities.
          particle.setOutput((content) -> output(particle, content));
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
                jsonParser,
                promiseFactory);
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
          logger.info("Unexpected StartRender call for particle " + particle.getName() + " slot " + slotName);
          break;
        }
      case STOP_RENDER_MSG:
        {
          String particleId = messageBody.getString(PARTICLE_FIELD);
          Particle particle = mapper.thingForIdentifier(particleId).getParticle();
          String slotName = messageBody.getString(SLOT_NAME_FIELD);
          logger.info("Unexpected StopRender call for particle " + particle.getName() + " slot " + slotName);
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

  @Override
  public void initializeProxy(StorageProxy storageProxy, Consumer<PortableJson> callback) {
    PortableJson message = constructMessage(INITIALIZE_PROXY_MSG);
    PortableJson body = message.getObject(MESSAGE_BODY_FIELD);
    body.put(PROXY_HANDLE_ID_FIELD, mapper.identifierForThing(new Thing<>(storageProxy)));
    body.put(
        PROXY_CALLBACK_FIELD,
        mapper.createMappingForThing(new Thing<>(callback), /* requestedId= */ null));
    postMessage(message);
  }

  @Override
  public void synchronizeProxy(StorageProxy storageProxy, Consumer<PortableJson> callback) {
    PortableJson message = constructMessage(SYNCHRONIZE_PROXY_MSG);
    PortableJson body = message.getObject(MESSAGE_BODY_FIELD);
    body.put(PROXY_HANDLE_ID_FIELD, mapper.identifierForThing(new Thing<>(storageProxy)));
    body.put(
        PROXY_CALLBACK_FIELD,
        mapper.createMappingForThing(new Thing<>(callback), /* requestedId= */ null));
    postMessage(message);
  }

  @Override
  public void handleStore(
      StorageProxy storageProxy,
      Consumer<PortableJson> callback,
      PortableJson data,
      String particleId) {
    postMessage(constructHandleMessage(HANDLE_STORE_MSG, storageProxy, callback, data, particleId));
  }

  @Override
  public void handleToList(StorageProxy storageProxy, Consumer<PortableJson> callback) {
    postMessage(
        constructHandleMessage(
            HANDLE_TO_LIST_MSG, storageProxy, callback, /* data= */ null, /* particleId= */ null));
  }

  @Override
  public void handleRemove(
      StorageProxy storageProxy,
      Consumer<PortableJson> callback,
      PortableJson data,
      String particleId) {
    postMessage(
        constructHandleMessage(HANDLE_REMOVE_MSG, storageProxy, callback, data, particleId));
  }

  @Override
  public void handleRemoveMultiple(
      StorageProxy storageProxy,
      Consumer<PortableJson> callback,
      PortableJson data,
      String particleId) {
    postMessage(
        constructHandleMessage(
            HANDLE_REMOVE_MULTIPLE_MSG, storageProxy, callback, data, particleId));
  }

  @Override
  public void output(Particle particle, PortableJson content) {
    PortableJson message = constructMessage(OUTPUT_MSG);
    PortableJson body = message.getObject(MESSAGE_BODY_FIELD);
    body.put(PARTICLE_FIELD, mapper.identifierForThing(new Thing<>(particle)));
    body.put(CONTENT_FIELD, content);
    postMessage(message);
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
    environment.sendMessageToArcs(jsonParser.stringify(json), null);
  }
}
