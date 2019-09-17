#include "example.h"

#include <map>
#include <string>
#include <iostream>

std::map< unsigned int, std::function<void()> > callbackMap;

int registerCallback(std::function<void()> callback) {
  static int ctr = 0;
  int i = ctr++;
  std::cout << "Creating callback with id " << i << std::endl;
  callbackMap.insert(std::make_pair(i, callback));
  return i;
}

void runCallbackFromJavaScript(int callbackId) {
  std::cout << "Running callback with id " << callbackId << std::endl;
  auto callback = callbackMap[callbackId];
  callback();
}

void doSomethingInJavaScript(int someData, int callbackId) {
  // do something async with someData.
  // ...

  runCallbackFromJavaScript(callbackId);
}

int main() {
  std::string s = "abc";
  static std::string ss = "";
  int callbackId = registerCallback([=] {
    // do something with s
    std::cout << s;
  });
  doSomethingInJavaScript(12345, callbackId);

  return 0;
}
