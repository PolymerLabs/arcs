#include <vector>
#include <set>
#include <unordered_set>
#include "src/wasm/cpp/tests/test-base.h"

using arcs::internal::Accessor;

static auto converter() {
  return [](const arcs::Ref<arcs::Test_Data>& r) { return arcs::entity_to_str(r); };
}


class TestHandle : public arcs::Handle {
public:
  void sync(const char* model) override {}
  void update(const char* encoded1, const char* encoded2) override {}

  void dereference(const std::string& ref_id, arcs::internal::DerefContinuation fn) override {
    Accessor::set_id(&data, ref_id);
    fn(Accessor::encode_entity(data).c_str());
  }

  arcs::Test_Data data;
};


class ReferenceClassApiTest : public TestBase {
public:
  void init() override {
    RUN(test_accessor_methods);
    RUN(test_empty_references);
    RUN(test_populated_references);
    RUN(test_operators);
    RUN(test_stl_vector);
    RUN(test_stl_set);
    RUN(test_stl_unordered_set);
  }

  void test_accessor_methods() {
    arcs::Ref<arcs::Test_Data> r1;

    Accessor::decode_entity(&r1, "5:id789|6:key123|");
    EQUAL(arcs::entity_to_str(r1), "REF<id789|key123>");
    EQUAL(Accessor::encode_entity(r1), "5:id789|6:key123|");

    size_t h1 = arcs::hash_entity(r1);
    NOT_EQUAL(h1, 0);

    EQUAL(Accessor::get_id(r1), "id789");
    Accessor::set_id(&r1, "id55");
    EQUAL(Accessor::get_id(r1), "id55");
    NOT_EQUAL(arcs::hash_entity(r1), h1);

    arcs::Ref<arcs::Test_Data> r2 = arcs::clone_entity(r1);
    IS_TRUE(arcs::fields_equal(r1, r2));
    EQUAL(arcs::hash_entity(r1), arcs::hash_entity(r2));
    EQUAL(arcs::entity_to_str(r1), arcs::entity_to_str(r2));

    // References are copyable.
    arcs::Ref<arcs::Test_Data> r3 = r1;
    IS_TRUE(arcs::fields_equal(r1, r3));

    // Different ids, same storage keys.
    Accessor::decode_entity(&r1, "4:idAA|6:key123|");
    Accessor::decode_entity(&r2, "5:idXXX|6:key123|");
    IS_FALSE(arcs::fields_equal(r1, r2));
    NOT_EQUAL(arcs::hash_entity(r1), arcs::hash_entity(r2));

    // Same ids, different storage keys.
    Accessor::decode_entity(&r1, "4:idAA|6:key123|");
    Accessor::decode_entity(&r2, "4:idAA|5:key56|");
    IS_FALSE(arcs::fields_equal(r1, r2));
    NOT_EQUAL(arcs::hash_entity(r1), arcs::hash_entity(r2));
  }

  void test_empty_references() {
    arcs::Ref<arcs::Test_Data> r1;

    EQUAL(r1.entity(), arcs::Test_Data());
    IS_FALSE(r1.is_dereferenced());
    EQUAL(arcs::entity_to_str(r1), "REF<>");
    EQUAL(Accessor::encode_entity(r1), "0:|0:|");
    EQUAL(Accessor::get_id(r1), "");

    arcs::Ref<arcs::Test_Data> r2 = arcs::clone_entity(r1);
    IS_TRUE(arcs::fields_equal(r1, r2));
    EQUAL(arcs::hash_entity(r1), arcs::hash_entity(r2));
    EQUAL(arcs::entity_to_str(r1), arcs::entity_to_str(r2));
  }

  void test_populated_references() {
    TestHandle handle;
    handle.data.set_txt("ltuae");
    handle.data.set_num(42);

    arcs::Ref<arcs::Test_Data> r1(&handle);
    Accessor::decode_entity(&r1, "5:id789|6:key123|");
    EQUAL(arcs::entity_to_str(r1), "REF<id789|key123>");
    EQUAL(arcs::entity_to_str(r1.entity()), "{}");

    // Make a copy prior to dereferencing.
    arcs::Ref<arcs::Test_Data> r2 = r1;
    IS_FALSE(r1.is_dereferenced());
    IS_FALSE(r2.is_dereferenced());

    // dereference() via TestHandle is synchronous.
    bool called = false;
    r1.dereference([&called] { called = true; });
    IS_TRUE(called);
    EQUAL(arcs::entity_to_str(r1), "REF<id789|key123|{id789}, num: 42, txt: ltuae>");
    EQUAL(arcs::entity_to_str(r1.entity()), "{id789}, num: 42, txt: ltuae");

    // Dereferencing one Ref instance affects copies.
    IS_TRUE(r1.is_dereferenced());
    IS_TRUE(r2.is_dereferenced());

    // Populating the reference shouldn't affect the encoded form.
    EQUAL(Accessor::encode_entity(r1), "5:id789|6:key123|");

    // The reference should have its own copy of the entity.
    handle.data.set_txt("different");
    EQUAL(arcs::entity_to_str(r1.entity()), "{id789}, num: 42, txt: ltuae");

    // Copying references shares the underlying entity, even when the copy
    // occurred before the dereference call.
    EQUAL(&r1.entity(), &r2.entity());
    EQUAL(arcs::entity_to_str(r1.entity()), arcs::entity_to_str(r2.entity()));

    // TODO: use the mutation API
    arcs::Test_Data* d1 = const_cast<arcs::Test_Data*>(&r1.entity());
    d1->set_lnk("zelda");
    EQUAL(r2.entity().lnk(), "zelda");
    EQUAL(arcs::entity_to_str(r1.entity()), arcs::entity_to_str(r2.entity()));
  }

  void test_operators() {
    TestHandle handle;
    arcs::Ref<arcs::Test_Data> r1(&handle);
    arcs::Ref<arcs::Test_Data> r2(&handle);

    Accessor::decode_entity(&r1, "3:idA|4:keyA|");
    Accessor::decode_entity(&r2, "3:idB|4:keyA|");
    NOT_EQUAL(r1, r2);
    LESS(r1, r2);
    NOT_LESS(r2, r1);

    Accessor::decode_entity(&r2, "3:idA|4:keyB|");
    NOT_EQUAL(r1, r2);
    LESS(r1, r2);
    NOT_LESS(r2, r1);

    Accessor::decode_entity(&r2, "3:idA|4:keyA|");
    EQUAL(r1, r2);
    NOT_LESS(r1, r2);
    NOT_LESS(r2, r1);

    // Dereferenced state should not affect comparisons.
    handle.data.set_num(77);
    r1.dereference([] {});
    EQUAL(r1, r2);
    NOT_LESS(r1, r2);
    NOT_LESS(r2, r1);
  }

  void test_stl_vector() {
    TestHandle handle;
    handle.data.set_num(99);

    // empty
    arcs::Ref<arcs::Test_Data> r1;

    // populated and dereferenced
    arcs::Ref<arcs::Test_Data> r2(&handle);
    Accessor::decode_entity(&r2, "3:idA|4:keyA|");
    r2.dereference([] {});

    // populated but not dereferenced
    arcs::Ref<arcs::Test_Data> r3;
    Accessor::decode_entity(&r3, "3:idB|4:keyB|");

    // same reference as r2, but not a copy
    arcs::Ref<arcs::Test_Data> r4;
    Accessor::decode_entity(&r4, "3:idA|4:keyA|");

    std::vector<arcs::Ref<arcs::Test_Data>> v = {r1, r2, r3, r4};
    std::vector<std::string> expected = {
      "REF<>",
      "REF<idA|keyA|{idA}, num: 99>",
      "REF<idB|keyB>",
      "REF<idA|keyA>"
    };
    CHECK_ORDERED(v, converter(), expected);
  }

  void test_stl_set() {
    TestHandle handle;
    handle.data.set_txt("zz");

    // empty
    arcs::Ref<arcs::Test_Data> r1;

    // dereferenced
    arcs::Ref<arcs::Test_Data> r2(&handle);
    Accessor::decode_entity(&r2, "3:idA|4:keyA|");
    r2.dereference([] {});

    // populated but not dereferenced
    arcs::Ref<arcs::Test_Data> r3;
    Accessor::decode_entity(&r3, "3:idB|4:keyB|");

    // same reference as r2, but not a copy
    arcs::Ref<arcs::Test_Data> r4;
    Accessor::decode_entity(&r4, "3:idA|4:keyA|");

    std::set<arcs::Ref<arcs::Test_Data>> s = {r1, r2, r3, r4};
    std::vector<std::string> expected = {
      "REF<>",
      "REF<idA|keyA|{idA}, txt: zz>",
      "REF<idB|keyB>"
    };
    CHECK_UNORDERED(s, converter(), expected);
  }

  void test_stl_unordered_set() {
    TestHandle handle;
    handle.data.set_lnk("knl");

    // empty
    arcs::Ref<arcs::Test_Data> r1;

    // dereferenced
    arcs::Ref<arcs::Test_Data> r2(&handle);
    Accessor::decode_entity(&r2, "3:idA|4:keyA|");
    r2.dereference([] {});

    // populated but not dereferenced
    arcs::Ref<arcs::Test_Data> r3;
    Accessor::decode_entity(&r3, "3:idB|4:keyB|");

    // same reference as r2, but not a copy
    arcs::Ref<arcs::Test_Data> r4;
    Accessor::decode_entity(&r4, "3:idA|4:keyA|");

    std::unordered_set<arcs::Ref<arcs::Test_Data>> s = {r1, r2, r3, r4};
    std::vector<std::string> expected = {
      "REF<>",
      "REF<idA|keyA|{idA}, lnk: knl>",
      "REF<idB|keyB>"
    };
    CHECK_UNORDERED(s, converter(), expected);
  }
};

DEFINE_PARTICLE(ReferenceClassApiTest)
