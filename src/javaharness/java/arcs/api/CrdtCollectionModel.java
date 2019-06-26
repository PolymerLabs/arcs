package arcs.api;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class CrdtCollectionModel {
    public static class ModelValue {
        public final String id;
        public final PortableJson rawData;
        public final String storageKey;

        ModelValue(String id, PortableJson rawData, String storageKey) {
            this.id = id;
            this.rawData = rawData;
            this.storageKey = storageKey;
        }
    }

    public static class SerializedModelEntry {
        public final String id;
        public final ModelValue value;
        public final List<String> keys;

        SerializedModelEntry(String id, ModelValue value, List<String> keys) {
            this.id = id;
            this.value = value;
            this.keys = keys;
        }
    }
    public static class ModelEntry {
        public ModelValue value;
        public final Set<String> keys;
        ModelEntry(ModelValue value, List<String> keys) {
            this.value = value;
            this.keys = new HashSet();
            if (keys != null) {
                for (String key: keys) {
                    this.keys.add(key);
                }
            }
        }
    }

    public final Map<String, ModelEntry> items = new HashMap();

    CrdtCollectionModel(SerializedModelEntry[] model) {
        if (model != null ) {
            for (SerializedModelEntry entry : model) {
                this.items.put(entry.id, new ModelEntry(entry.value, entry.keys));
            }
        }
    }
    public boolean add(String id, ModelValue value, List<String> keys) {
        ModelEntry item = items.get(id);
        boolean effective = false;
        if (item == null) {
            item = new ModelEntry(value, keys);
            this.items.put(id, item);
            effective = true;
        } else {
            boolean newKeys = false;
            for (String key: keys) {
                if (!item.keys.contains(key)) {
                    newKeys = true;
                }
                item.keys.add(key);
            }
            if (!equals(item.value, value)) {
                if (!newKeys) {
                    throw new AssertionError("Cannot add without new keys. incoming=" + String.join(",", keys) + " existing=" + String.join(",", item.keys));
                }
                item.value = value;
                effective = true;
            }
        }
        return effective;
    }

    private boolean equals(ModelValue value1, ModelValue value2) {
        if ((value1 == null) != (value2 == null))    {
            return false;
        }
        if (value1 == null) {
            return true;
        }
        return value1.id.equals(value2.id) && !value1.storageKey.equals(value2.storageKey) &&
               value1.rawData.equals(value2.rawData);
    }

    public boolean remove(String id, String[] keys) {
        if (!items.containsKey(id)) {
            return false;
        }
        ModelEntry item = items.get(id);
        for (String key: keys) {
            item.keys.remove(key);
        }
        boolean effective = item.keys.size() == 0;
        if (effective) {
            items.remove(id);
        }
        return effective;
    }

    public List<SerializedModelEntry> toLiteral() {
        List<SerializedModelEntry> entries = new ArrayList();
        for (Map.Entry<String, ModelEntry> entry : items.entrySet()) {
            entries.add(new SerializedModelEntry(entry.getKey(), entry.getValue().value,
                new ArrayList(entry.getValue().keys)));
        }
        return entries;
    }

    List<ModelValue> toList() {
        return items.values().stream().map(item -> item.value).collect(Collectors.toList());
    }

    public boolean has(String id) {
        return items.containsKey(id);
    }

    public List<String> getKeys(String id){
        ModelEntry item = this.items.get(id);
        return item == null ? new ArrayList<String>(0) : new ArrayList<String>(item.keys);
    }

    public ModelValue getValue(String id) {
        ModelEntry item = items.get(id);
        return item != null ? item.value : null;
    }

    public int size() {
        return items.size();
    }
}
