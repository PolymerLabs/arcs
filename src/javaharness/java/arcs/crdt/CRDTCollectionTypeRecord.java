package arcs.crdt;

class CRDTCollectionTypeRecord<T extends Referenceable> extends CRDTTypeRecord {
  CollectionData<T> data;
  CollectionOperation<T> operation;
  RawCollection<T> consumerType;
}
