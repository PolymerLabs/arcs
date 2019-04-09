type RawCollection<T> = Set<T>;
type RawSingleton<T> = T;
type RawCount = number;

type VersionMap = Map<string, number>;
type RawCRDTCollectionValue<T> = { value: T, clock: VersionMap };
type RawCRDTCollection<T> = { values: Set<{ value: T, clock: VersionMap }>, version: VersionMap };
type RawCRDTSingleton<T> = { values: Set<{ value: T, clock: VersionMap }>, version: VersionMap };
type RawCRDTCount = { values: Map<string, number>, version: VersionMap };

enum CRDTCollectionOpTypes { CollectionAdd, CollectionRemove }
type CRDTCollectionOperation<T> = { type: CRDTCollectionOpTypes.CollectionAdd, added: RawCRDTCollectionValue<T>[] } |
                                  { type: CRDTCollectionOpTypes.CollectionRemove, removed: T[] };

type CRDTSingletonOperation<T> = { from: T | null, to: T | null, actor: string };

enum CRDTCountOpTypes { CountIncrement, CountSet }
type CRDTCountOperation = { type: CRDTCountOpTypes.CountSet, value: number, actor: string } | 
                          { type: CRDTCountOpTypes.CountIncrement, actor: string };

interface CRDTChange<Ops, Model> {
  changeIsOperations: boolean; // can change be expressed as ops?
  operations?: Ops[];
  modelPostChange?: Model;
}

type CRDTCollectionChange<T> = CRDTChange<CRDTCollectionOperation<T>, RawCRDTCollection<T>>;
type CRDTSingletonChange<T> = CRDTChange<CRDTSingletonOperation<T>, RawCRDTSingleton<T>>;
type CRDTCountChange = CRDTChange<CRDTCountOperation, RawCRDTCount>;

interface CRDTModel<Ops, Model> {
  merge(other: CRDTModel<Ops, Model>): {modelChange: CRDTChange<Ops, Model>, otherChange: CRDTChange<Ops, Model>} | null; // null implies no change
  applyOperation(op: Ops): boolean; // false implies operation out of order and application failed
  getRawData(): Model; //
}

type CRDTCollectionModel<T> = CRDTModel<CRDTCollectionOperation<T>, RawCRDTCollection<T>>;
type CRDTSingletonModel<T> = CRDTModel<CRDTSingletonOperation<T>, RawCRDTSingleton<T>>;
type CRDTCountModel = CRDTModel<CRDTCountOperation, RawCRDTCount>;

class CRDTCount implements CRDTCountModel {
  private model: RawCRDTCount = {values: new Map(), version: new Map()};

  merge(other: CRDTCountModel) {
    const otherChanges: CRDTCountOperation[] = [];
    const thisChanges: CRDTCountOperation[] = [];

    const otherRaw = other.getRawData();    
    for (const key in otherRaw.values.keys()) {
      const thisValue = this.model.values.get(key) || 0;
      const otherValue = otherRaw.values.get(key) || 0;
      if (thisValue > otherValue) {
        otherChanges.push({type: CRDTCountOpTypes.CountSet, value: thisValue, actor: key});
      } else if (otherValue > thisValue) {
        thisChanges.push({type: CRDTCountOpTypes.CountSet, value: otherValue, actor: key});
        this.model.values.set(key, otherValue);
      }
    }
    
    for (const key in this.model.values.keys()) {
      if (otherRaw.values.has(key)) {
        continue;
      }
      otherChanges.push({type: CRDTCountOpTypes.CountSet, value: this.model.values.get(key), actor: key});
    }

    return {modelChange: {changeIsOperations: true, ops: thisChanges}, otherChange: {changeIsOperations: true, ops: otherChanges}};
  }

  applyOperation(op: CRDTCountOperation) {
    let value: number;
    if (op.type == CRDTCountOpTypes.CountSet) {
      if (op.value < 0) {
        return false;
      }
      if (this.model.values.has(op.actor) && this.model.values.get(op.actor) > op.value) {
        return false;
      }
      value = op.value;
    } else {
      value = (this.model.values.get(op.actor) || 0) + 1;
    }

    this.model.values.set(op.actor, value);
    this.model.version.set(op.actor, (this.model.version.get(op.actor) || 0) + 1);
    return true;
  }

  getRawData() {
    return this.model;
  }
}