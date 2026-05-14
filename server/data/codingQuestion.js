const codingQuestion = {
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
        {
            input: "nums = [3, 3], target = 6",
            output: "[0, 1]",
            explanation: "Because nums[0] + nums[1] == 6, we return [0, 1].",
        },
    ],
    constraints: [
        "2 <= nums.length <= 10^4",
        "-10^9 <= nums[i] <= 10^9",
        "-10^9 <= target <= 10^9",
        "Only one valid answer exists.",
    ],
    starterCode: `function twoSum(nums, target) {\n  // Write your solution here\n  \n}`,
    testCases: [
        { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
        { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
        { input: { nums: [3, 3], target: 6 }, expected: [0, 1] },
        { input: { nums: [1, 5, 8, 3], target: 4 }, expected: [0, 3] },
        { input: { nums: [-1, -2, -3, -4, -5], target: -8 }, expected: [2, 4] },
    ],
};

module.exports = codingQuestion;
