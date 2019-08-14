package arcs.crdt;

interface CollectionModel<T extends Referenceable> extends CRDTModel<CRDTCollectionTypeRecord<T>> {}
