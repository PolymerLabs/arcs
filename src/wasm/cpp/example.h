#ifndef _EXAMPLE_H
#define _EXAMPLE_H

#include <functional>

int registerCallback(std::function<void()> callback);

void runCallbackFromJavaScript(int callbackId);

void doSomethingInJavaScript(int someData, int callbackId);

// void runTheExample();

#endif
