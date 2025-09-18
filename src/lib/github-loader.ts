import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import { generate } from "node_modules/@langchain/core/dist/utils/fast-json-patch";
import { Document } from "@langchain/core/documents";

export const loadGithubRepo = async (githubUrl: string, githubToken?: string) => {
    const loader = new GithubRepoLoader(githubUrl, {
        accessToken: githubToken || '', // Optional: GitHub token for private repos or higher rate limits
        branch: 'main',
        ignoreFiles: ['.gitignore', 'README.md', 'LICENSE', 'package.json', 'package-lock.json', 'tsconfig.json'],
        recursive: true,
        unknown: 'warn',
        maxConcurrency: 5,
    });

    const doc = await loader.load();
    return doc;
}

export const indexGithubRepo = async (projectId: string ,githubUrl: string, githubToken?: string) => {
    const docs = await loadGithubRepo(githubUrl, githubToken);
    const allEmbeddings = await generateEmbeddings(docs);
}
const generateEmbeddings = async (docs: Document[]) => {
    return await Promise.all(docs.map(async (doc) => {
    }));
}