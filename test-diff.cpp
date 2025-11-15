#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>

// Diff 결과를 나타내는 구조체
struct DiffResult {
  int type;  // 0: 동일, 1: 추가, 2: 삭제
  std::string content;
};

class DiffEngine {
 private:
  std::vector<std::string> text1;
  std::vector<std::string> text2;
  std::vector<std::vector<int>> dp;

  bool isEqual(const std::string& a, const std::string& b) {
    return a == b;
  }

  void computeLCS() {
    int m = text1.size();
    int n = text2.size();
    dp.assign(m + 1, std::vector<int>(n + 1, 0));

    for (int i = 1; i <= m; i++) {
      for (int j = 1; j <= n; j++) {
        if (isEqual(text1[i - 1], text2[j - 1])) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = std::max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
  }

  std::vector<DiffResult> backtrace() {
    std::vector<DiffResult> result;
    int i = text1.size();
    int j = text2.size();

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && isEqual(text1[i - 1], text2[j - 1])) {
        result.insert(result.begin(), {0, text1[i - 1]});
        i--;
        j--;
      } else if (j > 0 && (i == 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.insert(result.begin(), {1, text2[j - 1]});
        j--;
      } else if (i > 0) {
        result.insert(result.begin(), {2, text1[i - 1]});
        i--;
      }
    }

    return result;
  }

 public:
  void setText1(const std::vector<std::string>& t1) {
    text1 = t1;
  }

  void setText2(const std::vector<std::string>& t2) {
    text2 = t2;
  }

  std::vector<DiffResult> computeDiff() {
    computeLCS();
    return backtrace();
  }
};

std::string readFile(const char* filename) {
  std::ifstream file(filename);
  std::stringstream buffer;
  buffer << file.rdbuf();
  return buffer.str();
}

std::vector<std::string> parseText(const std::string& text) {
  std::vector<std::string> lines;
  std::istringstream stream(text);
  std::string line;

  while (std::getline(stream, line)) {
    lines.push_back(line);
  }

  return lines;
}

int main(int argc, char* argv[]) {
  if (argc < 3) {
    std::cerr << "Usage: " << argv[0] << " <file1> <file2>" << std::endl;
    return 1;
  }

  std::string text1Str = readFile(argv[1]);
  std::string text2Str = readFile(argv[2]);

  DiffEngine engine;
  engine.setText1(parseText(text1Str));
  engine.setText2(parseText(text2Str));

  std::vector<DiffResult> results = engine.computeDiff();

  std::cout << "Total lines: " << results.size() << std::endl;
  std::cout << "\n=== Diff Results ===" << std::endl;

  for (const auto& result : results) {
    switch (result.type) {
      case 0:
        std::cout << "  " << result.content << std::endl;
        break;
      case 1:
        std::cout << "+ " << result.content << std::endl;
        break;
      case 2:
        std::cout << "- " << result.content << std::endl;
        break;
    }
  }

  return 0;
}