package arcs.android.impl;

import arcs.crdt.CollectionData;
import arcs.crdt.CollectionOperation;
import arcs.crdt.CRDTCollection;
import arcs.crdt.CrdtTestHelper;
import arcs.crdt.CrdtTestHelper.Data;
import arcs.crdt.RawCollection;
import arcs.crdt.VersionMap;
import java.util.Arrays;
import java.util.Objects;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

// The set of tests copied from src/runtime/crdt/tests/crdt-collection-test.ts
// Please, keep in sync.

@SuppressWarnings("unchecked")
@RunWith(JUnit4.class)
public class CrdtTest {
  @Test
  public void testInitiallyIsEmpty() {
    // initially is empty
    CRDTCollection<Data> set = new CRDTCollection<>();
    verifySize(set, 0);
  }

  @Test
  public void testTwoItemsSameActor() {
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

  @Test
  public void testSameValueTwoActors() {
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

  @Test
  public void testRejectAddsNotInSequence() {
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

  @Test
  public void testRemoveItem() {
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

  @Test
  public void testRejectRemoveIfVersionMismatch() {
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

  @Test
  public void testRejectRemoveNonexistent() {
    // rejects remove value not in collection
    CRDTCollection<Data> set = new CRDTCollection<>();
    assert set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.ADD, new Data("one"), VersionMap.of("me", 1), "me"));
    assert !set.applyOperation(
        new CollectionOperation<>(
            CollectionOperation.Type.REMOVE, new Data("two"), VersionMap.of("me", 1), "me"));
  }

  @Test
  public void testRejectRemoveTooOld() {
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

  @Test
  public void testMergeModels() {
    // This test cannot be moved, because it heavily uses package private methods and data members.
    // TODO: refactor?
    CrdtTestHelper.testMergeModels();
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
}

// Note: if/when adding more tests to this file, please, also update crdt-collection-test.ts
