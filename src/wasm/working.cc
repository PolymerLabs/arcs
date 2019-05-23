#include <emscripten.h>
#include <stdio.h>
#include <stdlib.h>
#include <string_view>
#include <string>
#include <map>
#include "arcs.h"
#include "entity-data.h"

class Handle;

EM_JS(void, handleSet, (Handle* handle, int num), {})
EM_JS(void, render, (const char* slotName, const char* content), {})

class Handle {
public:
  Handle(const char* name) : name_(name) {}

  ~Handle() {
    if (name_ != nullptr) {
      free((void*)name_);
      name_ = nullptr;
    }
  }

  const char* name() { return name_; }

  void sync(const char* encoded) {
    console("sync %s [%s]\n", name_, encoded);
    data_ = arcs::Data::decode(encoded);

    console("txt: %s\n", data_.txt.c_str());
    console("lnk: %s\n", data_.lnk.href.c_str());
    console("num: %.2f\n", data_.num);
    console("flg: %d\n", data_.flg);

    console("c_txt:");
    for (const auto& v : data_.c_txt) {
      console(" [%s]", v.c_str());
    }
    console("\n");

    console("c_lnk:");
    for (const auto& v : data_.c_lnk) {
      console(" [%s]", v.href.c_str());
    }
    console("\n");

    console("c_num:");
    for (const auto& v : data_.c_num) {
      console(" %.2f", v);
    }
    console("\n");

    console("c_flg:");
    for (const auto& v : data_.c_flg) {
      console(" %s", v ? "true" : "false");
    }
    console("\n");
  }

  const char* name_;
  arcs::Data data_;
};


class Particle {
public:
  virtual ~Particle() {}

  Handle* newHandle(const char* name) {
    Handle* h = new Handle(name);
    handles_[name] = h;
    return h;
  }

  // Equivalent to setHandles() in the JS Particle.
  virtual void init() {}

  virtual void onHandleSync(Handle* handle) {}
  virtual void requestRender(const char* slotName) {}
  virtual void fireEvent(const char* slotName, const char* handler) {}

  std::map<std::string_view, Handle*> handles_;
};


class TestParticle : public Particle {
public:
  virtual ~TestParticle() {}

  void onHandleSync(Handle* handle) override {
    if (strcmp(handle->name(), "data") == 0) {
      console("onHandleSync\n");
    }
  }

  void requestRender(const char* slotName) override {
    const char* style = toggle_ ? "b" : "i";
    std::string content = "<div on-click=\"me\"><";
    content += style;
    content += ">Hello from <span on-click=\"THE_WASM\">wasm!</span> This slot is '";
    content += slotName;
    content += "'</";
    content += style;
    content += "></div>";
    render(slotName, content.c_str());
  }

  void fireEvent(const char* slotName, const char* handler) override {
    if (strcmp(handler, "me") == 0) {
      console("You clicked %s!\n", handler);
    } else {
      error("You clicked %s!\n", handler);
    }
    toggle_ = 1 - toggle_;
    requestRender("root");
  }

  int toggle_ = 0;
};

DEFINE_PARTICLE(TestParticle)


extern "C" {

// Takes ownership of 'name'.
EMSCRIPTEN_KEEPALIVE
Handle* newHandle(Particle* particle, const char* name) {
  return particle->newHandle(name);
}

EMSCRIPTEN_KEEPALIVE
void initParticle(Particle* particle) {
  particle->init();
}

// Does not take ownership of 'buffer'; external caller frees.
EMSCRIPTEN_KEEPALIVE
void syncHandle(Particle* particle, Handle* handle, const char* encoded) {
  handle->sync(encoded);
  particle->onHandleSync(handle);
}

// Does not take ownership of 'slotName'; external caller frees.
// Caller also takes ownership of returned allocated buffer.
EMSCRIPTEN_KEEPALIVE
void requestRender(Particle* particle, const char* slotName) {
  particle->requestRender(slotName);
}

// Does not take ownership of 'slotName' or 'handler'; external caller frees.
EMSCRIPTEN_KEEPALIVE
void fireEvent(Particle* particle, const char* slotName, const char* handler) {
  particle->fireEvent(slotName, handler);
}

}
