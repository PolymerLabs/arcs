#include <arcs.h>
#include <working.h>
#include <vector>

// This is an internal development file; not intended to be a particularly readable reference for
// new users.

class ServiceParticle : public arcs::Particle {
public:
  void init() override {
    url_ = resolveUrl("https://$particles/Services/assets/waltbird.jpg");
    serviceRequest("ml5.classifyImage", {{"imageUrl", url_}});
    serviceRequest("random.next", {}, "first");
    serviceRequest("random.next", {}, "second");
  }

  std::string getTemplate(const std::string& slot_name) override {
    return R"(<h2>Classification with ML5 in WASM via C++</h2>
              <img style="max-width: 240px;" src="{{imageUrl}}"><br>
              <div>Label: <span>{{label}}</span></div>
              <div>Confidence: <span>{{probability}}</span></div>
              <br>
              <div>And here's some random numbers:<div>
              <ul>
                <li>{{rnd1}}</li>
                <li>{{rnd2}}</li>
              </ul>)";
  }

  void populateModel(const std::string& slot_name, arcs::Dictionary* model) override {
    model->emplace("imageUrl", url_);
    model->emplace("label", label_.size() ? label_ : "<working>");
    model->emplace("probability", probability_.size() ? probability_ : "<working>");
    model->emplace("rnd1", random_[0].size() ? random_[0] : "<working>");
    model->emplace("rnd2", random_[1].size() ? random_[1] : "<working>");
  }

  void serviceResponse(const std::string& call, const arcs::Dictionary& response, const std::string& tag) override {
    console("service call '%s' (tag '%s') completed\n", call.c_str(), tag.c_str());
    if (call == "ml5.classifyImage") {
      label_ = response.at("label");
      probability_ = response.at("probability");
    } else {
      random_[(tag == "first") ? 0 : 1] = response.at("value");
    }
    renderSlot("root");
  }

  std::string url_ ;
  std::string label_;
  std::string probability_;
  std::string random_[2];
};

DEFINE_PARTICLE(ServiceParticle)
