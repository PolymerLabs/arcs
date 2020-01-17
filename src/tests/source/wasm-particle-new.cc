#include "src/wasm/cpp/arcs.h"
#include "src/tests/source/entities.h"

class HotReloadTest : public AbstractHotReloadTest {
  std::string getTemplate(const std::string& slot_name) override {
    return R"(<div>Hello <span>{{name}}</span>, new age: <span>{{age}}</span></div>)";
  }

  void populateModel(const std::string& slot_name, arcs::Dictionary* model) override {
    model->emplace("name", "Jack");
    model->emplace("age", "15");
  }
};

DEFINE_PARTICLE(HotReloadTest)

class ReloadHandleTest : public AbstractReloadHandleTest {
public:
  void onHandleSync(const std::string& name, bool all_synced) override {
    onHandleUpdate(name);
  }

  void onHandleUpdate(const std::string& name) override {
    arcs::ReloadHandleTest_PersonOut out;
    if (auto input = getSingleton<arcs::ReloadHandleTest_PersonIn>(name)) {
      out.set_name(input->get()->name());
      out.set_age(input->get()->age() - 2);
    } else {
      out.set_name("unexpected handle name: " + name);
    }
    personOut_.set(out);
  }
};

DEFINE_PARTICLE(ReloadHandleTest);
