#include "arcs.h"
#include "entity-data.h"
#include "entity-info.h"

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
  }

  void onHandleSync(arcs::Handle* handle, bool all_synced) override {
    if (all_synced) {
      requestRender("root");
    }
  }

  void onHandleUpdate(arcs::Handle* handle) override {
    requestRender("root");
  }

  void requestRender(const std::string& slot_name) override {
    std::string content = R"(
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
        <pre>)" + arcs::entity_to_str(in_sng_.get(), "\n") + R"(</pre>

        <b>[out Singleton]</b>
        <button on-click="ot_sng:get">get (!)</button>
        <button on-click="ot_sng:set">set</button>
        <button on-click="ot_sng:clear">clear</button>
        <br><br>

        <b>[inout Singleton]</b>
        <button on-click="io_sng:get">get</button>
        <button on-click="io_sng:set">set</button>
        <button on-click="io_sng:clear">clear</button>
        <pre>)" + arcs::entity_to_str(io_sng_.get(), "\n") + R"(</pre>

        <b>[in Collection]</b>
        <button on-click="in_col:size">size</button>
        <button on-click="in_col:empty">empty</button>
        <button on-click="in_col:begin">begin</button>
        <button on-click="in_col:end">end</button>
        <button on-click="in_col:store">store (!)</button>
        <button on-click="in_col:remove">remove (!)</button>
        <button on-click="in_col:clear">clear (!)</button>
        <pre>)" + collectionToStr(in_col_) + R"(</pre>

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
        <pre>)" + collectionToStr(io_col_) + R"(</pre>

        <b>Errors</b>
        <button on-click="_:throw">throw</button>
        <button on-click="_:assert">assert</button>
        <button on-click="_:abort">abort</button>
        <button on-click="_:exit">exit</button>
      </div>)";
    renderSlot(slot_name.c_str(), content.c_str());
  }

  std::string collectionToStr(const TestCollection& col) {
    if (col.empty()) {
      return "<i>(empty)</i>";
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
    requestRender("root");
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
      stored_ = arcs::clone_entity(in_sng_.get());
      stored_.set_num(stored_.num() * 3);
      stored_.set_txt(stored_.txt() + "???");
      stored_.clear_flg();
      handle->store(&stored_);
    } else if (action == "remove") {
      if (handle->name() == "ot_col") {
        // Can't read from ot_col, so remove the last stored entity.
        handle->remove(stored_);
      } else {
        handle->remove(*handle->begin());
      }
    } else if (action == "clear") {
      handle->clear();
    }
  }

  TestSingleton in_sng_;
  TestSingleton ot_sng_;
  TestSingleton io_sng_;

  TestCollection in_col_;
  TestCollection ot_col_;
  TestCollection io_col_;

  arcs::Data stored_;
};

DEFINE_PARTICLE(TestParticle)
