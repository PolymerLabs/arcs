#include "src/wasm/cpp/arcs.h"
#include "src/wasm/cpp/tests/entities.h"

using arcs::internal::Accessor;

class SingletonApiTest : public AbstractSingletonApiTest {
public:
  void fireEvent(const std::string& slot_name, const std::string& handler, const arcs::Dictionary& eventData) override {
    if (handler == "case1") {
      outHandle_.clear();
      ioHandle_.clear();
    } else if (handler == "case2") {
      arcs::SingletonApiTest_OutHandle d = arcs::clone_entity(inHandle_.get());
      d.set_num(d.num() * 2);
      outHandle_.set(d);
    } else if (handler == "case3") {
      arcs::SingletonApiTest_IoHandle d = arcs::clone_entity(ioHandle_.get());
      d.set_num(d.num() * 3);
      ioHandle_.set(d);
    }
  }
};

DEFINE_PARTICLE(SingletonApiTest)


class CollectionApiTest : public AbstractCollectionApiTest {
public:
  void fireEvent(const std::string& slot_name, const std::string& handler, const arcs::Dictionary& eventData) override {
    if (handler == "case1") {
      outHandle_.clear();
      ioHandle_.clear();
    } else if (handler == "case2") {
      stored_.set_flg(inHandle_.empty());
      stored_.set_num(inHandle_.size());
      outHandle_.store(stored_);
    } else if (handler == "case3") {
      // We can't read from outHandle_ so use a previously stored entity to test remove().
      outHandle_.remove(stored_);
    } else if (handler == "case4") {
      arcs::CollectionApiTest_OutHandle d1, d2, d3;

      // Test begin()/end() and WrappedIter operators
      auto i1 = inHandle_.begin();
      d1.set_txt(arcs::entity_to_str(*i1));  // op*
      d1.set_num(i1->num() * 2);             // op->
      d1.set_flg(i1 != inHandle_.end());           // op!=
      outHandle_.store(d1);

      auto i2 = inHandle_.begin();
      d2.set_txt((i2 == i1) ? "eq" : "ne");  // op==
      d2.set_flg(i1++ == inHandle_.end());         // postfix op++
      outHandle_.store(d2);

      d3.set_txt((i2 != i1) ? "ne" : "eq");
      d3.set_flg(++i2 == inHandle_.end());         // prefix op++
      outHandle_.store(d3);
    } else if (handler == "case5") {
      arcs::CollectionApiTest_OutHandle d1, d2, d3;
      arcs::CollectionApiTest_IoHandle extra;

      // Store and remove an entity.
      extra.set_txt("abc");
      ioHandle_.store(extra);
      d1.set_num(ioHandle_.size());
      d1.set_flg(ioHandle_.empty());
      outHandle_.store(d1);

      ioHandle_.remove(extra);
      d2.set_num(ioHandle_.size());
      outHandle_.store(d2);

      // Ranged iteration; order is not guaranteed so use 'num' to assign sorted array slots.
      const arcs::CollectionApiTest_IoHandle* sorted[3];
      for (const arcs::CollectionApiTest_IoHandle& data : ioHandle_) {
        sorted[static_cast<int>(data.num())] = &data;
      }
      for (size_t i = 0; i < 3; i++) {
        arcs::CollectionApiTest_OutHandle d;
        d.set_num(i);
        d.set_txt(Accessor::get_id(*sorted[i]));
        outHandle_.store(d);
      }

      ioHandle_.clear();
      d3.set_num(ioHandle_.size());
      d3.set_flg(ioHandle_.empty());
      outHandle_.store(d3);
    }
  }

  arcs::CollectionApiTest_OutHandle stored_;
};

DEFINE_PARTICLE(CollectionApiTest)


class ReferenceHandlesTest : public AbstractReferenceHandlesTest {
public:
  void onHandleSync(const std::string& name, bool all_synced) override {
    if (!all_synced) return;

    const arcs::Ref<arcs::ReferenceHandlesTest_Sng>& ref = sng_.get();
    report("s::empty", ref);
    dereference(ref, [this, &ref] { report("should not be reached", ref); });
  }

  void onHandleUpdate(const std::string& name) override {
    if (name == "sng") {
      const arcs::Ref<arcs::ReferenceHandlesTest_Sng>& ref = sng_.get();
      report("s::before", ref);
      dereference(ref, [this, &ref] { report("s::after", ref); });
    } else if (name == "col") {
      for (arcs::Ref<arcs::ReferenceHandlesTest_Col>& ref : col_) {
        report("c::before", ref);
        dereference(ref, [this, &ref] { report("c::after", ref); });
      }
    }
  }

  template<typename T>
  void report(const std::string& label, const T& ref) {
    arcs::ReferenceHandlesTest_Res d;
    const std::string& id = Accessor::get_id(ref);
    std::string bang = ref.is_dereferenced() ? "" : "!";
    d.set_txt(label + " <" + id + "> " + bang + arcs::entity_to_str(ref.entity()));
    res_.store(d);
  }
};

DEFINE_PARTICLE(ReferenceHandlesTest)


class SchemaReferenceFieldsTest : public AbstractSchemaReferenceFieldsTest {
public:
  void onHandleSync(const std::string& name, bool all_synced) override {
    if (!all_synced) return;

    const arcs::Ref<arcs::SchemaReferenceFieldsTest_Input_Ref>& ref = input_.get().ref();
    report("empty", ref);
    dereference(ref, [this, &ref] { report("should not be reached", ref); });
  }

  void onHandleUpdate(const std::string& name) override {
    const arcs::Ref<arcs::SchemaReferenceFieldsTest_Input_Ref>& ref = input_.get().ref();
    report("before", ref);
    dereference(ref, [this, &ref] {
      report("after", ref);

      arcs::SchemaReferenceFieldsTest_Output_Ref foo;
      Accessor::set_id(&foo, "foo1");

      arcs::SchemaReferenceFieldsTest_Output data = arcs::clone_entity(input_.get());
      data.set_txt("xyz");
      data.set_ref(foo);

      output_.set(data);
    });
  }

  template<typename T>
  void report(const std::string& label, const T& ref) {
    arcs::SchemaReferenceFieldsTest_Res d;
    const std::string& id = Accessor::get_id(ref);
    std::string bang = ref.is_dereferenced() ? "" : "!";
    d.set_txt(label + " <" + id + "> " + bang + arcs::entity_to_str(ref.entity()));
    res_.store(d);
  }
};

DEFINE_PARTICLE(SchemaReferenceFieldsTest)
