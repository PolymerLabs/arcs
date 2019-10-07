package arcs.crdt;

interface CRDTModel<T extends CRDTTypeRecord> {
  MergeResult<?> merge(CRDTData other);

  boolean applyOperation(CRDTOperation op);

  CRDTData getData();

  CRDTConsumerType getParticleView();
}
