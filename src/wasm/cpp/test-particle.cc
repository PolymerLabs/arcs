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

  void onHandleSync(arcs::Handle* handle, bool all_synced) override {
    if (all_synced) {
      console("All handles synced\n");
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

  void requestRender(const std::string& slot_name) override {
    std::string data_col = (updated_ == 1) ? "color: blue;" : "";
    std::string data_str = arcs::entity_to_str(data_.get(), "\n");

    std::string info_col = (updated_ == 2) ? "color: blue;" : "";
    std::string info_str = "Size: " + std::to_string(info_.size()) + "\n";
    if (!info_.empty()) {
      int i = 0;
      for (const arcs::Info& info : info_) {
        info_str += std::to_string(++i) + ". " + arcs::entity_to_str(info, " | ") + "\n";
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
        th,td { padding: 4px 16px; }
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
          <th>Errors</th>
        </tr>
        <tr>
          <td><button on-click="set">Set</button></td>
          <td><button on-click="store">Store</button></td>
          <td>
            <button on-click="throw">Throw</button> &nbsp;
            <button on-click="abort">Abort</button>
          </td>
        </tr>
        <tr>
          <td><button on-click="vclear">Clear</button></td>
          <td><button on-click="remove">Remove</button></td>
          <td>
            <button on-click="assert">Assert</button> &nbsp;
            <button on-click="exit">Exit</button>
          </td>
        </tr>
        <tr>
          <td></td>
          <td><button on-click="cclear">Clear</button></td>
        </tr>
      </table>)";

    renderSlot(slot_name.c_str(), content.c_str());
  }

  void fireEvent(const std::string& slot_name, const std::string& handler) override {
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
        info_.remove(*it);
      }
    } else if (handler == "cclear") {
      info_.clear();
    } else if (handler == "throw") {
      throw std::invalid_argument("this message doesn't get passed (yet?)");
    } else if (handler == "assert") {
      assert(2 + 2 == 3);
    } else if (handler == "abort") {
      abort();
    } else if (handler == "exit") {
      exit(1);
    }
    requestRender("root");
  }

  arcs::Singleton<arcs::Data> data_;
  arcs::Singleton<arcs::Data> res_;
  arcs::Collection<arcs::Info> info_;
  int updated_ = 0;
  int store_count_ = 0;
};

DEFINE_PARTICLE(TestParticle)
