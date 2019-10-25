#include "src/wasm/cpp/arcs.h"
#include "src/tests/source/entities.h"

class HotReloadTest : public arcs::Particle {
  std::string getTemplate(const std::string& slot_name) override {
    return R"(<div>Hello <span>{{name}}</span>, new age: <span>{{age}}</span></div>)";
  }

  void populateModel(const std::string& slot_name, arcs::Dictionary* model) override {
    model->emplace("name", "Jack");
    model->emplace("age", "15");
  }
};

DEFINE_PARTICLE(HotReloadTest)

class ReloadHandleTest : public arcs::Particle {
  public:
    ReloadHandleTest() {
      registerHandle("personIn", personIn);
      registerHandle("personOut", personOut);
    }
    void onHandleSync(const std::string& name, bool all_synced) override {
      update(name);
    }
    void onHandleUpdate(const std::string& name) override {
      update(name);
    }
    void update(const std::string& name) {
      arcs::Test_Person out;
      if (auto input = getSingleton<arcs::Test_Person>(name)) {
        out.set_name(input->get().name());
        out.set_age(input->get().age() - 2);
      } else {
        out.set_name("unexpected handle name: " + name);
      }
      personOut.set(&out);
    }
    arcs::Singleton<arcs::Test_Person> personIn;
    arcs::Singleton<arcs::Test_Person> personOut;
};

DEFINE_PARTICLE(ReloadHandleTest);
