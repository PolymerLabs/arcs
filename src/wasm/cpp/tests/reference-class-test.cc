#include <vector>
#include <set>
#include <unordered_set>
#include "src/wasm/cpp/tests/test-base.h"

using arcs::internal::Accessor;

static auto converter() {
  return [](const arcs::Ref<arcs::ReferenceClassApiTest_Data>& r) { return arcs::entity_to_str(r); };
}


class ReferenceClassApiTest : public TestBase<arcs::ReferenceClassApiTest_Errors> {
public:
  // This handle is required so we can specify the desired inline schema in the particle spec
  // to get the generated class for testing, but we don't actually use the handle itself.
  arcs::Singleton<arcs::ReferenceClassApiTest_Data> unused_{"data", this};

  // Used to inject values into a dereference call.
  arcs::ReferenceClassApiTest_Data data_;

  // Non-virtual override, oh my!
  void dereference(const arcs::RefBase& ref, std::function<void()> continuation) {
    auto wrapped = Accessor::wrap(ref, continuation);
    if (wrapped) {
      Accessor::set_id(&data_, Accessor::get_id(ref));
      wrapped(Accessor::encode_entity(data_).c_str());
    }
  }

  void before_each() override {
    data_ = {};
  }

  void init() override {
    RUN(test_accessor_methods);
    RUN(test_empty_references);
    RUN(test_populated_references);
    RUN(test_shared_references);
    RUN(test_operators);
    RUN(test_stl_vector);
    RUN(test_stl_set);
    RUN(test_stl_unordered_set);
  }

  void test_accessor_methods() {
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r1;
    Accessor::decode_entity(&r1, "5:id789|6:key123|4:|");
    EQUAL(arcs::entity_to_str(r1), "REF<id789|key123>");
    EQUAL(Accessor::encode_entity(r1), "5:id789|6:key123|4:|");

    size_t h1 = arcs::hash_entity(r1);
    NOT_EQUAL(h1, 0);

    EQUAL(Accessor::get_id(r1), "id789");
    Accessor::set_id(&r1, "id55");
    EQUAL(Accessor::get_id(r1), "id55");
    NOT_EQUAL(arcs::hash_entity(r1), h1);

    // Same ids and storage keys; type index is ignored
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r2;
    Accessor::decode_entity(&r1, "4:idAA|6:key789|5:|");
    Accessor::decode_entity(&r2, "4:idAA|6:key789|7:|");
    EQUAL(arcs::hash_entity(r1), arcs::hash_entity(r2));

    // Different ids, same storage keys.
    Accessor::decode_entity(&r2, "5:idXXX|6:key789|5:|");
    NOT_EQUAL(arcs::hash_entity(r1), arcs::hash_entity(r2));

    // Same ids, different storage keys.
    Accessor::decode_entity(&r2, "4:idAA|5:key00|5:|");
    NOT_EQUAL(arcs::hash_entity(r1), arcs::hash_entity(r2));
  }

  void test_empty_references() {
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r;

    IS_FALSE(r.is_dereferenced());
    EQUAL(r.entity(), arcs::ReferenceClassApiTest_Data());

    EQUAL(arcs::entity_to_str(r), "REF<>");
    EQUAL(arcs::entity_to_str(r.entity()), "{}");
    EQUAL(Accessor::encode_entity(r), "0:|0:|0:|");
    EQUAL(Accessor::get_id(r), "");

    // dereference is a no-op
    bool called = false;
    dereference(r, [&called] { called = true; });
    IS_FALSE(called);
    IS_FALSE(r.is_dereferenced());
  }

  void test_populated_references() {
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r;

    Accessor::decode_entity(&r, "5:id789|6:key123|2:|");
    IS_FALSE(r.is_dereferenced());
    EQUAL(r.entity(), arcs::ReferenceClassApiTest_Data());

    data_.set_txt("ltuae");
    data_.set_num(42);
    bool called = false;
    dereference(r, [&called] { called = true; });
    IS_TRUE(called);
    IS_TRUE(r.is_dereferenced());

    EQUAL(arcs::entity_to_str(r), "REF<id789|key123|[{id789}, num: 42, txt: ltuae]>");
    EQUAL(arcs::entity_to_str(r.entity()), "{id789}, num: 42, txt: ltuae");

    // The dereference operation shouldn't affect the encoded form of the reference itself.
    EQUAL(Accessor::encode_entity(r), "5:id789|6:key123|2:|");

    // The reference should have its own copy of the entity.
    data_.set_txt("different");
    EQUAL(r.entity().txt(), "ltuae");
  }

  void test_shared_references() {
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r1;
    Accessor::decode_entity(&r1, "5:id789|6:key123|2:|");

    // Make a copy prior to dereferencing.
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r2 = r1;

    IS_FALSE(r1.is_dereferenced());
    IS_FALSE(r2.is_dereferenced());
    EQUAL(arcs::entity_to_str(r1), "REF<id789|key123>");
    EQUAL(arcs::entity_to_str(r2), "REF<id789|key123>");

    data_.set_num(4);
    data_.set_txt("four");
    bool called = false;
    dereference(r1, [&called] { called = true; });
    IS_TRUE(called);

    // Dereferencing one Ref instance affects copies.
    IS_TRUE(r1.is_dereferenced());
    IS_TRUE(r2.is_dereferenced());
    EQUAL(arcs::entity_to_str(r1), "REF<id789|key123|[{id789}, num: 4, txt: four]>");
    EQUAL(arcs::entity_to_str(r2), "REF<id789|key123|[{id789}, num: 4, txt: four]>");

    // Copying references shares the underlying entity, even when the copy occurred
    // before the dereference call.
    EQUAL(&r1.entity(), &r2.entity());

    // Mutating the entity via one Ref instance means the copy sees the same change.
    // TODO: use the mutation API
    auto* d = const_cast<arcs::ReferenceClassApiTest_Data*>(&r1.entity());
    d->set_txt("shared");
    EQUAL(r2.entity().txt(), "shared");
  }

  void test_operators() {
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r1, r2;

    // different ids
    Accessor::decode_entity(&r1, "3:idA|4:keyA|1:|");
    Accessor::decode_entity(&r2, "3:idX|4:keyA|1:|");
    NOT_EQUAL(r1, r2);
    LESS(r1, r2);
    NOT_LESS(r2, r1);

    // different keys
    Accessor::decode_entity(&r2, "3:idA|4:keyX|1:|");
    NOT_EQUAL(r1, r2);
    LESS(r1, r2);
    NOT_LESS(r2, r1);

    // same ids and keys
    Accessor::decode_entity(&r2, "3:idA|4:keyA|1:|");
    EQUAL(r1, r2);
    NOT_LESS(r1, r2);
    NOT_LESS(r2, r1);

    // different type indexes should not affect equality
    Accessor::decode_entity(&r2, "3:idA|4:keyA|5:|");
    EQUAL(r1, r2);
    NOT_LESS(r1, r2);
    NOT_LESS(r2, r1);

    // dereferenced state should not affect comparisons.
    data_.set_num(77);
    dereference(r1, [] {});
    EQUAL(r1, r2);
    NOT_LESS(r1, r2);
    NOT_LESS(r2, r1);
  }

  void test_stl_vector() {
    // empty
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r1;

    // populated and dereferenced
    data_.set_num(99);
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r2;
    Accessor::decode_entity(&r2, "3:idA|4:keyA|1:|");
    dereference(r2, [] {});

    // populated but not dereferenced
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r3;
    Accessor::decode_entity(&r3, "3:idB|4:keyB|2:|");

    // same reference as r2, but not a copy
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r4;
    Accessor::decode_entity(&r4, "3:idA|4:keyA|1:|");

    std::vector<arcs::Ref<arcs::ReferenceClassApiTest_Data>> v;
    v.push_back(std::move(r1));
    v.push_back(std::move(r2));
    v.push_back(std::move(r3));
    v.push_back(std::move(r4));

    std::vector<std::string> expected = {
      "REF<>",
      "REF<idA|keyA|[{idA}, num: 99]>",
      "REF<idB|keyB>",
      "REF<idA|keyA>"
    };
    CHECK_ORDERED(v, converter(), expected);
  }

  void test_stl_set() {
    // empty
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r1;

    // dereferenced
    data_.set_txt("zz");
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r2;
    Accessor::decode_entity(&r2, "3:idA|4:keyA|1:|");
    dereference(r2, [] {});

    // populated but not dereferenced
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r3;
    Accessor::decode_entity(&r3, "3:idB|4:keyB|2:|");

    // same reference as r2, but not a copy
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r4;
    Accessor::decode_entity(&r4, "3:idA|4:keyA|1:|");

    std::set<arcs::Ref<arcs::ReferenceClassApiTest_Data>> s;
    s.insert(std::move(r1));
    s.insert(std::move(r2));
    s.insert(std::move(r3));
    s.insert(std::move(r4));

    std::vector<std::string> expected = {
      "REF<>",
      "REF<idA|keyA|[{idA}, txt: zz]>",
      "REF<idB|keyB>"
    };
    CHECK_UNORDERED(s, converter(), expected);
  }

  void test_stl_unordered_set() {
    // empty
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r1;

    // dereferenced
    data_.set_txt("xtx");
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r2;
    Accessor::decode_entity(&r2, "3:idA|4:keyA|1:|");
    dereference(r2, [] {});

    // populated but not dereferenced
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r3;
    Accessor::decode_entity(&r3, "3:idB|4:keyB|2:|");

    // same reference as r2, but not a copy
    arcs::Ref<arcs::ReferenceClassApiTest_Data> r4;
    Accessor::decode_entity(&r4, "3:idA|4:keyA|1:|");

    std::unordered_set<arcs::Ref<arcs::ReferenceClassApiTest_Data>> s;
    s.insert(std::move(r1));
    s.insert(std::move(r2));
    s.insert(std::move(r3));
    s.insert(std::move(r4));

    std::vector<std::string> expected = {
      "REF<>",
      "REF<idA|keyA|[{idA}, txt: xtx]>",
      "REF<idB|keyB>"
    };
    CHECK_UNORDERED(s, converter(), expected);
  }
};

DEFINE_PARTICLE(ReferenceClassApiTest)
