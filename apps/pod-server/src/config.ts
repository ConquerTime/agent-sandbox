import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const cwd = process.cwd();

export const config = {
  port: Number(process.env.POD_SERVER_PORT || 7000),
  agentImage: process.env.AGENT_IMAGE || 'agent-sandbox-agent:latest',
  agentPort: Number(process.env.AGENT_PORT || 4000),
  previewPort: Number(process.env.PREVIEW_PORT || 8000),
  dataDir: process.env.POD_DATA_DIR || join(cwd, 'data'),
  publicBaseUrl:
    process.env.POD_SERVER_PUBLIC_URL ||
    `http://localhost:${process.env.POD_SERVER_PORT || 7000}`,
};

mkdirSync(join(config.dataDir, 'volumes'), { recursive: true });
mkdirSync(join(config.dataDir, 'registry'), { recursive: true });
