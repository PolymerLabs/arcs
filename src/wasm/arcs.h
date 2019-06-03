#ifndef _ARCS_H
#define _ARCS_H

#include <string>
#include <vector>
#include <unordered_map>
#include <memory>

namespace arcs {

using URL = std::string;

class Handle;

namespace internal {

// Logging: console() and error() use printf-style formatting.
// File and line info is added automatically.
EM_JS(void, setLogInfo, (const char* file, int line), {})

#define console(...) do {                           \
    arcs::internal::setLogInfo(__FILE__, __LINE__); \
    printf(__VA_ARGS__);                            \
  } while (0)

#define error(...) do {                             \
    arcs::internal::setLogInfo(__FILE__, __LINE__); \
    fprintf(stderr, __VA_ARGS__);                   \
  } while (0)


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
    console("sync V '%s' [%s]\n", name().c_str(), encoded);
    entity_ = T();
    decode_entity(&entity_, encoded);
  }

  void update(const char* encoded, const char* ignored) override {
    console("update V '%s' [%s]\n", name().c_str(), encoded);
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


template<typename T>
class Collection : public Handle {
public:
  using Map = std::unordered_map<std::string, std::unique_ptr<T>>;

  void sync(const char* encoded) override {
    console("sync C '%s' [%s]\n", name().c_str(), encoded);
    entities_.clear();
    add(encoded);
  }

  void update(const char* added, const char* removed) override {
    console("sync C '%s' [%s] [%s]\n", name().c_str(), added, removed);
    add(added);

    internal::StringDecoder decoder(added);
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

  // TODO: better API
  typename Map::const_iterator begin() const {
    return entities_.cbegin();
  }

  typename Map::const_iterator end() const {
    return entities_.cend();
  }

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
      entities_.emplace(eptr->_internal_id, std::move(eptr));
    }
  }

  Map entities_;
};


// --- Particle base class ---

class Particle {
public:
  virtual ~Particle() {}

  // TODO: ensure a full match between registered and connected handles

  // Called by sub-class constructors to map names to their handle fields.
  void registerHandle(std::string name, Handle& handle) {
    handle.name_ = std::move(name);
    handles_[handle.name_] = &handle;
  }

  // Called by the runtime to associate the inner handle instance with the outer object.
  Handle* connectHandle(const char* name) {
    auto pair = handles_.find(name);
    return (pair != handles_.end()) ? pair->second : nullptr;
  }

  // Called by sub-classes to render into a slot.
  void renderSlot(const std::string& slotName, const std::string& content) {
    internal::render(slotName.c_str(), content.c_str());
  }

  virtual void onHandleSync(Handle* handle) {}
  virtual void onHandleUpdate(Handle* handle) {}
  virtual void fireEvent(const std::string& slotName, const std::string& handler) {}
  virtual void requestRender(const std::string& slotName) {}

private:
  std::unordered_map<std::string, Handle*> handles_;
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
Handle* connectHandle(Particle* particle, const char* name) {
  return particle->connectHandle(name);
}

EMSCRIPTEN_KEEPALIVE
void syncHandle(Particle* particle, Handle* handle, const char* encoded) {
  handle->sync(encoded);
  particle->onHandleSync(handle);
}

EMSCRIPTEN_KEEPALIVE
void updateHandle(Particle* particle, Handle* handle, const char* encoded1, const char* encoded2) {
  handle->update(encoded1, encoded2);
  particle->onHandleUpdate(handle);
}

EMSCRIPTEN_KEEPALIVE
void requestRender(Particle* particle, const char* slotName) {
  particle->requestRender(slotName);
}

EMSCRIPTEN_KEEPALIVE
void fireEvent(Particle* particle, const char* slotName, const char* handler) {
  particle->fireEvent(slotName, handler);
}

}  // extern "C"

}  // namespace arcs

#endif
