package arcs.crdt;

import java.util.Optional;

class CRDTChange<T extends CRDTTypeRecord> {
  ChangeType changeType;
  Optional<CRDTOperation[]> operations; // present, if changeType is OPERATIONS
  Optional<CRDTData> modelPostChange; // present, if changeType is MODEL
}
