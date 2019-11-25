#include "src/wasm/cpp/arcs.h"
#include "src/wasm/cpp/tests/entities.h"

using arcs::internal::Accessor;

class SingletonApiTest : public arcs::Particle {
public:
  void fireEvent(const std::string& slot_name, const std::string& handler, const arcs::Dictionary& eventData) override {
    if (handler == "case1") {
      out_.clear();
      io_.clear();
    } else if (handler == "case2") {
      arcs::SingletonApiTest_OutHandle d = arcs::clone_entity(in_.get());
      d.set_num(d.num() * 2);
      out_.set(d);
    } else if (handler == "case3") {
      arcs::SingletonApiTest_IoHandle d = arcs::clone_entity(io_.get());
      d.set_num(d.num() * 3);
      io_.set(d);
    }
  }

  arcs::Singleton<arcs::SingletonApiTest_InHandle> in_{"inHandle", this};
  arcs::Singleton<arcs::SingletonApiTest_OutHandle> out_{"outHandle", this};
  arcs::Singleton<arcs::SingletonApiTest_IoHandle> io_{"ioHandle", this};
};

DEFINE_PARTICLE(SingletonApiTest)


class CollectionApiTest : public arcs::Particle {
public:
  void fireEvent(const std::string& slot_name, const std::string& handler, const arcs::Dictionary& eventData) override {
    if (handler == "case1") {
      out_.clear();
      io_.clear();
    } else if (handler == "case2") {
      stored_.set_flg(in_.empty());
      stored_.set_num(in_.size());
      out_.store(stored_);
    } else if (handler == "case3") {
      // We can't read from out_ so use a previously stored entity to test remove().
      out_.remove(stored_);
    } else if (handler == "case4") {
      arcs::CollectionApiTest_OutHandle d1, d2, d3;

      // Test begin()/end() and WrappedIter operators
      auto i1 = in_.begin();
      d1.set_txt(arcs::entity_to_str(*i1));  // op*
      d1.set_num(i1->num() * 2);             // op->
      d1.set_flg(i1 != in_.end());           // op!=
      out_.store(d1);

      auto i2 = in_.begin();
      d2.set_txt((i2 == i1) ? "eq" : "ne");  // op==
      d2.set_flg(i1++ == in_.end());         // postfix op++
      out_.store(d2);

      d3.set_txt((i2 != i1) ? "ne" : "eq");
      d3.set_flg(++i2 == in_.end());         // prefix op++
      out_.store(d3);
    } else if (handler == "case5") {
      arcs::CollectionApiTest_OutHandle d1, d2, d3;
      arcs::CollectionApiTest_IoHandle extra;

      // Store and remove an entity.
      extra.set_txt("abc");
      io_.store(extra);
      d1.set_num(io_.size());
      d1.set_flg(io_.empty());
      out_.store(d1);

      io_.remove(extra);
      d2.set_num(io_.size());
      out_.store(d2);

      // Ranged iteration; order is not guaranteed so use 'num' to assign sorted array slots.
      std::string res[3];
      for (const arcs::CollectionApiTest_IoHandle& data : io_) {
        res[static_cast<int>(data.num())] = arcs::entity_to_str(data);
      }
      for (size_t i = 0; i < io_.size(); i++) {
        arcs::CollectionApiTest_OutHandle d;
        d.set_txt(res[i]);
        out_.store(d);
      }

      io_.clear();
      d3.set_num(io_.size());
      d3.set_flg(io_.empty());
      out_.store(d3);
    }
  }

  arcs::Collection<arcs::CollectionApiTest_InHandle> in_{"inHandle", this};
  arcs::Collection<arcs::CollectionApiTest_OutHandle> out_{"outHandle", this};
  arcs::Collection<arcs::CollectionApiTest_IoHandle> io_{"ioHandle", this};
  arcs::CollectionApiTest_OutHandle stored_;
};

DEFINE_PARTICLE(CollectionApiTest)


class ReferenceHandlesTest : public arcs::Particle {
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

  arcs::Singleton<arcs::Ref<arcs::ReferenceHandlesTest_Sng>> sng_{"sng", this};
  arcs::Collection<arcs::Ref<arcs::ReferenceHandlesTest_Col>> col_{"col", this};
  arcs::Collection<arcs::ReferenceHandlesTest_Res> res_{"res", this};
};

DEFINE_PARTICLE(ReferenceHandlesTest)


class SchemaReferenceFieldsTest : public arcs::Particle {
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
      data.bind_ref(foo);

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

  arcs::Singleton<arcs::SchemaReferenceFieldsTest_Input> input_{"input", this};
  arcs::Singleton<arcs::SchemaReferenceFieldsTest_Output> output_{"output", this};
  arcs::Collection<arcs::SchemaReferenceFieldsTest_Res> res_{"res", this};
};

DEFINE_PARTICLE(SchemaReferenceFieldsTest)
