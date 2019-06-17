package arcs.api;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class ThingMapper {
    private String prefix;
    private int nextIdentifier;
    private final Map<String, Thing> idMap;
    private final Map<Thing, String> reverseIdMap;

    ThingMapper(String prefix) {
        this.prefix = prefix;
        this.nextIdentifier = 0;
        idMap = new HashMap();
        reverseIdMap = new HashMap();
    }

    private String newIdentifier(){
        return this.prefix + (this.nextIdentifier++);
    }

    public String createMappingForThing(Thing thing, String requestedId) {
        if (this.findMappingForThing(thing).isPresent()) {
            throw new AssertionError("Cannot create mapping for thing with id: " + thing);
        }
        String id = null;
        if (requestedId != null) {
            id = requestedId;
        } else {
            // Note: Omitted `apiChannelMappingId` that is found in TS version, but only used for PEH.
            id = this.newIdentifier();
        }
        if (this.idMap.containsKey(id)) {
            throw new AssertionError((requestedId != null ? "requestedId" : "newIdentifier()") + " already in use");
        }
        this.establishThingMapping(id, thing);
        return id;
    }

    public Thing thingForIdentifier(String id) {
        if (!this.idMap.containsKey(id)) {
            throw new AssertionError("Missing id: " + id);
        }
        return this.idMap.get(id);
    }

    public String maybeCreateMappingForThing(Thing thing) {
        return this.findMappingForThing(thing)
            .orElseGet(() -> this.createMappingForThing(thing, null));
    }

    public void establishThingMapping(String id, Thing thing) {
        // TODO: handle async and arrays, see establishThingMapping in api-channel.ts
        this.idMap.put(id, thing);
        this.reverseIdMap.put(thing, id);
    }

    public String identifierForThing(Thing thing) {
        return this.findMappingForThing(thing)
            .orElseThrow(() -> new AssertionError("Missing thing with id: " + thing));
    }

    private Optional<String> findMappingForThing(Thing thing) {
        return this.reverseIdMap.entrySet().stream().filter(entry -> entry.getKey().get() == thing.get())
            .findFirst().flatMap(x -> Optional.of(x.getValue()));
    }
}
