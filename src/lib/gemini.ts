import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Get the Gemini 1.5 flash model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Summarizes a Git diff using Gemini AI.
 * Mimics the old version: includes detailed instructions, diff metadata handling, and example comment style
 * @param diff The git diff text
 * @returns A concise summary of the diff
 */
export const aiSummariseCommit = async (diff: string) => {
  try {
    const response = await model.generateContent([
      `
You are an expert programmer. Summarize the following git diff concisely.
Reminders about git diff:
- Lines starting with '+' are additions.
- Lines starting with '-' are deletions.
- Lines starting with neither are context only.
- Each file has metadata lines like:
  diff --git a/lib/index.js b/lib/index.js
  index aadf691..bfef603 100644
- Example summary comments:
'''
⭐ Raised the amount of returned recordings from '10 to '100 [packages/server/recordings_api.tsx], [packages/server/constants.tsx]
⭐ Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
⭐ Moved the 'octokit' initialization to a separate file [src/octokit.ts],[src/index.ts]
⭐ Added an OpenAI API for completions [packages/utils/apis/openai.ts]
⭐ Lowered numeric tolerance for test files
'''
Do NOT include the example text in your summary. Limit summary to the changes in the diff below:

${diff}
      `,
    ]);

    return response.response.text();
  } catch (err) {
    console.warn("AI summarization failed, returning empty summary:", err);
    return ""; // fallback so project creation won't fail
  }
};

// // Example test
// if (require.main === module) {
//   (async () => {
//     const exampleDiff = `
// diff --git a/src/index.ts b/src/index.ts
// index abc123..def456 100644
// --- a/src/index.ts
// +++ b/src/index.ts
// @@ -1,4 +1,4 @@
// -console.log("Hello world");
// +console.log("Hello GitOps AI");
//     `;
//     const summary = await aiSummariseCommit(exampleDiff);
//     console.log("AI Summary:", summary);
//   })();
// }
