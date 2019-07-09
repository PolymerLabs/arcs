#include "arcs.h"
#include "entity-data.h"
#include "entity-info.h"
#include <vector>

class TestParticle : public arcs::Particle {
public:
  using TestSingleton = arcs::Singleton<arcs::Data>;
  using TestCollection = arcs::Collection<arcs::Data>;

  TestParticle() {
    registerHandle("in_sng", in_sng_);
    registerHandle("ot_sng", ot_sng_);
    registerHandle("io_sng", io_sng_);
    registerHandle("in_col", in_col_);
    registerHandle("ot_col", ot_col_);
    registerHandle("io_col", io_col_);
    autoRender();
  }

  std::string getTemplate(const std::string& slot_name) override {
    return R"(
      <style>
        #panel { margin: 10px; }
        #panel pre { margin-left: 20px; }
        #panel button { margin-left: 20px; }
      </style>
      <div id="panel">
        <b>[in Singleton]</b>
        <button on-click="in_sng:get">get</button>
        <button on-click="in_sng:set">set (!)</button>
        <button on-click="in_sng:clear">clear (!)</button>
        <pre>{{in_sng}}</pre>

        <b>[out Singleton]</b>
        <button on-click="ot_sng:get">get (!)</button>
        <button on-click="ot_sng:set">set</button>
        <button on-click="ot_sng:clear">clear</button>
        <br><br>

        <b>[inout Singleton]</b>
        <button on-click="io_sng:get">get</button>
        <button on-click="io_sng:set">set</button>
        <button on-click="io_sng:clear">clear</button>
        <pre>{{io_sng}}</pre>

        <b>[in Collection]</b>
        <button on-click="in_col:size">size</button>
        <button on-click="in_col:empty">empty</button>
        <button on-click="in_col:begin">begin</button>
        <button on-click="in_col:end">end</button>
        <button on-click="in_col:store">store (!)</button>
        <button on-click="in_col:remove">remove (!)</button>
        <button on-click="in_col:clear">clear (!)</button>
        <pre>{{in_col}}</pre>

        <b>[out Collection]</b>
        <button on-click="ot_col:size">size (!)</button>
        <button on-click="ot_col:empty">empty (!)</button>
        <button on-click="ot_col:begin">begin (!)</button>
        <button on-click="ot_col:end">end (!)</button>
        <button on-click="ot_col:store">store</button>
        <button on-click="ot_col:remove">remove</button>
        <button on-click="ot_col:clear">clear</button>
        <br><br>

        <b>[inout Collection]</b>
        <button on-click="io_col:size">size</button>
        <button on-click="io_col:empty">empty</button>
        <button on-click="io_col:begin">begin</button>
        <button on-click="io_col:end">end</button>
        <button on-click="io_col:store">store</button>
        <button on-click="io_col:remove">remove</button>
        <button on-click="io_col:clear">clear</button>
        <pre>{{io_col}}</pre>

        <b>Errors</b>
        <button on-click="_:throw">throw</button>
        <button on-click="_:assert">assert</button>
        <button on-click="_:abort">abort</button>
        <button on-click="_:exit">exit</button>
      </div>)";
  }

  void populateModel(const std::string& slot_name, arcs::Dictionary* model) override {
    model->emplace("in_sng", arcs::entity_to_str(in_sng_.get(), "\n"));
    model->emplace("io_sng", arcs::entity_to_str(io_sng_.get(), "\n"));
    model->emplace("in_col", collectionToStr(in_col_));
    model->emplace("io_col", collectionToStr(io_col_));
  }

  std::string collectionToStr(const TestCollection& col) {
    if (col.empty()) {
      return "(empty)";
    }
    std::string str = "Size: " + std::to_string(col.size()) + "\n";
    int i = 0;
    for (const arcs::Data& data : col) {
      str += std::to_string(++i) + ". " + arcs::entity_to_str(data, " | ") + "\n";
    }
    return str;
  }

  void fireEvent(const std::string& slot_name, const std::string& handler) override {
    size_t pos = handler.find(':');
    std::string name = handler.substr(0, pos);
    std::string action = handler.substr(pos + 1);

    arcs::Handle* handle = getHandle(name);
    if (handle != nullptr) {
      processSingleton(dynamic_cast<TestSingleton*>(handle), action);
      processCollection(dynamic_cast<TestCollection*>(handle), action);
    } else if (action == "throw") {
      throw std::invalid_argument("this message doesn't get passed (yet?)");
    } else if (action == "assert") {
      assert(2 + 2 == 3);
    } else if (action == "abort") {
      abort();
    } else if (action == "exit") {
      exit(1);
    }
    renderSlot("root", false, true);
  }

  void processSingleton(TestSingleton* handle, const std::string& action) {
    if (handle == nullptr) return;
    if (action == "get") {
      console("%s\n", arcs::entity_to_str(handle->get()).c_str());
    } else if (action == "set") {
      arcs::Data data = arcs::clone_entity(in_sng_.get());
      data.set_num(data.num() * 2);
      data.set_txt(data.txt() + "!!!");
      data.clear_lnk();
      handle->set(&data);
    } else if (action == "clear") {
      handle->clear();
    }
  }

  void processCollection(TestCollection* handle, const std::string& action) {
    if (handle == nullptr) return;
    if (action == "size") {
      console("size: %lu\n", handle->size());
    } else if (action == "empty") {
      console("empty: %s\n", handle->empty() ? "true" : "false");
    } else if (action == "begin") {
      console("begin: %s\n", arcs::entity_to_str(*handle->begin()).c_str());
    } else if (action == "end") {
      handle->end();
      console("end: succeeded\n");
    } else if (action == "store") {
      arcs::Data data = arcs::clone_entity(in_sng_.get());
      data.set_num(data.num() * 3);
      data.set_txt(data.txt() + "???");
      data.clear_flg();
      handle->store(&data);
      if (handle->name() == "ot_col") {
        stored_.push_back(std::move(data));
      }
    } else if (action == "remove") {
      if (handle->name() == "ot_col") {
        // Can't read from ot_col; remove previously stored entities.
        if (!stored_.empty()) {
          handle->remove(stored_.back());
          stored_.pop_back();
        }
      } else {
        handle->remove(*handle->begin());
      }
    } else if (action == "clear") {
      handle->clear();
    }
  }

private:
  TestSingleton in_sng_;
  TestSingleton ot_sng_;
  TestSingleton io_sng_;

  TestCollection in_col_;
  TestCollection ot_col_;
  TestCollection io_col_;

  std::vector<arcs::Data> stored_;
};

DEFINE_PARTICLE(TestParticle)


class SimpleParticle : public arcs::Particle {
public:
  SimpleParticle() {
    registerHandle("info", info_);
  }

  void onHandleSync(arcs::Handle* handle, bool all_synced) override {
    onHandleUpdate(handle);
  }

  void onHandleUpdate(arcs::Handle* handle) override {
    local_ = arcs::clone_entity(info_.get());
    renderSlot("root", false, true);
  }

  std::string getTemplate(const std::string& slot_name) override {
    return R"(<div on-click="click"><i>{{first}}</i> : <b>{{second}}</b></div>)";
  }

  void populateModel(const std::string& slot_name, arcs::Dictionary* model) override {
    model->emplace("first", local_._for());
    model->emplace("second", arcs::num_to_str(local_.internal_id()));
  }

  void fireEvent(const std::string& slot_name, const std::string& handler) override {
    if (local_.has_for()) {
      local_.set_for(local_._for() + "*");
    }
    if (local_.has_internal_id()) {
      local_.set_internal_id(local_.internal_id() + 1);
    }
    renderSlot("root", false, true);
  }

  arcs::Singleton<arcs::Info> info_;
  arcs::Info local_;
};

DEFINE_PARTICLE(SimpleParticle)


class ServiceParticle : public arcs::Particle {
public:
  void init() override {
    serviceRequest("ml5.classifyImage", {{"imageUrl", url_}});
    serviceRequest("random.next", {}, "first");
    serviceRequest("random.next", {}, "second");
  }

  std::string getTemplate(const std::string& slot_name) override {
    return R"(<h2>Classification with ML5 in WASM</h2>
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

  // TODO: provide resolver function for wasm particles
  std::string url_ = "http://localhost:8786/particles/Services/assets/waltbird.jpg";
  std::string label_;
  std::string probability_;
  std::string random_[2];
};

DEFINE_PARTICLE(ServiceParticle)
