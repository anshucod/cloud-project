const codingQuestions = [
    {
        id: 1,
        title: "Two Sum",
        difficulty: "Medium",
        description: `Given an array of integers 'nums' and an integer 'target', return the indices of the two numbers that add up to the target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
        examples: [
            {
                input: "nums = [2, 7, 11, 15], target = 9",
                output: "[0, 1]",
                explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
            },
            {
                input: "nums = [3, 2, 4], target = 6",
                output: "[1, 2]",
                explanation: "Because nums[1] + nums[2] == 6, we return [1, 2].",
            },
        ],
        constraints: [
            "2 <= nums.length <= 10^4",
            "-10^9 <= nums[i] <= 10^9",
            "Only one valid answer exists.",
        ],
        starterCode: {
            python: `def solution(nums, target):
    # Write your solution here
    pass`,
            cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> solution(vector<int>& nums, int target) {
        // Write your solution here
        
    }
};`,
            java: `import java.util.*;

class Solution {
    public int[] solution(int[] nums, int target) {
        // Write your solution here
        
    }
}`,
        },
        testCases: [
            { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
            { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
            { input: { nums: [3, 3], target: 6 }, expected: [0, 1] },
            { input: { nums: [1, 5, 8, 3], target: 4 }, expected: [0, 3] },
            { input: { nums: [-1, -2, -3, -4, -5], target: -8 }, expected: [2, 4] },
        ],
    },
    {
        id: 2,
        title: "Palindrome Check",
        difficulty: "Easy",
        description: `Given a string 's', determine if it is a palindrome.

A palindrome is a string that reads the same forward and backward. Consider only alphanumeric characters and ignore cases.

Return true if the string is a palindrome, false otherwise.`,
        examples: [
            {
                input: 's = "A man, a plan, a canal: Panama"',
                output: "true",
                explanation: '"amanaplanacanalpanama" is a palindrome.',
            },
            {
                input: 's = "race a car"',
                output: "false",
                explanation: '"raceacar" is not a palindrome.',
            },
        ],
        constraints: [
            "1 <= s.length <= 2 * 10^5",
            "s consists only of printable ASCII characters.",
        ],
        starterCode: {
            python: `def solution(s):
    # Write your solution here
    pass`,
            cpp: `#include <string>
#include <cctype>
using namespace std;

class Solution {
public:
    bool solution(string s) {
        // Write your solution here
        
    }
};`,
            java: `class Solution {
    public boolean solution(String s) {
        // Write your solution here
        
    }
}`,
        },
        testCases: [
            { input: { s: "A man, a plan, a canal: Panama" }, expected: true },
            { input: { s: "race a car" }, expected: false },
            { input: { s: " " }, expected: true },
            { input: { s: "Was it a car or a cat I saw?" }, expected: true },
            { input: { s: "hello" }, expected: false },
        ],
    },
];

module.exports = codingQuestions;
