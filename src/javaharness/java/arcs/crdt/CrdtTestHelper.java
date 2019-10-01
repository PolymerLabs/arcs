package arcs.crdt;

import java.util.Objects;

@SuppressWarnings("unchecked")
public class CrdtTestHelper {
  public static class Data implements Referenceable {
    public final String id;

    public Data(String id) {
      this.id = id;
    }

    @Override
    public String getId() {
      return id;
    }

    @Override
    public boolean equals(Object other) {
      return this.id.equals(((Data) other).id);
    }

    @Override
    public int hashCode() {
      return this.id.hashCode();
    }
  }

  public static void testMergeModels() {
    // can merge two models
    CRDTCollection<Data> set1 = new CRDTCollection<>();
    assert set1.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("me", 1), "me"));
    assert set1.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("two"), VersionMap.of("me", 2), "me"));
    CRDTCollection<Data> set2 = new CRDTCollection<>();
    assert set2.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("three"), VersionMap.of("you", 1), "you"));
    assert set2.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("you", 2), "you"));
    MergeResult<?> result1 = set1.merge(set2.getData());

    CollectionData<Data> expectedSet1 = new CollectionData<>();
    expectedSet1.values.put(
        "one", new VersionedValue<>(new Data("one"), VersionMap.of("me", 1, "you", 2)));
    expectedSet1.values.put("two", new VersionedValue<>(new Data("two"), VersionMap.of("me", 2)));
    expectedSet1.values.put(
        "three", new VersionedValue<>(new Data("three"), VersionMap.of("you", 1)));
    expectedSet1.version = VersionMap.of("you", 2, "me", 2);
    CollectionChange<Data> modelChange1 = (CollectionChange<Data>) result1.modelChange;
    assert modelChange1.changeType == ChangeType.MODEL
        : "modelChange1.changeType should be ChangeType.MODEL";
    assert collectionDeepEquals(
            (CollectionData<Data>) modelChange1.modelPostChange.get(), expectedSet1)
        : "Unexpected merge model change (1).";
    assert changeDeepEquals(modelChange1, (CollectionChange<Data>) result1.otherChange)
        : "modelChange1 must be equal otherChange1";

    // Test removes also work in merge.
    set1.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.REMOVE,
            new Data("one"),
            VersionMap.of("me", 2, "you", 2),
            "me"));

    MergeResult<?> result2 = set1.merge(set2.getData());
    CollectionData<Data> expectedSet2 = new CollectionData<>();
    expectedSet2.values.put("two", new VersionedValue<>(new Data("two"), VersionMap.of("me", 2)));
    expectedSet2.values.put(
        "three", new VersionedValue<>(new Data("three"), VersionMap.of("you", 1)));
    expectedSet2.version = VersionMap.of("you", 2, "me", 2);
    CollectionChange<Data> modelChange2 = (CollectionChange<Data>) result2.modelChange;
    assert modelChange2.changeType == ChangeType.MODEL
        : "modelChange2.changeType should be ChangeType.MODEL";
    assert collectionDeepEquals(
            (CollectionData<Data>) modelChange2.modelPostChange.get(), expectedSet2)
        : "Unexpected merge model change (2).";
    assert changeDeepEquals(modelChange2, (CollectionChange<Data>) result2.otherChange)
        : "modelChange2 must be equal otherChange2";
  }

  public static boolean collectionDeepEquals(
      CollectionData<Data> set1, CollectionData<Data> set2) {
    return Objects.deepEquals(set1.version, set2.version)
        && Objects.deepEquals(set1.values.keySet(), set2.values.keySet())
        && set1.values.entrySet().stream()
            .allMatch(
                entry -> {
                  VersionedValue<Data> v2 = set2.values.get(entry.getKey());
                  return Objects.deepEquals(entry.getValue().value, v2.value)
                      && Objects.deepEquals(entry.getValue().version, v2.version);
                });
  }

  public static boolean changeDeepEquals(
      CollectionChange<Data> change1, CollectionChange<Data> change2) {
    assert change1.changeType == ChangeType.MODEL : "unsupported change type comparison";
    return change1.changeType.equals(change2.changeType)
        && collectionDeepEquals(
            (CollectionData<Data>) change1.modelPostChange.get(),
            (CollectionData<Data>) change2.modelPostChange.get());
  }
}
