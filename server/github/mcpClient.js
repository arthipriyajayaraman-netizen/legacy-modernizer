/**
 * GitHub MCP client — Phase 3 stub.
 * Uses official ghcr.io/github/github-mcp-server via Docker stdio.
 */
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const config = require('../config');

const NOT_IMPLEMENTED = 'Not implemented — Phase 3';

class GitHubMcpClient {
  constructor() {
    this.client = null;
    this.transport = null;
  }

  async connect() {
    if (!config.githubToken) {
      throw new Error('GITHUB_PERSONAL_ACCESS_TOKEN is required for GitHub MCP');
    }

    this.transport = new StdioClientTransport({
      command: 'docker',
      args: [
        'run', '-i', '--rm',
        '-e', 'GITHUB_PERSONAL_ACCESS_TOKEN',
        'ghcr.io/github/github-mcp-server',
      ],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: config.githubToken,
      },
    });

    this.client = new Client({ name: 'legacy-modernizer', version: '1.0.0' });
    await this.client.connect(this.transport);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  async createBranch(owner, repo, branch, fromBranch) {
    throw new Error(NOT_IMPLEMENTED);
  }

  async pushFiles(owner, repo, branch, files, message) {
    throw new Error(NOT_IMPLEMENTED);
  }

  async createPullRequest(owner, repo, title, head, base, body) {
    throw new Error(NOT_IMPLEMENTED);
  }
}

module.exports = { GitHubMcpClient, NOT_IMPLEMENTED };
