#include <iostream>

extern "C" {
const char *diff_text(const char *baseText, const char *changedText) {
    return changedText;
}
}
