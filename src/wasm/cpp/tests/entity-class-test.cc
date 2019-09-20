#include <vector>
#include <unordered_set>
#include <map>
#include <algorithm>
#include <functional>

#include "src/wasm/cpp/arcs.h"
#include "src/wasm/cpp/tests/entities.h"

class InternalsTestBase : public arcs::Particle {
public:
  InternalsTestBase() {
    registerHandle("errors", errors_);
  }

  void check(bool ok, const std::string& condition, const std::string& file, int line) {
    if (!ok) {
      arcs::Data err;
      err.set_txt("[" + test_name_ + "] " + file + ":" + std::to_string(line) +
                  ": expected " + condition);
      errors_.store(&err);
    }
  }

  std::string test_name_;
  arcs::Collection<arcs::Data> errors_;
};

#define RUN(test) \
  test_name_ = #test; \
  test()

#define IS_TRUE(expression) \
  check((expression), "'" #expression "' to be true", __FILE__, __LINE__)

#define IS_FALSE(expression) \
  check(!(expression), "'" #expression "' to be false", __FILE__, __LINE__)

#define EQUAL(expression, expected) \
  check((expression) == (expected), "'" #expression "' to equal '" #expected "'", __FILE__, __LINE__)

#define NOT_EQUAL(expression, expected) \
  check((expression) != (expected), "'" #expression "' to not equal '" #expected "'", __FILE__, __LINE__)

#define LESS(lhs, rhs) \
  check((lhs) < (rhs), "'" #lhs "' to be less than '" #rhs "'", __FILE__, __LINE__)

#define NOT_LESS(lhs, rhs) \
  check(!((lhs) < (rhs)), "'" #lhs "' to not be less than '" #rhs "'", __FILE__, __LINE__)

template<typename T>
size_t hash(const T& d) {
  return std::hash<T>()(d);
}

template<typename T>
const std::string& get_id(const T& entity) {
  return arcs::internal::Accessor<T>::get_id(entity);
}

template<typename T>
void set_id(T* entity, const std::string& id) {
  arcs::internal::Accessor<T>::set_id(entity, id);
}

class EntityClassApiTest : public InternalsTestBase {
public:
  void init() override {
    RUN(test_field_methods);
    RUN(test_id_equality);
    RUN(test_number_field_equality);
    RUN(test_text_field_equality);
    RUN(test_url_field_equality);
    RUN(test_boolean_field_equality);
    RUN(test_entity_equality);
    RUN(test_clone_entity);
    RUN(test_entity_to_str);
    RUN(test_stl_vector);
    RUN(test_stl_unordered_set);
    RUN(test_stl_map);
  }

  void test_field_methods() {
    arcs::Data d;

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
  }

  void test_id_equality() {
    arcs::Data d1, d2;
    EQUAL(get_id(d1), "");

    // unset vs value
    set_id(&d1, "id_a");
    EQUAL(get_id(d1), "id_a");
    NOT_EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    LESS(d2, d1);

    // value vs value
    set_id(&d2, "id_b");
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);

    set_id(&d2, "id_a");
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);
  }

  void test_number_field_equality() {
    arcs::Data d1, d2;

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
    arcs::Data d1, d2;

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
    arcs::Data d1, d2;

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
    arcs::Data d1, d2;

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

  void test_entity_equality() {
    arcs::Data d1, d2;

    // Empty entities are equal
    EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    NOT_LESS(d2, d1);
    IS_TRUE(arcs::fields_equal(d1, d2));
    EQUAL(hash(d1), hash(d2));

    // Entities with the same fields are equal
    for (arcs::Data* d : std::vector{&d1, &d2}) {
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
    set_id(&d1, "id_a");
    NOT_EQUAL(d1, d2);
    NOT_LESS(d1, d2);
    LESS(d2, d1);
    IS_TRUE(arcs::fields_equal(d1, d2));
    NOT_EQUAL(hash(d1), hash(d2));

    set_id(&d2, "id_b");
    NOT_EQUAL(d1, d2);
    LESS(d1, d2);
    NOT_LESS(d2, d1);
    IS_TRUE(arcs::fields_equal(d1, d2));
    NOT_EQUAL(hash(d1), hash(d2));

    // Entities with the same fields and ids are op== and fields_equal()
    set_id(&d2, "id_a");
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
    arcs::Data src;
    arcs::Data d1 = arcs::clone_entity(src);
    EQUAL(d1, src);
    IS_TRUE(arcs::fields_equal(d1, src));
    EQUAL(hash(d1), hash(src));

    src.set_num(8);
    src.set_txt("def");
    src.set_flg(false);
    arcs::Data d2 = arcs::clone_entity(src);
    EQUAL(d2, src);
    IS_TRUE(arcs::fields_equal(d2, src));
    EQUAL(hash(d2), hash(src));

    // Cloning doesn't include the internal id.
    set_id(&src, "id");
    arcs::Data d3 = arcs::clone_entity(src);
    EQUAL(get_id(d3), "");
    NOT_EQUAL(d3, src);
    IS_TRUE(arcs::fields_equal(d3, src));
    NOT_EQUAL(hash(d3), hash(src));
  }

  void test_entity_to_str() {
    arcs::Data d;
    EQUAL(arcs::entity_to_str(d), "{}");

    d.set_num(6);
    d.set_txt("boo");
    d.set_flg(false);
    EQUAL(arcs::entity_to_str(d), "{}, num: 6, txt: boo, flg: false");
    EQUAL(arcs::entity_to_str(d, "|"), "{}|num: 6|txt: boo|flg: false");

    set_id(&d, "id");
    d.clear_flg();
    EQUAL(arcs::entity_to_str(d), "{id}, num: 6, txt: boo");
  }

  void test_stl_vector() {
    arcs::Data d1, d2, d3;
    d1.set_num(12);
    d2.set_num(12);
    set_id(&d3, "id");

    std::vector<arcs::Data> v;
    v.push_back(std::move(d1));
    v.push_back(std::move(d2));
    v.push_back(std::move(d3));
    EQUAL(v.size(), 3);
    EQUAL(get_id(v[0]), "");
    EQUAL(v[0].num(), 12);
    EQUAL(get_id(v[1]), "");
    EQUAL(v[1].num(), 12);
    EQUAL(get_id(v[2]), "id");
    IS_FALSE(v[2].has_num());
  }

  void test_stl_unordered_set() {
    arcs::Data d1;
    d1.set_num(45);
    d1.set_txt("woop");

    // duplicate
    arcs::Data d2;
    d2.set_num(45);
    d2.set_txt("woop");

    // duplicate fields but with an id
    arcs::Data d3;
    set_id(&d3, "id");
    d3.set_num(45);
    d3.set_txt("woop");

    // same id, different fields
    arcs::Data d4;
    set_id(&d4, "id");
    d4.set_flg(false);

    // duplicate
    arcs::Data d5 = arcs::clone_entity(d4);
    set_id(&d5, "id");

    std::unordered_set<arcs::Data> s;
    s.insert(std::move(d1));
    s.insert(std::move(d2));
    s.insert(std::move(d3));
    s.insert(std::move(d4));
    s.insert(std::move(d5));
    EQUAL(s.size(), 3);

    std::vector<std::string> res;
    for (const auto& d : s) {
      res.push_back(arcs::entity_to_str(d));
    }
    std::sort(res.begin(), res.end());
    EQUAL(res[0], "{id}, flg: false");
    EQUAL(res[1], "{id}, num: 45, txt: woop");
    EQUAL(res[2], "{}, num: 45, txt: woop");
  }

  void test_stl_map() {
    arcs::Data d1;
    d1.set_num(45);
    d1.set_txt("woop");

    // duplicate
    arcs::Data d2;
    d2.set_num(45);
    d2.set_txt("woop");

    // duplicate fields but with an id
    arcs::Data d3;
    set_id(&d3, "id");
    d3.set_num(45);
    d3.set_txt("woop");

    // same id, different fields
    arcs::Data d4;
    set_id(&d4, "id");
    d4.set_flg(false);

    // duplicate
    arcs::Data d5 = arcs::clone_entity(d4);
    set_id(&d5, "id");

    std::map<std::string, arcs::Data> m;
    m.emplace("1", std::move(d1));
    m.emplace("2", std::move(d2));
    m.emplace("3", std::move(d3));
    m.emplace("4", std::move(d4));
    m.emplace("5", std::move(d5));
    EQUAL(m.size(), 5);

    std::vector<std::string> res;
    for (const auto& pair : m) {
      res.push_back(pair.first + " " + arcs::entity_to_str(pair.second));
    }
    std::sort(res.begin(), res.end());
    EQUAL(res[0], "1 {}, num: 45, txt: woop");
    EQUAL(res[1], "2 {}, num: 45, txt: woop");
    EQUAL(res[2], "3 {id}, num: 45, txt: woop");
    EQUAL(res[3], "4 {id}, flg: false");
    EQUAL(res[4], "5 {id}, flg: false");
  }
};

DEFINE_PARTICLE(EntityClassApiTest)


class SpecialSchemaFieldsTest : public InternalsTestBase {
public:
  void init() override {
    RUN(test_language_keyword_field);
    RUN(test_internal_id_field);
    RUN(test_general_usage);
  }

  // Test that language keywords can be field names.
  void test_language_keyword_field() {
    arcs::SpecialFields s;

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
    arcs::SpecialFields s;
    set_id(&s, "real");

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

    EQUAL(get_id(s), "real");
  }

  void test_general_usage() {
    arcs::SpecialFields s1;
    set_id(&s1, "id");
    s1.set_for("abc");
    s1.set_internal_id(15);
    NOT_EQUAL(hash(s1), 0);
    EQUAL(arcs::entity_to_str(s1), "{id}, for: abc, internal_id: 15");

    // same fields, different ids
    arcs::SpecialFields s2 = arcs::clone_entity(s1);
    NOT_EQUAL(s1, s2);
    NOT_LESS(s1, s2);
    LESS(s2, s1);
    IS_TRUE(arcs::fields_equal(s1, s2));
    NOT_EQUAL(hash(s1), hash(s2));

    // same fields and ids
    set_id(&s2, "id");
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
