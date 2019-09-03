#include <arcs.h>

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
