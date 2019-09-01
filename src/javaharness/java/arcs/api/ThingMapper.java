package arcs.api;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class ThingMapper {
  private String prefix;
  private int nextIdentifier;
  // TODO: consider using BiMap instead.
  private final Map<String, Thing<?>> idMap;
  private final Map<Thing<?>, String> reverseIdMap;

  ThingMapper(String prefix) {
    this.prefix = prefix;
    nextIdentifier = 0;
    idMap = new HashMap<>();
    reverseIdMap = new HashMap<>();
  }

  private String newIdentifier() {
    return prefix + nextIdentifier++;
  }

  public String createMappingForThing(Thing<?> thing, String requestedId) {
    if (findMappingForThing(thing).isPresent()) {
      throw new AssertionError("Cannot create mapping for thing with id: " + thing);
    }
    String id;
    // Note: Omitted `apiChannelMappingId` that is found in TS version, but only used for PEH.
    id = Optional.ofNullable(requestedId).orElseGet(this::newIdentifier);
    if (idMap.containsKey(id)) {
      throw new AssertionError(
          (requestedId != null ? "requestedId" : "newIdentifier()") + " already in use");
    }
    establishThingMapping(id, thing);
    return id;
  }

  public Thing<?> thingForIdentifier(String id) {
    try {
      return Optional.ofNullable(idMap.get(id))
          .orElseThrow(() -> new AssertionError("Missing id: " + id));
    } catch (Throwable e) {
      throw new RuntimeException(e);
    }
  }

  public String maybeCreateMappingForThing(Thing<?> thing) {
    return findMappingForThing(thing).orElseGet(() -> createMappingForThing(thing, null));
  }

  public void establishThingMapping(String id, Thing<?> thing) {
    // TODO: handle async and arrays, see establishThingMapping in api-channel.ts
    idMap.put(id, thing);
    reverseIdMap.put(thing, id);
  }

  public String identifierForThing(Thing<?> thing) {
    try {
      return findMappingForThing(thing)
          .orElseThrow(() -> new AssertionError("Missing thing with id: " + thing));
    } catch (Throwable throwable) {
      throw new RuntimeException(throwable);
    }
  }

  private Optional<String> findMappingForThing(Thing<?> thing) {
    return Optional.ofNullable(reverseIdMap.get(thing));
  }
}
