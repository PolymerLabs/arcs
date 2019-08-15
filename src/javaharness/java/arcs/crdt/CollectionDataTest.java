package arcs.crdt;

import java.util.Arrays;
import java.util.Objects;

// The set of tests copied from src/runtime/crdt/tests/crdt-collection-test.ts
// Please, keep in sync.

public class CollectionDataTest {
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

  public static void testInitiallyIsEmpty() {
    // initially is empty
    CRDTCollection<Data> set = new CRDTCollection<>();
    verifySize(set, 0);
  }

  public static void testTwoItemsSameActor() {
    // can add two different items from the same actor
    CRDTCollection<Data> set = new CRDTCollection<>();
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("me", 1), "me"));

    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("two"), VersionMap.of("me", 2), "me"));

    verifyIds(set, new String[] {"one", "two"});
  }

  public static void testSameValueTwoActors() {
    // can add the same value from two actors
    CRDTCollection<Data> set = new CRDTCollection<>();
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("me", 1), "me"));
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("them", 1), "them"));

    verifyIds(set, new String[] {"one"});
  }

  public static void testRejectAddsNotInSequence() {
    // rejects add operations not in sequence
    CRDTCollection<Data> set = new CRDTCollection<>();
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("me", 1), "me"));
    assert !set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("two"), VersionMap.of("me", 0), "me"));
    assert !set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("two"), VersionMap.of("me", 1), "me"));
    assert !set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("two"), VersionMap.of("me", 3), "me"));
  }

  public static void testRemoveItem() {
    // can remove an item
    CRDTCollection<Data> set = new CRDTCollection<>();
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("me", 1), "me"));
    verifySize(set, 1);
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.REMOVE, new Data("one"), VersionMap.of("me", 1), "me"));
    verifySize(set, 0);
  }

  public static void testRejectRemoveIfVersionMismatch() {
    // rejects remove operations if version mismatch
    CRDTCollection<Data> set = new CRDTCollection<>();
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("me", 1), "me"));
    assert !set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.REMOVE, new Data("one"), VersionMap.of("me", 2), "me"));
    assert !set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.REMOVE, new Data("one"), VersionMap.of("me", 0), "me"));
  }

  public static void testRejectRemoveNonexistent() {
    // rejects remove value not in collection
    CRDTCollection<Data> set = new CRDTCollection<>();
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("me", 1), "me"));
    assert !set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.REMOVE, new Data("two"), VersionMap.of("me", 1), "me"));
  }

  public static void testRejectRemoveTooOld() {
    // rejects remove version too old
    CRDTCollection<Data> set = new CRDTCollection<>();
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("me", 1), "me"));
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("two"), VersionMap.of("you", 1), "you"));
    // This succeeds because the op clock is up to date wrt to the value "one" (whose version is
    // me:1).
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.REMOVE, new Data("one"), VersionMap.of("me", 1), "them"));
    // This fails because the op clock is not up to date wrt to the actor "you" (whose version is
    // you:1).
    assert !set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.REMOVE, new Data("two"), VersionMap.of("me", 1), "them"));
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

  private static void verifySize(CRDTCollection<Data> set, int expectedSize) {
    assert ((RawCollection<Data>) set.getParticleView()).size() == expectedSize
        : "Expected size "
            + expectedSize
            + ", but got size "
            + ((RawCollection<Data>) set.getParticleView()).size();
  }

  private static void verifyIds(CRDTCollection<Data> set, String[] expectedIds) {
    String[] setIds =
        ((RawCollection<Data>) set.getParticleView())
            .stream().map(Data::getId).toArray(String[]::new);
    assert Arrays.equals(setIds, expectedIds)
        : "Expected ["
            + String.join(",", expectedIds)
            + "], but got ["
            + String.join(",", setIds)
            + "]";
  }

  private static boolean collectionDeepEquals(
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

  private static boolean changeDeepEquals(
      CollectionChange<Data> change1, CollectionChange<Data> change2) {
    assert change1.changeType == ChangeType.MODEL : "unsupported change type comparison";
    return change1.changeType.equals(change2.changeType)
        && collectionDeepEquals(
            (CollectionData<Data>) change1.modelPostChange.get(),
            (CollectionData<Data>) change2.modelPostChange.get());
  }
}

// Note: if/when adding more tests to this file, please, also update crdt-collection-test.ts
