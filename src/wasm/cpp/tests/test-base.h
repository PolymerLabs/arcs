#ifndef _TEST_BASE_H
#define _TEST_BASE_H

#include <string>
#include "src/wasm/cpp/arcs.h"
#include "src/wasm/cpp/tests/entities.h"

template<typename T>
class TestBase : public arcs::Particle {
public:
  virtual void before_each() {}

  bool check(bool ok, const std::string& condition, std::string file, int line) {
    if (!ok) {
      T err;
      if (auto pos = file.find_last_of("\\/"); pos != std::string::npos) {
        file = file.substr(pos + 1);
      }
      err.set_msg("[" + test_name_ + "] " + file + ":" + std::to_string(line) +
                  ": " + condition);
      errors_.store(err);
      marker_ = 'X';
    }
    return ok;
  }

  template<typename C>
  bool check_container(bool is_ordered, const C& container,
                       std::function<std::string(const typename C::value_type&)> converter,
                       std::vector<std::string> expected, const std::string& file, int line) {
    if (container.size() != expected.size()) {
      std::string msg = "expected container to have " + std::to_string(expected.size()) +
                        " items; actual size " + std::to_string(container.size());
      return check(false, msg, file, line);
    }

    // Convert result values to strings and sort them when checking an unordered container.
    std::vector<std::string> res;
    for (const auto& item : container) {
      res.push_back(converter(item));
    }
    if (!is_ordered) {
      std::sort(res.begin(), res.end());
    }

    // Compare against expected.
    std::vector<std::string> mark;
    size_t width = 0;
    bool ok = true;
    for (int i = 0; i < expected.size(); i++) {
      bool match = res[i] == expected[i];
      mark.push_back(match ? "  " : "* ");
      width = std::max(width, res[i].size());
      ok = ok && match;
    }

    // If an error was found, print the actual and expected values with mismatched lines marked.
    if (!ok) {
      std::string ordering = is_ordered ? "ordered" : "unordered";
      std::string msg = "mismatched items in " + ordering + " container:\n";
      std::string actual = "-actual-";
      actual.resize(width, ' ');
      msg += "    " + actual + "     -expected-\n";
      for (int i = 0; i < expected.size(); i++) {
        res[i].resize(width, ' ');
        msg += "  " + mark[i] + res[i] + "  |  " + expected[i] + "\n";
      }
      check(false, msg, file, line);
    }
    return ok;
  }

  std::string test_name_;
  arcs::Collection<T> errors_{"errors", this};
  char marker_;
};

#define RUN(test)                             \
  do {                                        \
    test_name_ = #test;                       \
    marker_ = '+';                            \
    before_each();                            \
    test();                                   \
    printf("       %c " #test "\n", marker_); \
  } while (0)

#define IS_TRUE(expression) \
  check((expression), "expected '" #expression "' to be true", __FILE__, __LINE__)

#define IS_FALSE(expression) \
  check(!(expression), "expected '" #expression "' to be false", __FILE__, __LINE__)

#define EQUAL(expression, expected) \
  check((expression) == (expected), "expected '" #expression "' to equal '" #expected "'", __FILE__, __LINE__)

#define NOT_EQUAL(expression, expected) \
  check((expression) != (expected), "expected '" #expression "' to not equal '" #expected "'", __FILE__, __LINE__)

#define LESS(lhs, rhs) \
  check((lhs) < (rhs), "expected '" #lhs "' to be less than '" #rhs "'", __FILE__, __LINE__)

#define NOT_LESS(lhs, rhs) \
  check(!((lhs) < (rhs)), "expected '" #lhs "' to not be less than '" #rhs "'", __FILE__, __LINE__)

#define CHECK_ORDERED(container, converter, expected) \
  check_container(true, container, converter, expected, __FILE__, __LINE__)

#define CHECK_UNORDERED(container, converter, expected) \
  check_container(false, container, converter, expected, __FILE__, __LINE__)

#endif
