package arcs.crdt;

import java.util.HashMap;
import java.util.Optional;
import java.util.Map;

// Classes and interfaces copied from src/runtime/crdt/crdt.ts
class VersionMap extends HashMap<String, Integer> {}

interface CRDTOperation {}

class CRDTData {
  VersionMap version;
}

interface CRDTConsumerType {}

class CRDTTypeRecord {
  CRDTData data;
  CRDTOperation operation;
  CRDTConsumerType consumerType;
}

class MergeResult<T extends CRDTTypeRecord> {
  CRDTChange<T> modelChange;
  CRDTChange<T> otherChange;
  MergeResult(CRDTChange<T> modelChange, CRDTChange<T> otherChange) {
    this.modelChange = modelChange;
    this.otherChange = otherChange;
  }
}

enum ChangeType { OPERATIONS, MODEL }

class CRDTChange<T extends CRDTTypeRecord> {
  ChangeType changeType;
  Optional<CRDTOperation[]> operations; // present, if changeType is OPERATIONS
  Optional<CRDTData> modelPostChange; // present, if changeType is MODEL
};

interface CRDTModel<T extends CRDTTypeRecord> {
  MergeResult merge(CRDTData other);

  boolean applyOperation(CRDTOperation op);
  CRDTData getData();
  CRDTConsumerType getParticleView();
}