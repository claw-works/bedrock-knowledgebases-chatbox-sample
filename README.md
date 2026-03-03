# bedrock-knowledgebases-chatbox-sample

A modern, production-ready chat UI built on [Amazon Bedrock Knowledge Base](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html).

Features streaming responses (SSE), citation display, multi-turn conversation, and a fully serverless deployment on AWS.

![Architecture](docs/architecture.png)

## Features

- 🚀 **Streaming output** — typewriter effect via Server-Sent Events (SSE)
- 📚 **Citation display** — collapsible source cards from Bedrock KB citations
- 💬 **Multi-turn conversation** — session management with DynamoDB
- 🔐 **API Key auth** — simple, swap-in Cognito for production
- 📱 **Responsive UI** — mobile-friendly chat interface
- ☁️ **Serverless deployment** — CDK: CloudFront + S3 + API Gateway + Lambda

## Architecture

```
Browser
  │  SSE / REST
  ▼
API Gateway → Lambda (Next.js API Routes)
                │  AWS SDK
                ▼
          Bedrock Knowledge Base
          (Claude + OpenSearch Serverless + S3)
                │
                ▼
          DynamoDB (session store)
```

Static frontend: CloudFront → S3  
Backend: API Gateway → Lambda

## Quick Start

### Prerequisites

- Node.js 20+
- AWS CLI configured
- An existing Bedrock Knowledge Base ID

### Local Development

```bash
# Install dependencies
npm install

# Copy and edit environment variables
cp .env.example .env.local

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `KNOWLEDGE_BASE_ID` | Your Bedrock Knowledge Base ID |
| `AWS_REGION` | AWS region (e.g. `us-east-1`) |
| `API_KEY` | Simple API key for auth (dev/internal use) |
| `DYNAMODB_TABLE` | DynamoDB table name for sessions |

### Deploy to AWS

```bash
cd cdk
npm install
npx cdk deploy
```

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx          # Chat UI
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts  # SSE streaming endpoint
│   │       └── session/
│   │           └── route.ts  # Session management
│   ├── components/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   └── CitationCard.tsx
│   └── lib/
│       ├── bedrock.ts        # Bedrock KB client
│       └── session.ts        # DynamoDB session store
├── cdk/                      # CDK infrastructure
└── docs/
```

## Contributing

This project is intended for submission to [aws-samples](https://github.com/aws-samples). PRs welcome.

## License

Apache 2.0 — see [LICENSE](LICENSE)
