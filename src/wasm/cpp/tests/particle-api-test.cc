#include "src/wasm/cpp/arcs.h"
#include "src/wasm/cpp/tests/entities.h"

class HandleSyncUpdateTest : public arcs::Particle {
public:
  HandleSyncUpdateTest() {
    registerHandle("sng", sng_);
    registerHandle("col", col_);
    registerHandle("res", res_);
  }

  void onHandleSync(const std::string& name, bool all_synced) override {
    arcs::HandleSyncUpdateTest_Res out;
    out.set_txt("sync:" + name + (all_synced ? ":true" : ":false"));
    res_.store(out);
  }

  void onHandleUpdate(const std::string& name) override {
    arcs::HandleSyncUpdateTest_Res out;
    out.set_txt("update:" + name);
    if (auto input = getSingleton<arcs::HandleSyncUpdateTest_Sng>(name)) {
      out.set_num(input->get().num());
    } else if (auto input = getCollection<arcs::HandleSyncUpdateTest_Col>(name)) {
      out.set_num(input->begin()->num());
    } else {
      out.set_txt("unexpected handle name: " + name);
    }
    res_.store(out);
  }

  arcs::Singleton<arcs::HandleSyncUpdateTest_Sng> sng_;
  arcs::Collection<arcs::HandleSyncUpdateTest_Col> col_;
  arcs::Collection<arcs::HandleSyncUpdateTest_Res> res_;
};

DEFINE_PARTICLE(HandleSyncUpdateTest)


class RenderTest : public arcs::Particle {
public:
  RenderTest() {
    registerHandle("flags", flags_);
  }

  std::string getTemplate(const std::string& slot_name) override {
    return "abc";
  }

  void populateModel(const std::string& slot_name, arcs::Dictionary* model) override {
    model->emplace("foo", "bar");
  }

  void onHandleUpdate(const std::string& name) override {
    const arcs::RenderTest_Flags& flags = flags_.get();
    renderSlot("root", flags._template(), flags.model());
  }

  arcs::Singleton<arcs::RenderTest_Flags> flags_;
};

DEFINE_PARTICLE(RenderTest)


class AutoRenderTest : public arcs::Particle {
public:
  AutoRenderTest() {
    registerHandle("data", data_);
    autoRender();
  }

  std::string getTemplate(const std::string& slot_name) override {
    const arcs::AutoRenderTest_Data& data = data_.get();
    return data.has_txt() ? data.txt() : "empty";
  }

  arcs::Singleton<arcs::AutoRenderTest_Data> data_;
};

DEFINE_PARTICLE(AutoRenderTest)


class EventsTest : public arcs::Particle {
public:
  EventsTest() {
    registerHandle("output", output_);
  }

  void fireEvent(const std::string& slot_name, const std::string& handler,
                 const arcs::Dictionary& eventData) override {
    arcs::EventsTest_Output out;
    out.set_txt("event:" + slot_name + ":" + handler + ":" + eventData.find("info")->second);
    output_.set(out);
  }

  arcs::Singleton<arcs::EventsTest_Output> output_;
};

DEFINE_PARTICLE(EventsTest)


class ServicesTest : public arcs::Particle {
public:
  ServicesTest() {
    registerHandle("output", output_);
  }

  void init() override {
    std::string url = resolveUrl("$resolve-me");
    arcs::ServicesTest_Output out;
    out.set_call("resolveUrl");
    out.set_payload(url);
    output_.store(out);

    serviceRequest("random.next", {}, "first");
    serviceRequest("random.next", {}, "second");
    serviceRequest("clock.now", {{"timeUnit", "DAYS"}});
  }

  void serviceResponse(
      const std::string& call, const arcs::Dictionary& response, const std::string& tag) override {
    std::string payload;
    for (const auto& pair : response) {
      payload += pair.first + ":" + pair.second + ";";
    }

    arcs::ServicesTest_Output out;
    out.set_call(call);
    out.set_tag(tag);
    out.set_payload(payload);
    output_.store(out);
  }

  arcs::Collection<arcs::ServicesTest_Output> output_;
};

DEFINE_PARTICLE(ServicesTest)


class MissingRegisterHandleTest : public arcs::Particle {};

DEFINE_PARTICLE(MissingRegisterHandleTest)
