package arcs.crdt;

class MergeResult<T extends CRDTTypeRecord> {
  CRDTChange<T> modelChange;
  CRDTChange<T> otherChange;

  MergeResult(CRDTChange<T> modelChange, CRDTChange<T> otherChange) {
    this.modelChange = modelChange;
    this.otherChange = otherChange;
  }
}
