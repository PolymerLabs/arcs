#ifndef _ARCS_H
#define _ARCS_H

#include <unordered_set>
#include <string.h>

// Defines an exported function 'newParticleName()' that the runtime will call to create
// particles inside the wasm container.
#define DEFINE_PARTICLE(name) \
  extern "C" {                \
    EMSCRIPTEN_KEEPALIVE      \
    Particle* new##name() {   \
      return new name();      \
    }                         \
  }

// Logging
EM_JS(void, _setLogInfo, (const char* file, int line), {})

#define console(...) do {            \
    _setLogInfo(__FILE__, __LINE__); \
    printf(__VA_ARGS__);             \
  } while (0)

#define error(...) do {              \
    _setLogInfo(__FILE__, __LINE__); \
    fprintf(stderr, __VA_ARGS__);    \
  } while (0)


namespace arcs {

struct URL {
  std::string href;
};

struct HashURL {
  size_t operator()(const URL& url) const {
    return std::hash<std::string>()(url.href);
  }
};

struct EqualURL {
  bool operator()(const URL& lhs, const URL& rhs) const {
    return std::equal_to<std::string>()(lhs.href, rhs.href);
  }
};

namespace internal {

class StringEncoder {
public:
  StringEncoder() = default;

  StringEncoder(StringEncoder&) = delete;
  StringEncoder(const StringEncoder&) = delete;
  StringEncoder& operator=(StringEncoder&) = delete;
  StringEncoder& operator=(const StringEncoder&) const = delete;

  template<typename T>
  void encodeValue(const char* prefix, const T& val, const char* postfix) {
    val._force_compiler_error();  // should never be compiled
  }

  template<typename T, typename H = std::hash<T>, typename E = std::equal_to<T>>
  void encodeCollection(const char* prefix, const std::unordered_set<T, H, E>& collection) {
    str_ += prefix + numString(collection.size()) + ":";
    for (auto item : collection) {
      encodeValue("", item, "");
    }
    str_ += "|";
  }

  // Strips trailing zeros (and possibly the decimal point) from std::to_string(double).
  std::string numString(double num) {
    std::string s = std::to_string(num);
    auto i = s.size() - 1;
    while (i > 0 && (s[i] == '0' || s[i] == '.')) {
      i--;
    }
    s.erase(i + 1);
    return s;
  }

  std::string result() {
    return str_;
  }

private:
  std::string str_;
};

template<>
void StringEncoder::encodeValue(const char* prefix, const std::string& str, const char* postfix) {
  str_ += prefix + numString(str.size()) + ":" + str + postfix;
}

template<>
void StringEncoder::encodeValue(const char* prefix, const URL& url, const char* postfix) {
  str_ += prefix + numString(url.href.size()) + ":" + url.href + postfix;
}

template<>
void StringEncoder::encodeValue(const char* prefix, const double& num, const char* postfix) {
  str_ += prefix + numString(num) + ":" + postfix;
}

template<>
void StringEncoder::encodeValue(const char* prefix, const bool& flag, const char* postfix) {
  str_ += prefix + std::to_string(flag) + postfix;
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
    return *str_ == 0;
  }

  std::string upTo(char sep) {
    const char *p = strchr(str_, sep);
    if (p == nullptr) {
      error("Packaged entity decoding failed in upTo()\n");
      return "???";
    }
    std::string token(str_, p - str_);
    str_ = p + 1;
    return token;
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
  void decodeValue(T& val) {
    val._force_compiler_error();  // should never be compiled
  }

  template<typename T, typename H = std::hash<T>, typename E = std::equal_to<T>>
  void decodeCollection(std::unordered_set<T, H, E>& collection) {
    std::string token = upTo(':');
    int size = atoi(token.c_str());
    for (int i = 0; i < size; i++) {
      T item;
      decodeValue(item);
      collection.insert(item);
    }
  }

private:
  const char* str_;
};

template<>
void StringDecoder::decodeValue(std::string& text) {
  std::string token = upTo(':');
  int len = atoi(token.c_str());
  text = chomp(len);
}

template<>
void StringDecoder::decodeValue(URL& url) {
  std::string token = upTo(':');
  int len = atoi(token.c_str());
  url.href = chomp(len);
}

template<>
void StringDecoder::decodeValue(double& num) {
  std::string token = upTo(':');
  num = atof(token.c_str());
}

template<>
void StringDecoder::decodeValue(bool& flag) {
  flag = (chomp(1)[0] == '1');
}

}  // namespace internal
}  // namespace arcs

#endif
