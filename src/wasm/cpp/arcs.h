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
using Dictionary = std::unordered_map<std::string, std::string>;

class Handle;
class Particle;

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
// Used by the code generated from Schema definitions to pack and unpack serialized data.

// TODO: error handling
class StringDecoder {
public:
  StringDecoder(const char* str) : str_(str) {}

  StringDecoder(StringDecoder&) = delete;
  StringDecoder(const StringDecoder&) = delete;
  StringDecoder& operator=(StringDecoder&) = delete;
  StringDecoder& operator=(const StringDecoder&) = delete;

  bool done() const {
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

  static Dictionary decodeDictionary(const char* str) {
    StringDecoder decoder(str);
    Dictionary dict;
    int num = decoder.getInt(':');
    while (num--) {
      int klen = decoder.getInt(':');
      std::string key = decoder.chomp(klen);
      int vlen = decoder.getInt(':');
      std::string val = decoder.chomp(vlen);
      dict.emplace(std::move(key), std::move(val));
    }
    return dict;
  }

  // Format is <size>:<length>:<value><length>:<value>...
  static void decodeList(const char* str, std::function<void(const std::string&)> callback) {
    StringDecoder decoder(str);
    int num = decoder.getInt(':');
    while (num--) {
      int len = decoder.getInt(':');
      std::string chunk = decoder.chomp(len);
      callback(std::move(chunk));
    }
  }

  template<typename T>
  void decode(T& val) {
    static_assert(sizeof(T) == 0, "Unsupported type for entity fields");
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
  StringEncoder& operator=(const StringEncoder&) = delete;

  template<typename T>
  void encode(const char* prefix, const T& val) {
    static_assert(sizeof(T) == 0, "Unsupported type for entity fields");
  }

  static std::string encodeDictionary(const Dictionary& dict) {
    std::string encoded = std::to_string(dict.size()) + ":";
    for (const auto pair : dict) {
      encoded += std::to_string(pair.first.size()) + ":" + pair.first;
      encoded += std::to_string(pair.second.size()) + ":" + pair.second;
    }
    return encoded;
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
  StringPrinter& operator=(const StringPrinter&) = delete;

  void addId(const std::string& id) {
    parts_.push_back("{" + id + "}");
  }

  template<typename T>
  void add(const char* prefix, const T& val) {
    static_assert(sizeof(T) == 0, "Unsupported type for entity fields");
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

// singletonSet and collectionStore will create ids for entities if required, and will return
// the new ids in allocated memory that the Handle implementations will free.

EM_JS(const char*, singletonSet, (Particle* p, Handle* h, const char* encoded), {})
EM_JS(void, singletonClear, (Particle* p, Handle* h), {})
EM_JS(const char*, collectionStore, (Particle* p, Handle* h, const char* encoded), {})
EM_JS(void, collectionRemove, (Particle* p, Handle* h, const char* encoded), {})
EM_JS(void, collectionClear, (Particle* p, Handle* h), {})
EM_JS(void, render, (Particle* p, const char* slotName, const char* template_str, const char* model), {})
EM_JS(void, serviceRequest, (Particle* p, const char* call, const char* args, const char* tag), {})

// Returns allocated memory that the Particle base class will free.
EM_JS(const char*, resolveUrl, (const char* url), {})

}  // namespace internal


// --- Entity helpers ---
// Schema-specific implementations will be generated for the following:

// Copies the schema-based data fields; does not copy the internal id.
template<typename T>
T clone_entity(const T& entity) {
  static_assert(sizeof(T) == 0, "Only schema-specific implementations of clone_entity can be used");
}

// Returns whether two entities have the same data fields set (does not compare internal ids).
template<typename T>
bool entities_equal(const T& a, const T& b) {
  static_assert(sizeof(T) == 0, "Only schema-specific implementations of entities_equal can be used");
}

// Converts an entity to a string. Unset fields are omitted.
template<typename T>
std::string entity_to_str(const T& entity, const char* join = ", ") {
  static_assert(sizeof(T) == 0, "Only schema-specific implementations of entity_to_str can be used");
}

// Serialization methods for transporting data across the wasm boundary.
namespace internal {

template<typename T>
void decode_entity(T* entity, const char* str) {
  static_assert(sizeof(T) == 0, "Only schema-specific implementations of decode_entity can be used");
}

template<typename T>
std::string encode_entity(const T& entity) {
  static_assert(sizeof(T) == 0, "Only schema-specific implementations of encode_entity can be used");
}

}  // namespace internal


// --- Storage classes ---

enum Direction { Unconnected, In, Out, InOut };

class Handle {
public:
  virtual ~Handle() {}
  virtual void sync(const char* model) = 0;
  virtual void update(const char* encoded1, const char* encoded2) = 0;

  const std::string& name() const { return name_; }

protected:
  bool failForDirection(Direction bad_dir) const {
    if (dir_ == bad_dir) {
      std::string action = (bad_dir == In) ? "write to" : "read from";
      std::string type = (bad_dir == In) ? "in" : "out";
      std::string msg = "Cannot " + action + " '" + type + "' handle '" + name() + "'";
      internal::systemError(msg.c_str());
      return true;
    }
    return false;
  }

  // These are initialized by the Particle class.
  std::string name_;
  Particle* particle_;
  Direction dir_ = Unconnected;

  friend class Particle;
};

template<typename T>
class Singleton : public Handle {
public:
  void sync(const char* model) override {
    failForDirection(Out);
    entity_ = T();
    internal::decode_entity(&entity_, model);
  }

  void update(const char* model, const char* ignored) override {
    sync(model);
  }

  const T& get() const {
    failForDirection(Out);
    return entity_;
  }

  // For new entities created by a particle, this method will generate a new internal ID and update
  // the given entity with it. The data fields will not be modified.
  void set(T* entity) {
    failForDirection(In);
    std::string encoded = internal::encode_entity(*entity);
    const char* id = internal::singletonSet(particle_, this, encoded.c_str());
    if (id != nullptr) {
      entity->_internal_id_ = id;
      free((void*)id);
    }
    // Write-only handles do not keep entity data locally.
    if (dir_ == InOut) {
      entity_ = *entity;
    }
  }

  void clear() {
    failForDirection(In);
    internal::singletonClear(particle_, this);
    if (dir_ == InOut) {
      entity_ = T();
    }
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

  const T& operator*() const { return *it_->second; }
  const T* operator->() const { return it_->second.get(); }

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
  void sync(const char* model) override {
    entities_.clear();
    add(model);
  }

  void update(const char* added, const char* removed) override {
    add(added);
    internal::StringDecoder::decodeList(removed, [this](const std::string& str) {
      // TODO: just get the id, no need to decode the full entity
      T entity;
      internal::decode_entity(&entity, str.c_str());
      entities_.erase(entity._internal_id_);
    });
  }

  size_t size() const {
    failForDirection(Out);
    return entities_.size();
  }

  bool empty() const {
    failForDirection(Out);
    return entities_.empty();
  }

  WrappedIter<T> begin() const {
    failForDirection(Out);
    return WrappedIter<T>(entities_.cbegin());
  }

  WrappedIter<T> end() const {
    failForDirection(Out);
    return WrappedIter<T>(entities_.cend());
  }

  // For new entities created by a particle, this method will generate a new internal ID and update
  // the given entity with it. The data fields will not be modified.
  void store(T* entity) {
    failForDirection(In);
    std::string encoded = internal::encode_entity(*entity);
    const char* id = internal::collectionStore(particle_, this, encoded.c_str());
    if (id != nullptr) {
      entity->_internal_id_ = id;
      free((void*)id);
    }
    // Write-only handles do not keep entity data locally.
    if (dir_ == InOut) {
      entities_.emplace(entity->_internal_id_, new T(*entity));
    }
  }

  void remove(const T& entity) {
    failForDirection(In);
    std::string encoded = internal::encode_entity(entity);
    internal::collectionRemove(particle_, this, encoded.c_str());
    if (dir_ == InOut) {
      entities_.erase(entity._internal_id_);
    }
  }

  void clear() {
    failForDirection(In);
    internal::collectionClear(particle_, this);
    if (dir_ == InOut) {
      entities_.clear();
    }
  }

private:
  void add(const char* added) {
    failForDirection(Out);
    internal::StringDecoder::decodeList(added, [this](const std::string& str) {
      std::unique_ptr<T> eptr(new T());
      internal::decode_entity(eptr.get(), str.c_str());
      entities_.erase(eptr->_internal_id_);  // emplace doesn't overwrite
      entities_.emplace(eptr->_internal_id_, std::move(eptr));
    });
  }

  Map entities_;
};


// --- Particle base class ---

class Particle {
public:
  virtual ~Particle() {}

  // TODO: port sync tracking and auto-render to the JS particle.

  // Called by sub-class constructors to map names to their handle fields.
  void registerHandle(std::string name, Handle& handle) {
    handle.name_ = std::move(name);
    handle.particle_ = this;
    handles_[handle.name_] = &handle;
  }

  // Optionally called by sub-class constructors to indicate that we should automatically call
  // renderSlot() with the given slot name once all handles are synced, and whenever one is updated.
  void autoRender(const std::string& slot_name = "root") {
    auto_render_slot_ = slot_name;
  }

  // Called by the runtime to associate the inner handle instance with the outer object.
  Handle* connectHandle(const char* name, bool can_read, bool can_write) {
    auto pair = handles_.find(name);
    if (pair == handles_.end()) {
      return nullptr;
    }
    Handle* handle = pair->second;
    if (can_read) {
      to_sync_.insert(handle);
      handle->dir_ = can_write ? InOut : In;
    } else {
      handle->dir_ = Out;
    }
    return handle;
  }

  // Called by the runtime to synchronize a handle.
  void sync(Handle* handle) {
    to_sync_.erase(handle);
    onHandleSync(handle->name(), to_sync_.empty());
    if (to_sync_.empty() && !auto_render_slot_.empty()) {
      renderSlot(auto_render_slot_);
    }
  }

  // Called by the runtime to update a handle.
  void update(Handle* handle) {
    onHandleUpdate(handle->name());
    if (!auto_render_slot_.empty()) {
      renderSlot(auto_render_slot_);
    }
  }

  // Retrieve a handle by name; e.g. auto h = getSingleton<arcs::SomeEntityType>(name)
  template<typename T>
  arcs::Singleton<T>* getSingleton(const std::string& name) const {
    auto it = handles_.find(name);
    return (it != handles_.end()) ? dynamic_cast<arcs::Singleton<T>*>(it->second) : nullptr;
  }

  template<typename T>
  arcs::Collection<T>* getCollection(const std::string& name) const {
    auto it = handles_.find(name);
    return (it != handles_.end()) ? dynamic_cast<arcs::Collection<T>*>(it->second) : nullptr;
  }

  // Can be called by sub-classes to initiate rendering; also invoked when auto-render is enabled
  // after all handles have been synchronized.
  // TODO: it doesn't make sense to have both send flags false; ignore, error or convert to enum?
  void renderSlot(const std::string& slot_name, bool send_template = true, bool send_model = true) {
    const char* template_ptr = nullptr;
    std::string template_str;
    if (send_template) {
      template_str = getTemplate(slot_name);
      template_ptr = template_str.c_str();
    }

    const char* model_ptr = nullptr;
    std::string model;
    if (send_model) {
      Dictionary dict;
      populateModel(slot_name, &dict);
      model = internal::StringEncoder::encodeDictionary(dict);
      model_ptr = model.c_str();
    }

    internal::render(this, slot_name.c_str(), template_ptr, model_ptr);
  }

  // Sub-classes may call this to resolve URLs like 'https://$particles/path/to/assets/pic.jpg'.
  // The '$here' prefix can be used to map to the location of the wasm binary file (for example:
  // '$here/path/to/assets/pic.jpg').
  std::string resolveUrl(const std::string& url) {
    const char* p = internal::resolveUrl(url.c_str());
    std::string resolved = p;
    free((void*)p);
    return resolved;
  }

  // Called once a particle has been set up. Initial processing and service requests may be
  // executed here. Readable handles are *not* guaranteed to be synchronized at this point.
  // Write-only handles may safely be accessed.
  virtual void init() {}

  // Override to provide specific handling of handle sync/updates.
  virtual void onHandleSync(const std::string& name, bool all_synced) {}
  virtual void onHandleUpdate(const std::string& name) {}

  // Override to react to UI events triggered by handlers in the template provided below.
  virtual void fireEvent(const std::string& slot_name, const std::string& handler) {}

  // Override to provide a template string and key:value model for rendering into a slot.
  virtual std::string getTemplate(const std::string& slot_name) { return ""; }
  virtual void populateModel(const std::string& slot_name, Dictionary* model) {}

  // Sub-classes can request a service call using this method and the response will be delivered via
  // serviceResponse(). The optional tag argument can be used to disambiguate multiple requests.
  void serviceRequest(const std::string& call, const Dictionary& args, const std::string& tag = "") {
    std::string encoded = internal::StringEncoder::encodeDictionary(args);
    internal::serviceRequest(this, call.c_str(), encoded.c_str(), tag.c_str());
  }

  virtual void serviceResponse(const std::string& call, const Dictionary& response, const std::string& tag) {}

private:
  std::unordered_map<std::string, Handle*> handles_;
  std::unordered_set<Handle*> to_sync_;
  std::string auto_render_slot_;
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
Handle* connectHandle(Particle* particle, const char* name, bool can_read, bool can_write) {
  return particle->connectHandle(name, can_read, can_write);
}

EMSCRIPTEN_KEEPALIVE
void init(Particle* particle) {
  particle->init();
}

EMSCRIPTEN_KEEPALIVE
void syncHandle(Particle* particle, Handle* handle, const char* model) {
  handle->sync(model);
  particle->sync(handle);
}

EMSCRIPTEN_KEEPALIVE
void updateHandle(Particle* particle, Handle* handle, const char* encoded1, const char* encoded2) {
  handle->update(encoded1, encoded2);
  particle->update(handle);
}

EMSCRIPTEN_KEEPALIVE
void renderSlot(Particle* particle, const char* slot_name, bool send_template, bool send_model) {
  particle->renderSlot(slot_name, send_template, send_model);
}

EMSCRIPTEN_KEEPALIVE
void fireEvent(Particle* particle, const char* slot_name, const char* handler) {
  particle->fireEvent(slot_name, handler);
}

EMSCRIPTEN_KEEPALIVE
void serviceResponse(Particle* particle, const char* call, const char* response, const char* tag) {
  Dictionary dict = internal::StringDecoder::decodeDictionary(response);
  particle->serviceResponse(call, dict, tag);
}

}  // extern "C"

}  // namespace arcs

#endif
