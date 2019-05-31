#include <emscripten.h>
#include "arcs.h"
#include "entity-data.h"
#include "entity-info.h"

class TestParticle : public arcs::Particle {
public:
  TestParticle() {
    registerHandle("data", data_);
    registerHandle("res", res_);
    registerHandle("info", info_);
  }

  void onHandleSync(arcs::Handle* handle) override {
    if (to_sync_ && handle->name() != "res" && --to_sync_ == 0) {
      requestRender("root");
    }
  }

  void onHandleUpdate(arcs::Handle* handle) override {
    if (handle->name() == "data") {
      updated_ = 1;
    } else if (handle->name() == "info") {
      updated_ = 2;
    }
    requestRender("root");
  }

  void fireEvent(const std::string& slotName, const std::string& handler) override {
    if (handler == "set") {
      arcs::Data res = data_.get();
      res.set_num(res.num() * 2);
      res.set_txt(res.txt() + "!!!!!!");
      res.clear_lnk();
      res_.set(res);
    } else if (handler == "vclear") {
      res_.clear();
    } else if (handler == "store") {
      arcs::Info info;
      info._internal_id = "wasm" + std::to_string(++store_count_);
      info.set_val(info_.size() + store_count_);
      info_.store(info);
    } else if (handler == "remove") {
      auto it = info_.begin();
      if (it != info_.end()) {
        info_.remove(*it->second);
      }
    } else if (handler == "cclear") {
      info_.clear();
    }
    requestRender("root");
  }

  void requestRender(const std::string& slotName) override {
    std::string data_col = (updated_ == 1) ? "color: blue;" : "";
    std::string data_str = arcs::entity_to_str(data_.get(), "<br>");

    std::string info_col = (updated_ == 2) ? "color: blue;" : "";
    std::string info_str;
    if (info_.size() > 0) {
      int i = 0;
      for (auto it = info_.begin(); it != info_.end(); ++it) {
        info_str += std::to_string(++i) + ". " + arcs::entity_to_str(*it->second, " | ") + "<br>";
      }
    } else {
      info_str = "<i>(empty)</i>";
    }

    std::string content = R"(
      <style>
        #data {)" + data_col + R"(}
        #info {)" + info_col + R"(}
        #panel { margin: 10px; }
        #panel pre { margin-left: 20px; }
        th,td { padding: 4px 10px; }
      </style>
      <div id="panel">
        <b id="data">[data]</b>
        <pre>)" + data_str + R"(</pre>
        <b id="info">[info]</b>
        <pre>)" + info_str + R"(</pre>
      </div>
      <table>
        <tr>
          <th>Singleton</th>
          <th>Collection</th>
          <th></th>
        </tr>
        <tr>
          <td><button on-click="set">Set</button></td>
          <td><button on-click="store">Store</button></td>
        </tr>
        <tr>
          <td><button on-click="vclear">Clear</button></td>
          <td><button on-click="remove">Remove</button></td>
        </tr>
        <tr>
          <td></td>
          <td><button on-click="cclear">Clear</button></td>
        </tr>
      </table>)";

    renderSlot(slotName.c_str(), content.c_str());
  }

  arcs::Singleton<arcs::Data> data_;
  arcs::Singleton<arcs::Data> res_;
  arcs::Collection<arcs::Info> info_;
  int to_sync_ = 2;  // TODO: automatic handling of this
  int updated_ = 0;
  int store_count_ = 0;
};

DEFINE_PARTICLE(TestParticle)
