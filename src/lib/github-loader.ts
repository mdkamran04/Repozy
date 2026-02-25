import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { Document } from "@langchain/core/documents";
import { summarizeCode, generateEmbedding } from "./gemini";
import { db } from "@/server/db";
import { Octokit } from "@octokit/rest";

const ALL_IGNORED_FILES = new Set([
    '.gitignore',
    'README.md',
    'LICENSE',
    'CONTRIBUTING.md',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'tsconfig.json',
    'jsconfig.json',
    '.env',
    '.dockerignore',
    'eslint.config.js',
    'vite.config.js',
    'next.config.js',
    'turbo.json',
    'tailwind.config.js',
    'index.html',
]);

const isIgnoredFile = (filePath: string): boolean => {
    if (ALL_IGNORED_FILES.has(filePath)) {
        return true;
    }

    if (filePath.endsWith('.svg') ||
        filePath.endsWith('.css') ||
        filePath.endsWith('.log') ||
        filePath.endsWith('.tmp') ||
        filePath.match(/\.env\./)) {
        return true;
    }

    return false;
}

const getFileCount = async (path: string, octokit: Octokit, githubOwner: string, githubRepo: string, acc: number = 0) => {
    const { data } = await octokit.rest.repos.getContent({
        owner: githubOwner,
        repo: githubRepo,
        path,
    });
    if (!Array.isArray(data) && data.type === 'file') return acc + 1;
    if (Array.isArray(data)) {
        let fileCount = 0;
        const directories: string[] = [];
        for (const item of data) {
            if (item.type === 'dir') {
                directories.push(item.path);
            } else {
                fileCount += 1;
            }
        }
        if (directories.length > 0) {
            const directoryCounts = await Promise.all(directories.map(dirPath => getFileCount(dirPath, octokit, githubOwner, githubRepo, 0)));
            fileCount += directoryCounts.reduce((acc, count) => acc + count, 0);
        }
        return acc + fileCount;

    }
    return acc;
}

//Chunks an array into batches of specified size
function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

export const checkCredits = async (githubUrl: string, githubToken?: string) => {
    try {
        // Use provided token, fallback to env var, or undefined (unauthenticated)
        const token = githubToken || process.env.GITHUB_TOKEN;

        if (!token) {
            console.warn(
                'No GitHub token provided. Using unauthenticated requests (limited to 60/hour). ' +
                'Provide a GitHub token to increase the limit to 5,000/hour.'
            );
        }

        const octokit = new Octokit({
            auth: token || undefined,
        });

        const githubOwner = githubUrl.split('/')[3];
        const githubRepo = githubUrl.split('/')[4];

        if (!githubOwner || !githubRepo) return 0;

        const fileCount = await getFileCount('', octokit, githubOwner, githubRepo, 0);
        return fileCount;
    } catch (err: any) {
        if (err.status === 403 && err.message?.includes('rate limit')) {
            console.error(
                'GitHub API rate limit exceeded. Please provide a GitHub token in your project settings to increase the limit.'
            );
            throw new Error(
                'GitHub API rate limit exceeded. Please provide a GitHub token to continue. Visit: https://github.com/settings/tokens'
            );
        }
        throw err;
    }
}

export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || '',
        branch: 'main',
        ignorePaths: [
            'node_modules',
            'dist',
            'build',
            '.next',
            '.out',
            '.git',
            '.github',
            '.vscode',
            '.idea',
            'coverage',
            '.cache',
            '__pycache__',
            '.pytest_cache',
        ],
        ignoreFiles: [],
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5,
    });

    const doc = await loader.load();
    return doc;
}

/**
 * Summarizes a batch of documents using a single Gemini call.
 * Returns parsed JSON array of { fileName, summary } objects.
 */
async function summarizeBatch(
    docs: Document[],
    userGeminiApiKey?: string
): Promise<Array<{ fileName: string; summary: string }>> {
    try {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");

        const apiKey = userGeminiApiKey || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Gemini API Key is missing");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        // Build a single prompt for all files in the batch
        const filesContent = docs
            .map(doc => {
                const truncatedCode = doc.pageContent.slice(0, 5000);
                return `File: ${doc.metadata.source}\n\`\`\`\n${truncatedCode}\n\`\`\``;
            })
            .join('\n\n');

        const prompt = `You are an expert senior software engineer. Analyze the following files and provide a concise summary for each one.
Return ONLY a valid JSON array in this exact format, with no additional text:
[
  { "fileName": "path/to/file1.ts", "summary": "..." },
  { "fileName": "path/to/file2.ts", "summary": "..." }
]

Each summary should be 50-100 words.

Files to analyze:
${filesContent}`;

        const response = await model.generateContent([prompt]);
        const responseText = response.response.text();

        // Parse JSON safely
        let parsed: Array<{ fileName: string; summary: string }>;
        try {
            // Extract JSON from response (handle cases where model might add extra text)
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                console.warn('No JSON found in response');
                return docs.map(doc => ({
                    fileName: doc.metadata.source,
                    summary: '',
                }));
            }
            parsed = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
            console.warn('Failed to parse batch summary JSON:', parseErr);
            return docs.map(doc => ({
                fileName: doc.metadata.source,
                summary: '',
            }));
        }

        return parsed;
    } catch (err) {
        console.warn('Batch summarization failed:', err);
        return docs.map(doc => ({
            fileName: doc.metadata.source,
            summary: '',
        }));
    }
}

export const indexGithubRepo = async (
    projectId: string,
    githubUrl: string,
    githubToken?: string,
    userGeminiApiKey?: string
) => {
    try {
        // Use provided token or fallback to env var
        const token = githubToken || process.env.GITHUB_TOKEN;

        const rawDocs = await loadGithubRepo(githubUrl, token);

        const filteredDocs = rawDocs.filter(doc => {
            const sourcePath = doc.metadata.source;
            if (isIgnoredFile(sourcePath)) {
                console.log(`Skipping ignored file: ${sourcePath}`);
                return false;
            }
            return true;
        });

        const totalFiles = filteredDocs.length;
        let processedFiles = 0;

        console.log(`Starting indexing of ${totalFiles} files for project ${projectId}`);

        // Update project to reset progress
        await db.project.update({
            where: { id: projectId },
            data: { indexingProgress: 0 },
        });

        // Chunk files into batches of 5
        const batches = chunkArray(filteredDocs, 5);

        // Process each batch sequentially
        for (const batch of batches) {
            console.log(`Processing batch with ${batch.length} files...`);

            // Get summaries for the batch (single Gemini call per batch)
            const summaries = await summarizeBatch(batch, userGeminiApiKey);

            // Process each file in batch sequentially
            for (const fileSummary of summaries) {
                try {
                    // Find the corresponding document
                    const doc = batch.find(d => d.metadata.source === fileSummary.fileName);
                    if (!doc) {
                        console.warn(`Document not found for ${fileSummary.fileName}`);
                        processedFiles++;
                        continue;
                    }

                    // Generate embedding sequentially
                    console.log(`Generating embedding for: ${fileSummary.fileName}`);
                    const embedding = await generateEmbedding(
                        fileSummary.summary || doc.pageContent,
                        userGeminiApiKey
                    );

                    // Ensure embedding is number array and has correct length
                    const embeddingNumbers = embedding.map(v => Number(v));
                    if (embeddingNumbers.length !== 768) {
                        console.warn(
                            `Embedding dimension mismatch for ${fileSummary.fileName}. Expected 768, got ${embeddingNumbers.length}`
                        );
                        // Fallback: pad or truncate to 768
                        while (embeddingNumbers.length < 768) {
                            embeddingNumbers.push(0);
                        }
                        embeddingNumbers.length = 768;
                    }

                    // Create database record
                    const sourceCodeEmbedding = await db.sourceCodeEmbedding.create({
                        data: {
                            summary: fileSummary.summary || doc.pageContent.slice(0, 500),
                            sourceCode: doc.pageContent,
                            fileName: fileSummary.fileName,
                            projectId,
                        }
                    });

                    // Convert embedding array to pgvector string format: [val1,val2,...]
                    const embeddingString = `[${embeddingNumbers.join(',')}]`;

                    // Update vector using pgvector
                    await db.$executeRaw`
                        UPDATE "SourceCodeEmbedding"
                        SET "summaryEmbedding" = ${embeddingString}::vector
                        WHERE id = ${sourceCodeEmbedding.id}
                    `;

                    processedFiles++;

                    // Update progress
                    const percentage = Math.floor((processedFiles / totalFiles) * 100);
                    await db.project.update({
                        where: { id: projectId },
                        data: { indexingProgress: percentage },
                    });

                    console.log(`Progress: ${processedFiles}/${totalFiles} (${percentage}%)`);
                } catch (fileErr) {
                    console.error(`Error processing file:`, fileErr);
                    processedFiles++;
                    // Continue with next file even if this one fails
                    const percentage = Math.floor((processedFiles / totalFiles) * 100);
                    await db.project.update({
                        where: { id: projectId },
                        data: { indexingProgress: percentage },
                    });
                }
            }
        }

        // Ensure final progress is set to 100
        await db.project.update({
            where: { id: projectId },
            data: { indexingProgress: 100 },
        });

        console.log(`Indexing completed for project ${projectId}`);
    } catch (err) {
        console.error('Indexing failed:', err);
        // Set progress to 0 on failure to indicate incomplete state
        await db.project.update({
            where: { id: projectId },
            data: { indexingProgress: 0 },
        });
        throw err;
    }
}

