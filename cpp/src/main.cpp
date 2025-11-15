#include <iostream>

extern "C" {
void test_console(int a, int b) {
  std::cout << a << std::endl;
  std::cout << b << std::endl;
}
}