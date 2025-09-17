import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";

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