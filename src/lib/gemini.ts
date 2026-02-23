import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import { Document } from "@langchain/core/documents";

dotenv.config();

const getGenerativeAIClient = (userGeminiApiKey?: string) => {
    // Prioritize the user's key, fall back to the environment variable key
    const apiKey = userGeminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please provide one.");
    }

    return new GoogleGenerativeAI(apiKey as string);
};

/**
 * Summarizes a Git diff using Gemini AI.
 * @param diff The git diff text
 * @param userGeminiApiKey Optional user-provided API key
 * @returns A concise summary of the diff
 */
export const aiSummariseCommit = async (diff: string, userGeminiApiKey?: string) => {
  try {
    const genAI = getGenerativeAIClient(userGeminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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
* Raised the amount of returned recordings from '10 to '100 [packages/server/recordings_api.tsx], [packages/server/constants.tsx]
* Fixed a typo in the github action name [.github/workflows/gpt-commit-summarizer.yml]
* Moved the 'octokit' initialization to a separate file [src/octokit.ts],[src/index.ts]
* Added an OpenAI API for completions [packages/utils/apis/openai.ts]
* Lowered numeric tolerance for test files
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

/**
 * Summarizes a code document using Gemini AI.
 * @param doc The document containing the code content
 * @param userGeminiApiKey Optional user-provided API key
 * @returns A concise summary of the code file
 */
export async function summarizeCode(doc: Document, userGeminiApiKey?: string) {
  console.log("Getting summary for :", doc.metadata.source);
  try {
    const genAI = getGenerativeAIClient(userGeminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const code = doc.pageContent.slice(0, 10000);
    const response = await model.generateContent([
      `You are an expert senior software engineer who specializes in onboarding new junior software engineers onto projects . `,
      `You are onboarding a new junior software engineer onto a project. The junior software engineer is familiar with programming concepts but has not seen this code before. Your task is to provide a concise and clear summary of the ${doc.metadata.source} code file to help the junior software engineer understand its purpose and functionality quickly. `,
      `Here is the code file: ${code}
    
    Give a summary no more than 100 words that would help a junior software engineer understand the purpose and functionality of this code file.`,
    ]);
    return response.response.text();
  } catch (err) {
    console.warn("AI summarization failed, returning empty summary:", err);
    return ""; // fallback so project creation won't fail
  }
}

const DEFAULT_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "embedding-001";
const FALLBACK_EMBEDDING_DIMENSIONS = 768;

/**
 * Generates an embedding for a summary using Gemini AI.
 * @param summary The text summary to embed
 * @param userGeminiApiKey Optional user-provided API key
 * @returns An array of embedding values
 */
export async function generateEmbedding(summary: string, userGeminiApiKey?: string) {
  try {
    const genAI = getGenerativeAIClient(userGeminiApiKey);
    const model = genAI.getGenerativeModel({
      model: DEFAULT_EMBEDDING_MODEL,
    });
    const result = await model.embedContent(summary);
    return result.embedding.values;
  } catch (err) {
    console.warn("Embedding generation failed, falling back to zeros:", err);
    return new Array(FALLBACK_EMBEDDING_DIMENSIONS).fill(0);
  }
}
 