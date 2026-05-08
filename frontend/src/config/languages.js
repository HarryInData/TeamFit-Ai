/* ═══════════════════════════════════════════
   LANGUAGE CONFIGURATION — TeamFit AI
   Single source of truth for supported languages.
   ═══════════════════════════════════════════ */

const LANGUAGES = [
  {
    name: 'Python',
    id: 71,
    monaco: 'python',
    icon: '/langicons/python-svgrepo-com.svg',
    ext: '.py',
    template: `# Python — TeamFit AI
def calculate_grade(scores):
    """Calculate student performance average"""
    total = sum(scores)
    if total > 0:
        return total / len(scores)
    else:
        return 0

scores_list = [85, 92, 78, 90]
print(calculate_grade(scores_list))`,
  },
  {
    name: 'JavaScript',
    id: 63,
    monaco: 'javascript',
    icon: '/langicons/js-svgrepo-com.svg',
    ext: '.js',
    template: `// JavaScript — TeamFit AI
function calculateGrade(scores) {
  const total = scores.reduce((sum, s) => sum + s, 0);
  return scores.length > 0 ? total / scores.length : 0;
}

const scores = [85, 92, 78, 90];
console.log(calculateGrade(scores));`,
  },
  {
    name: 'C',
    id: 50,
    monaco: 'c',
    icon: '🔵',
    ext: '.c',
    template: `// C — TeamFit AI
#include <stdio.h>

float calculate_grade(int scores[], int n) {
    int total = 0;
    for (int i = 0; i < n; i++) total += scores[i];
    return n > 0 ? (float)total / n : 0;
}

int main() {
    int scores[] = {85, 92, 78, 90};
    printf("Average: %.2f\\n", calculate_grade(scores, 4));
    return 0;
}`,
  },
  {
    name: 'C++',
    id: 54,
    monaco: 'cpp',
    icon: '🟣',
    ext: '.cpp',
    template: `// C++ — TeamFit AI
#include <iostream>
#include <vector>
#include <numeric>
using namespace std;

double calculateGrade(const vector<int>& scores) {
    if (scores.empty()) return 0;
    int total = accumulate(scores.begin(), scores.end(), 0);
    return static_cast<double>(total) / scores.size();
}

int main() {
    vector<int> scores = {85, 92, 78, 90};
    cout << "Average: " << calculateGrade(scores) << endl;
    return 0;
}`,
  },
  {
    name: 'Java',
    id: 62,
    monaco: 'java',
    icon: '/langicons/java-svgrepo-com.svg',
    ext: '.java',
    template: `// Java — TeamFit AI
import java.util.Arrays;

public class Main {
    public static double calculateGrade(int[] scores) {
        if (scores.length == 0) return 0;
        int total = Arrays.stream(scores).sum();
        return (double) total / scores.length;
    }

    public static void main(String[] args) {
        int[] scores = {85, 92, 78, 90};
        System.out.println("Average: " + calculateGrade(scores));
    }
}`,
  },
];

export default LANGUAGES;
