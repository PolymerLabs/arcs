#ifndef _ARCS_H
#define _ARCS_H

#include <emscripten.h>
#include <string>
#include <vector>
#include <unordered_map>
#include <unordered_set>
#include <memory>

namespace arcs {

using URL = std::string;

class Handle;

namespace internal {

// --- Logging and error handling ---
// console() and error() use printf-style formatting. File and line info is added automatically.
EM_JS(void, setLogInfo, (const char* file, int line), {})

#define console(...) do {                           \
    arcs::internal::setLogInfo(__FILE__, __LINE__); \
    printf(__VA_ARGS__);                            \
  } while (0)

#define error(...) do {                             \
    arcs::internal::setLogInfo(__FILE__, __LINE__); \
    fprintf(stderr, __VA_ARGS__);                   \
  } while (0)


// Wrap various extern functions that trigger errors with a single call point.
EM_JS(void, systemError, (const char* msg), {})

extern "C" {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Winvalid-noreturn"

EMSCRIPTEN_KEEPALIVE
void exit(int status) {
  std::string msg = "exit(" + std::to_string(status) +")";
  systemError(msg.c_str());
}

EMSCRIPTEN_KEEPALIVE
void abort() {
  systemError("abort");
}

EMSCRIPTEN_KEEPALIVE
void llvm_trap() {
  systemError("llvm_trap");
}

EMSCRIPTEN_KEEPALIVE
void __cxa_pure_virtual() {
  systemError("__cxa_pure_virtual");
}

EMSCRIPTEN_KEEPALIVE
void __setErrNo(int value) {
  std::string msg = "__setErrNo(" + std::to_string(value) +")";
  systemError(msg.c_str());
}

EMSCRIPTEN_KEEPALIVE
void __assert_fail(const char* condition, const char* filename, int line, const char* func) {
  std::string msg = std::string("Assertion failed: '") + condition  + "' at " + filename +
                    ":" + std::to_string(line) + ", function '" + func + "'";
  systemError(msg.c_str());
}

EMSCRIPTEN_KEEPALIVE
void* __cxa_allocate_exception(size_t size) {
  return malloc(size);
}

EMSCRIPTEN_KEEPALIVE
void __cxa_free_exception(void* ptr) {
  free(ptr);
}

// No idea how to get at the exception contents (including any error message included).
// Even emscripten doesn't seem to implement this in a useful way.
EMSCRIPTEN_KEEPALIVE
void __cxa_throw(void* thrown_exception, std::type_info* info, void (*dtor)(void*)) {
  std::string msg = std::string("Exception: ") + info->name();
  systemError(msg.c_str());
}

// Not sure what to do with this...
EMSCRIPTEN_KEEPALIVE
bool __cxa_uncaught_exception() {
  return false;
}

// System calls "needed" for printf support.
EMSCRIPTEN_KEEPALIVE int __syscall140(int, int) { return 0; }  // sys_lseek
EMSCRIPTEN_KEEPALIVE int __syscall6(int, int) { return 0; }    // sys_close
EMSCRIPTEN_KEEPALIVE int __syscall54(int, int) { return 0; }   // sys_ioctl

#pragma clang diagnostic pop
}


// --- Packaging classes ---
// Used by the code generated from Schema definitions to pack and unpack serialised data.

// Strips trailing zeros, and the decimal point for integer values.
std::string num_to_str(double num) {
  std::string s = std::to_string(num);
  auto i = s.size() - 1;
  while (i > 0 && s[i] == '0') {
    i--;
  }
  s.erase((s[i] == '.') ? i : i + 1);
  return s;
}

// TODO: error handling
class StringDecoder {
public:
  StringDecoder(const char* str) : str_(str) {}

  StringDecoder(StringDecoder&) = delete;
  StringDecoder(const StringDecoder&) = delete;
  StringDecoder& operator=(StringDecoder&) = delete;
  StringDecoder& operator=(const StringDecoder&) const = delete;

  bool done() {
    return str_ == nullptr || *str_ == 0;
  }

  std::string upTo(char sep) {
    const char *p = strchr(str_, sep);
    if (p == nullptr) {
      error("Packaged entity decoding failed in upTo()\n");
      return "";
    }
    std::string token(str_, p - str_);
    str_ = p + 1;
    return token;
  }

  int getInt(char sep) {
    std::string token = upTo(':');
    return atoi(token.c_str());
  }

  std::string chomp(int len) {
    // TODO: detect overrun
    std::string token(str_, len);
    str_ += len;
    return token;
  }

  void validate(std::string token) {
    if (chomp(token.size()) != token) {
      error("Packaged entity decoding failed in validate()\n");
    }
  }

  template<typename T>
  void decode(T& val) {
    val._force_compiler_error();
  }

private:
  const char* str_;
};

template<>
void StringDecoder::decode(std::string& text) {
  int len = getInt(':');
  text = chomp(len);
}

template<>
void StringDecoder::decode(double& num) {
  std::string token = upTo(':');
  num = atof(token.c_str());
}

template<>
void StringDecoder::decode(bool& flag) {
  flag = (chomp(1)[0] == '1');
}

class StringEncoder {
public:
  StringEncoder() = default;

  StringEncoder(StringEncoder&) = delete;
  StringEncoder(const StringEncoder&) = delete;
  StringEncoder& operator=(StringEncoder&) = delete;
  StringEncoder& operator=(const StringEncoder&) const = delete;

  template<typename T>
  void encode(const char* prefix, const T& val) {
    val._force_compiler_error();
  }

  // Destructive read; clears the internal buffer.
  std::string result() {
    std::string res = std::move(str_);
    str_ = "";
    return res;
  }

private:
  std::string str_;
};

template<>
void StringEncoder::encode(const char* prefix, const std::string& str) {
  str_ += prefix + std::to_string(str.size()) + ":" + str + "|";
}

template<>
void StringEncoder::encode(const char* prefix, const double& num) {
  str_ += prefix + num_to_str(num) + ":|";
}

template<>
void StringEncoder::encode(const char* prefix, const bool& flag) {
  str_ += prefix + std::to_string(flag) + "|";
}

// --- Utilities ---

// Used by generated entity_to_str() instances for general purpose display/logging.
class StringPrinter {
public:
  StringPrinter() = default;

  StringPrinter(StringPrinter&) = delete;
  StringPrinter(const StringPrinter&) = delete;
  StringPrinter& operator=(StringPrinter&) = delete;
  StringPrinter& operator=(const StringPrinter&) const = delete;

  void addId(const std::string& id) {
    parts_.push_back("{" + id + "}");
  }

  template<typename T>
  void add(const char* prefix, const T& val) {
    val._force_compiler_error();
  }

  // Destructive read; clears the internal buffer.
  std::string result(const char* join) {
    std::string res;
    if (!parts_.empty()) {
      for (auto i = 0; i < parts_.size() - 1; i++) {
        res += parts_[i] + join;
      }
      res += parts_.back();
    } else {
      res = "(empty)";
    }
    parts_.clear();
    return res;
  }

private:
  std::vector<std::string> parts_;
};

template<>
void StringPrinter::add(const char* prefix, const std::string& text) {
  parts_.push_back(prefix + text);
}

template<>
void StringPrinter::add(const char* prefix, const double& num) {
  parts_.push_back(prefix + num_to_str(num));
}

template<>
void StringPrinter::add(const char* prefix, const bool& flag) {
  parts_.push_back(prefix + std::string(flag ? "true" : "false"));
}


// --- Wasm-to-JS API ---

EM_JS(void, singletonSet, (Handle* handle, const char* encoded), {})
EM_JS(void, singletonClear, (Handle* handle), {})
EM_JS(void, collectionStore, (Handle* handle, const char* encoded), {})
EM_JS(void, collectionRemove, (Handle* handle, const char* encoded), {})
EM_JS(void, collectionClear, (Handle* handle), {})
EM_JS(void, render, (const char* slotName, const char* content), {})

}  // namespace internal


// Schema-specific implementations will be generated for the following:

template<typename T>
void decode_entity(T* entity, const char* str) {
  entity->_force_compiler_error();
}

template<typename T>
std::string encode_entity(const T& entity) {
  return entity._force_compiler_error();
}

template<typename T>
std::string entity_to_str(const T& entity, const char* join = "") {
  return entity._force_compiler_error();
}


// --- Storage classes ---

class Handle {
public:
  virtual ~Handle() {}
  virtual void sync(const char* encoded) = 0;
  virtual void update(const char* encoded1, const char* encoded2) = 0;

  const std::string& name() { return name_; }

private:
  friend class Particle;
  std::string name_ = nullptr;
};

template<typename T>
class Singleton : public Handle {
public:
  void sync(const char* encoded) override {
    entity_ = T();
    decode_entity(&entity_, encoded);
  }

  void update(const char* encoded, const char* ignored) override {
    entity_ = T();
    decode_entity(&entity_, encoded);
  }

  const T& get() const { return entity_; }

  void set(const T& entity) {
    entity_ = entity;
    std::string encoded = encode_entity(entity_);
    internal::singletonSet(this, encoded.c_str());
  }

  void clear() {
    entity_ = T();
    internal::singletonClear(this);
  }

private:
  T entity_;
};

// Minimal iterator for Collections; allows iterating directly over const T& values.
template<typename T>
class WrappedIter {
  using Iterator = typename std::unordered_map<std::string, std::unique_ptr<T>>::const_iterator;

public:
  WrappedIter(Iterator it) : it_(std::move(it)) {}

  const T& operator*() { return *it_->second; }
  const T* operator->() { return it_->second.get(); }

  WrappedIter& operator++() { ++it_; return *this; }
  WrappedIter operator++(int) { return WrappedIter(it_++); }

  friend bool operator==(const WrappedIter& a, const WrappedIter& b) { return a.it_ == b.it_; }
  friend bool operator!=(const WrappedIter& a, const WrappedIter& b) { return a.it_ != b.it_; }

private:
  Iterator it_;
};

template<typename T>
class Collection : public Handle {
  using Map = std::unordered_map<std::string, std::unique_ptr<T>>;

public:
  void sync(const char* encoded) override {
    entities_.clear();
    add(encoded);
  }

  void update(const char* added, const char* removed) override {
    add(added);
    internal::StringDecoder decoder(removed);
    int num = decoder.getInt(':');
    while (num--) {
      int len = decoder.getInt(':');
      std::string chunk = decoder.chomp(len);
      // TODO: just get the id, no need to decode the full entity
      T entity;
      decode_entity(&entity, chunk.c_str());
      entities_.erase(entity._internal_id);
    }
  }

  size_t size() { return entities_.size(); }
  bool empty() { return entities_.empty(); }
  WrappedIter<T> begin() const { return WrappedIter<T>(entities_.cbegin()); }
  WrappedIter<T> end() const { return WrappedIter<T>(entities_.cend()); }

  void store(const T& entity) {
    entities_.emplace(entity._internal_id, new T(entity));
    std::string encoded = encode_entity(entity);
    internal::collectionStore(this, encoded.c_str());
  }

  void remove(const T& entity) {
    auto it = entities_.find(entity._internal_id);
    if (it != entities_.end()) {
      std::string encoded = encode_entity(*it->second);
      entities_.erase(it);
      internal::collectionRemove(this, encoded.c_str());
    }
  }

  void clear() {
    entities_.clear();
    internal::collectionClear(this);
  }

private:
  void add(const char* added) {
    internal::StringDecoder decoder(added);
    int num = decoder.getInt(':');
    while (num--) {
      int len = decoder.getInt(':');
      std::string chunk = decoder.chomp(len);
      std::unique_ptr<T> eptr(new T());
      decode_entity(eptr.get(), chunk.c_str());
      entities_.erase(eptr->_internal_id);  // emplace doesn't overwrite
      entities_.emplace(eptr->_internal_id, std::move(eptr));
    }
  }

  Map entities_;
};


// --- Particle base class ---

class Particle {
public:
  virtual ~Particle() {}

  // Called by sub-class constructors to map names to their handle fields.
  void registerHandle(std::string name, Handle& handle) {
    handle.name_ = std::move(name);
    handles_[handle.name_] = &handle;
  }

  // Called by the runtime to associate the inner handle instance with the outer object.
  Handle* connectHandle(const char* name, bool will_sync) {
    auto pair = handles_.find(name);
    if (pair != handles_.end()) {
      if (will_sync) {
        to_sync_.insert(pair->second);
      }
      return pair->second;
    }
    return nullptr;
  }

  void sync(Handle* handle) {
    to_sync_.erase(handle);
    onHandleSync(handle, to_sync_.empty());
  }

  // Called by sub-classes to render into a slot.
  void renderSlot(const std::string& slot_name, const std::string& content) {
    internal::render(slot_name.c_str(), content.c_str());
  }

  virtual void onHandleSync(Handle* handle, bool all_synced) {}
  virtual void onHandleUpdate(Handle* handle) {}
  virtual void fireEvent(const std::string& slot_name, const std::string& handler) {}
  virtual void requestRender(const std::string& slot_name) {}

private:
  std::unordered_map<std::string, Handle*> handles_;
  std::unordered_set<Handle*> to_sync_;
};

// Defines an exported function 'newParticleName()' that the runtime will call to create
// particles inside the wasm container.
#define DEFINE_PARTICLE(name)     \
  extern "C" {                    \
    EMSCRIPTEN_KEEPALIVE          \
    arcs::Particle* new##name() { \
      return new name();          \
    }                             \
  }


// --- JS-to-wasm API ---

extern "C" {

EMSCRIPTEN_KEEPALIVE
Handle* connectHandle(Particle* particle, const char* name, bool will_sync) {
  return particle->connectHandle(name, will_sync);
}

EMSCRIPTEN_KEEPALIVE
void syncHandle(Particle* particle, Handle* handle, const char* encoded) {
  handle->sync(encoded);
  particle->sync(handle);
}

EMSCRIPTEN_KEEPALIVE
void updateHandle(Particle* particle, Handle* handle, const char* encoded1, const char* encoded2) {
  handle->update(encoded1, encoded2);
  particle->onHandleUpdate(handle);
}

EMSCRIPTEN_KEEPALIVE
void requestRender(Particle* particle, const char* slot_name) {
  particle->requestRender(slot_name);
}

EMSCRIPTEN_KEEPALIVE
void fireEvent(Particle* particle, const char* slot_name, const char* handler) {
  particle->fireEvent(slot_name, handler);
}

}  // extern "C"

}  // namespace arcs

#endif
