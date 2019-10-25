#include <vector>
#include <set>
#include <unordered_set>
#include "src/wasm/cpp/tests/test-base.h"

using arcs::internal::Accessor;

template<typename T>
static size_t hash(const T& d) {
  return std::hash<T>()(d);
}

static arcs::Ref<arcs::Test_Data_Ref> make_ref(const std::string& id, const std::string& key) {
  return Accessor::make_ref<arcs::Test_Data_Ref>(id, key);
}

static auto converter() {
  return [](const arcs::Test_Data& d) { return arcs::entity_to_str(d); };
}


class EntityClassApiTest : public TestBase {
public:
  void init() override {
    RUN(test_field_methods);
    RUN(test_id_equality);
    RUN(test_number_field_equality);
    RUN(test_text_field_equality);
    RUN(test_url_field_equality);
    RUN(test_boolean_field_equality);
    RUN(test_reference_field_equality);
    RUN(test_entity_equality);
    RUN(test_clone_entity);
    RUN(test_entity_to_str);
    RUN(test_stl_vector);
    RUN(test_stl_set);
    RUN(test_stl_unordered_set);
    RUN(test_empty_schema);
  }

  void test_field_methods() {
    arcs::Test_Data d;

    IS_FALSE(d.has_num());
    EQUAL(d.num(), 0);
    d.set_num(7.3);
    IS_TRUE(d.has_num());
    EQUAL(d.num(), 7.3);
    d.clear_num();
    IS_FALSE(d.has_num());
    d.set_num(0);
    IS_TRUE(d.has_num());
    EQUAL(d.num(), 0);

    IS_FALSE(d.has_txt());
    EQUAL(d.txt(), "");
    d.set_txt("abc");
    IS_TRUE(d.has_txt());
    EQUAL(d.txt(), "abc");
    d.clear_txt();
    IS_FALSE(d.has_txt());
    d.set_txt("");
    IS_TRUE(d.has_txt());
    EQUAL(d.txt(), "");

    IS_FALSE(d.has_lnk());
    EQUAL(d.lnk(), "");
    d.set_lnk("url");
    IS_TRUE(d.has_lnk());
    EQUAL(d.lnk(), "url");
    d.clear_lnk();
    IS_FALSE(d.has_lnk());
    d.set_lnk("");
    IS_TRUE(d.has_lnk());
    EQUAL(d.lnk(), "");

    IS_FALSE(d.has_flg());
    IS_FALSE(d.flg());
    d.set_flg(true);
    IS_TRUE(d.has_flg());
    IS_TRUE(d.flg());
    d.clear_flg();
    IS_FALSE(d.has_flg());
    d.set_flg(false);
    IS_TRUE(d.has_flg());
    IS_FALSE(d.flg());

    arcs::Ref<arcs::Test_Data_Ref> empty;
    arcs::Ref<arcs::Test_Data_Ref> populated = make_ref("id", "key");
    IS_FALSE(d.has_ref());
    EQUAL(d.ref(), empty);
    d.set_ref(populated);
    IS_TRUE(d.has_ref());
    EQUAL(d.ref(), populated);
    d.clear_ref();
    IS_FALSE(d.has_ref());
    d.set_ref(empty);
    IS_TRUE(d.has_ref());
    EQUAL(d.ref(), empty);
  }

  void test_id_equality() {
    arcs::Test_Data d1, d2;
    EQUAL(Accessor::get_id(d1), "");

    // unset vs value
    Accessor::set_id(&d1, "id_a");
    EQUAL(Accessor::get_id(d1), "id_a");
    NOT_EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    LESS(d2, d1);

    // value vs value
    Accessor::set_id(&d2, "id_b");
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    Accessor::set_id(&d2, "id_a");
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);
  }

  void test_number_field_equality() {
    arcs::Test_Data d1, d2;

    // unset vs default value
    d2.set_num(0);
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    // unset vs other value
    d2.set_num(5);
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    // default vs default
    d1.set_num(0);
    d2.set_num(0);
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);

    // value vs value
    d1.set_num(3);
    d2.set_num(5);
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    d1.set_num(5);
    d2.set_num(5);
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);

    d1.set_num(7);
    d2.set_num(5);
    NOT_EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    LESS(d2, d1);
  }

  void test_text_field_equality() {
    arcs::Test_Data d1, d2;

    // unset vs default value
    d2.set_txt("");
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    // unset vs other value
    d2.set_txt("a");
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    // default vs default
    d1.set_txt("");
    d2.set_txt("");
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);

    // value vs value
    d1.set_txt("aaa");
    d2.set_txt("bbb");
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    d1.set_txt("bbb");
    d2.set_txt("bbb");
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);

    d1.set_txt("ccc");
    d2.set_txt("bbb");
    NOT_EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    LESS(d2, d1);
  }

  void test_url_field_equality() {
    arcs::Test_Data d1, d2;

    // unset vs default value
    d2.set_lnk("");
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    // unset vs other value
    d2.set_lnk("a");
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    // default vs default
    d1.set_lnk("");
    d2.set_lnk("");
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);

    // value vs value
    d1.set_lnk("aaa");
    d2.set_lnk("bbb");
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    d1.set_lnk("bbb");
    d2.set_lnk("bbb");
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);

    d1.set_lnk("ccc");
    d2.set_lnk("bbb");
    NOT_EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    LESS(d2, d1);
  }

  void test_boolean_field_equality() {
    arcs::Test_Data d1, d2;

    // unset vs default value
    d2.set_flg(false);
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    // unset vs other value
    d2.set_flg(true);
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    // default vs default
    d1.set_flg(false);
    d2.set_flg(false);
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);

    // value vs value
    d1.set_flg(false);
    d2.set_flg(true);
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    d1.set_flg(true);
    d2.set_flg(true);
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);
  }

  void test_reference_field_equality() {
    arcs::Test_Data d1, d2;
    arcs::Ref<arcs::Test_Data_Ref> empty;

    // unset vs default value
    d2.set_ref({});
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    // unset vs other value
    d2.set_ref(make_ref("id1", "key1"));
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    // default vs default
    d1.set_ref(empty);
    d2.set_ref(empty);
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);

    // value vs value
    d1.set_ref(make_ref("id5", "key5"));
    d2.set_ref(make_ref("id7", "key7"));
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    d1.set_ref(make_ref("id7", "key7"));
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);

    d2.set_ref(make_ref("id3", "key3"));
    NOT_EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    LESS(d2, d1);
  }

  void test_entity_equality() {
    arcs::Test_Data d1, d2;

    // Empty entities are equal
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);
    IS_TRUE(arcs::fields_equal(d1, d2));
    EQUAL(hash(d1), hash(d2));

    // Entities with the same fields are equal
    for (arcs::Test_Data* d : std::vector{&d1, &d2}) {
      d->set_num(3);
      d->set_txt("abc");
      d->set_lnk("");
      d->set_flg(false);
    }
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);
    IS_TRUE(arcs::fields_equal(d1, d2));
    EQUAL(hash(d1), hash(d2));

    // Entities with the same fields but different ids are op!= but fields_equal()
    Accessor::set_id(&d1, "id_a");
    NOT_EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    LESS(d2, d1);
    IS_TRUE(arcs::fields_equal(d1, d2));
    NOT_EQUAL(hash(d1), hash(d2));

    Accessor::set_id(&d2, "id_b");
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);
    IS_TRUE(arcs::fields_equal(d1, d2));
    NOT_EQUAL(hash(d1), hash(d2));

    // Entities with the same fields and ids are op== and fields_equal()
    Accessor::set_id(&d2, "id_a");
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);
    IS_TRUE(arcs::fields_equal(d1, d2));
    EQUAL(hash(d1), hash(d2));

    // d1.txt > d2.txt implies d1 > d2
    d1.set_txt("xyz");
    NOT_EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    LESS(d2, d1);
    IS_FALSE(arcs::fields_equal(d1, d2));
    NOT_EQUAL(hash(d1), hash(d2));
    d1.set_txt("abc");

    // d1.flg < d2.flg implies d1 < d2
    d2.set_flg(true);
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);
    IS_FALSE(arcs::fields_equal(d1, d2));
    NOT_EQUAL(hash(d1), hash(d2));

    // d1.lnk && !d2.lnk implies d1 > d2 (takes precedence over flg from above)
    d2.clear_lnk();
    NOT_EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    LESS(d2, d1);
    IS_FALSE(arcs::fields_equal(d1, d2));
    NOT_EQUAL(hash(d1), hash(d2));

    // !d1.num && d2.num implies d1 < d2 (takes precedence over lnk and flg from above)
    d1.clear_num();
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);
    IS_FALSE(arcs::fields_equal(d1, d2));
    NOT_EQUAL(hash(d1), hash(d2));
  }

  void test_clone_entity() {
    arcs::Test_Data src;
    arcs::Test_Data d1 = arcs::clone_entity(src);
    EQUAL(d1, src);
    IS_TRUE(arcs::fields_equal(d1, src));
    EQUAL(hash(d1), hash(src));

    src.set_num(8);
    src.set_txt("def");
    src.set_flg(false);
    arcs::Test_Data d2 = arcs::clone_entity(src);
    EQUAL(d2, src);
    IS_TRUE(arcs::fields_equal(d2, src));
    EQUAL(hash(d2), hash(src));

    // Cloned references should still refer to the same underlying entity.
    EQUAL(&(d2.ref().entity()), &(src.ref().entity()));

    // Cloning doesn't include the internal id.
    Accessor::set_id(&src, "id");
    arcs::Test_Data d3 = arcs::clone_entity(src);
    EQUAL(Accessor::get_id(d3), "");
    NOT_EQUAL(d3, src);
    IS_TRUE(arcs::fields_equal(d3, src));
    NOT_EQUAL(hash(d3), hash(src));
  }

  void test_entity_to_str() {
    arcs::Test_Data d;
    EQUAL(arcs::entity_to_str(d), "{}");

    d.set_num(6);
    d.set_txt("boo");
    d.set_flg(false);
    EQUAL(arcs::entity_to_str(d), "{}, num: 6, txt: boo, flg: false");
    EQUAL(arcs::entity_to_str(d, "|"), "{}|num: 6|txt: boo|flg: false");

    Accessor::set_id(&d, "id");
    d.clear_flg();
    d.set_ref(make_ref("i12", "k34"));
    EQUAL(arcs::entity_to_str(d), "{id}, num: 6, txt: boo, ref: REF<i12|k34>");
  }

  void test_stl_vector() {
    arcs::Test_Data d1, d2, d3;
    d1.set_num(12);
    d2.set_num(12);
    Accessor::set_id(&d3, "id");

    std::vector<arcs::Test_Data> v;
    v.push_back(std::move(d1));
    v.push_back(std::move(d2));
    v.push_back(std::move(d3));

    std::vector<std::string> expected = {
      "{}, num: 12",
      "{}, num: 12",
      "{id}"
    };
    CHECK_ORDERED(v, converter(), expected);
  }

  void test_stl_set() {
    arcs::Test_Data d1;
    d1.set_num(45);
    d1.set_txt("woop");

    // duplicate
    arcs::Test_Data d2;
    d2.set_num(45);
    d2.set_txt("woop");

    // duplicate fields but with an id
    arcs::Test_Data d3;
    Accessor::set_id(&d3, "id");
    d3.set_num(45);
    d3.set_txt("woop");

    // same id, different fields
    arcs::Test_Data d4;
    Accessor::set_id(&d4, "id");
    d4.set_flg(false);

    // duplicate
    arcs::Test_Data d5 = arcs::clone_entity(d4);
    Accessor::set_id(&d5, "id");

    std::set<arcs::Test_Data> s;
    s.insert(std::move(d1));
    s.insert(std::move(d2));
    s.insert(std::move(d3));
    s.insert(std::move(d4));
    s.insert(std::move(d5));

    std::vector<std::string> expected = {
      "{id}, flg: false",
      "{id}, num: 45, txt: woop",
      "{}, num: 45, txt: woop"
    };
    CHECK_UNORDERED(s, converter(), expected);
  }

  void test_stl_unordered_set() {
    arcs::Test_Data d1;
    d1.set_num(45);
    d1.set_txt("woop");

    // duplicate
    arcs::Test_Data d2;
    d2.set_num(45);
    d2.set_txt("woop");

    // duplicate fields but with an id
    arcs::Test_Data d3;
    Accessor::set_id(&d3, "id");
    d3.set_num(45);
    d3.set_txt("woop");

    // same id, different fields
    arcs::Test_Data d4;
    Accessor::set_id(&d4, "id");
    d4.set_flg(false);

    // duplicate
    arcs::Test_Data d5 = arcs::clone_entity(d4);
    Accessor::set_id(&d5, "id");

    std::unordered_set<arcs::Test_Data> s;
    s.insert(std::move(d1));
    s.insert(std::move(d2));
    s.insert(std::move(d3));
    s.insert(std::move(d4));
    s.insert(std::move(d5));

    std::vector<std::string> expected = {
      "{id}, flg: false",
      "{id}, num: 45, txt: woop",
      "{}, num: 45, txt: woop"
    };
    CHECK_UNORDERED(s, converter(), expected);
  }

  void test_empty_schema() {
    arcs::Test_Empty e1, e2;

    EQUAL(Accessor::get_id(e1), "");
    EQUAL(e1, e2);
    NOT_LESS(e1, e2);
    NOT_LESS(e2, e1);
    IS_TRUE(arcs::fields_equal(e1, e2));
    EQUAL(hash(e1), hash(e2));
    EQUAL(arcs::entity_to_str(e1), "{}");

    Accessor::set_id(&e1, "id");
    EQUAL(Accessor::get_id(e1), "id");
    NOT_EQUAL(e1, e2);
    NOT_LESS(e1, e2);
    LESS(e2, e1);
    IS_TRUE(arcs::fields_equal(e1, e2));
    NOT_EQUAL(hash(e1), hash(e2));
    EQUAL(arcs::entity_to_str(e1), "{id}");

    Accessor::set_id(&e2, "id");
    EQUAL(e1, e2);
    NOT_LESS(e1, e2);
    NOT_LESS(e2, e1);
    IS_TRUE(arcs::fields_equal(e1, e2));
    EQUAL(hash(e1), hash(e2));

    arcs::Test_Empty e3 = arcs::clone_entity(e1);
    EQUAL(arcs::entity_to_str(e3), "{}");

    auto converter = [](const arcs::Test_Empty& e) {
      return arcs::entity_to_str(e);
    };
    std::vector<std::string> expected = {"{id}", "{}"};

    std::set<arcs::Test_Empty> s1;
    s1.insert(std::move(e1));
    s1.insert(std::move(e3));
    CHECK_UNORDERED(s1, converter, expected);

    std::unordered_set<arcs::Test_Empty> s2;
    arcs::Test_Empty e4;
    s2.insert(std::move(e2));
    s2.insert(std::move(e4));
    CHECK_UNORDERED(s2, converter, expected);
  }
};

DEFINE_PARTICLE(EntityClassApiTest)


class SpecialSchemaFieldsTest : public TestBase {
public:
  void init() override {
    RUN(test_language_keyword_field);
    RUN(test_internal_id_field);
    RUN(test_general_usage);
  }

  // Test that language keywords can be field names.
  void test_language_keyword_field() {
    arcs::Test_SpecialFields s;

    IS_FALSE(s.has_for());
    EQUAL(s._for(), "");
    s.set_for("abc");
    IS_TRUE(s.has_for());
    EQUAL(s._for(), "abc");
    s.clear_for();
    IS_FALSE(s.has_for());
    s.set_for("");
    IS_TRUE(s.has_for());
    EQUAL(s._for(), "");
  }

  // Test that a field called 'internal_id' doesn't conflict with the Arcs internal id.
  void test_internal_id_field() {
    arcs::Test_SpecialFields s;
    Accessor::set_id(&s, "real");

    IS_FALSE(s.has_internal_id());
    EQUAL(s.internal_id(), 0);
    s.set_internal_id(76);
    IS_TRUE(s.has_internal_id());
    EQUAL(s.internal_id(), 76);
    s.clear_internal_id();
    IS_FALSE(s.has_internal_id());
    s.set_internal_id(0);
    IS_TRUE(s.has_internal_id());
    EQUAL(s.internal_id(), 0);

    EQUAL(Accessor::get_id(s), "real");
  }

  void test_general_usage() {
    arcs::Test_SpecialFields s1;
    Accessor::set_id(&s1, "id");
    s1.set_for("abc");
    s1.set_internal_id(15);
    NOT_EQUAL(hash(s1), 0);
    EQUAL(arcs::entity_to_str(s1), "{id}, for: abc, internal_id: 15");

    // same fields, different ids
    arcs::Test_SpecialFields s2 = arcs::clone_entity(s1);
    NOT_EQUAL(s1, s2);
    NOT_LESS(s1, s2);
    LESS(s2, s1);
    IS_TRUE(arcs::fields_equal(s1, s2));
    NOT_EQUAL(hash(s1), hash(s2));

    // same fields and ids
    Accessor::set_id(&s2, "id");
    EQUAL(s1, s2);
    NOT_LESS(s1, s2);
    NOT_LESS(s2, s1);
    IS_TRUE(arcs::fields_equal(s1, s2));
    EQUAL(hash(s1), hash(s2));

    // different fields
    s1.clear_for();
    NOT_EQUAL(s1, s2);
    LESS(s1, s2);
    NOT_LESS(s2, s1);
    IS_FALSE(arcs::fields_equal(s1, s2));
    NOT_EQUAL(hash(s1), hash(s2));
    s1.set_for("abc");

    s2.set_internal_id(12);
    NOT_EQUAL(s1, s2);
    NOT_LESS(s1, s2);
    LESS(s2, s1);
    IS_FALSE(arcs::fields_equal(s1, s2));
    NOT_EQUAL(hash(s1), hash(s2));
  }
};

DEFINE_PARTICLE(SpecialSchemaFieldsTest)
