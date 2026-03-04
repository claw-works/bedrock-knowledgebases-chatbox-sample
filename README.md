# bedrock-knowledgebases-chatbox-sample

A modern, production-ready chat UI built on [Amazon Bedrock Knowledge Base](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html).

Features streaming responses (SSE), citation display, multi-turn conversation, and a fully serverless deployment on AWS.

## Features

- 🚀 **Streaming output** — typewriter effect via Server-Sent Events (SSE)
- 📚 **Citation display** — collapsible source cards from Bedrock KB citations
- 💬 **Multi-turn conversation** — session management with DynamoDB
- 🔐 **API Key auth** — simple header-based auth, swap-in Cognito for production
- 📱 **Responsive UI** — mobile-friendly chat interface built with Tailwind CSS
- ☁️ **Serverless deployment** — CDK: CloudFront + S3 + API Gateway + Lambda

## Architecture

```
Browser
  │  SSE / REST
  ▼
Next.js API Routes
  │  AWS SDK
  ▼
Bedrock Knowledge Base  ──→  Claude (RetrieveAndGenerate)
  │
  ▼
DynamoDB (session store)
```

## Quick Start

### Prerequisites

- Node.js 20+
- AWS credentials configured (IAM role or `~/.aws/credentials`)
- An existing [Bedrock Knowledge Base](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-create.html)
- Required IAM permissions:
  - `bedrock:RetrieveAndGenerate`, `bedrock:Retrieve`
  - `bedrock:GetInferenceProfile`, `bedrock:InvokeModel`
  - `dynamodb:GetItem`, `dynamodb:PutItem`, `dynamodb:CreateTable`

### Local Development

```bash
# Install dependencies
npm install

# Configure environment
cat > .env.local << 'EOF'
KNOWLEDGE_BASE_ID=your-kb-id
AWS_REGION=us-east-1
API_KEY=your-secret-key
NEXT_PUBLIC_API_KEY=your-secret-key
DYNAMODB_TABLE=bedrock-kb-chatbox-sessions
EOF

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `KNOWLEDGE_BASE_ID` | Server | Your Bedrock Knowledge Base ID |
| `AWS_REGION` | Server | AWS region (e.g. `us-east-1`) |
| `API_KEY` | Server | Secret key checked on incoming requests |
| `NEXT_PUBLIC_API_KEY` | Client | Same value as `API_KEY` — sent in `x-api-key` header by the browser |
| `DYNAMODB_TABLE` | Server | DynamoDB table name for sessions (auto-created on first request) |

> **Note:** `API_KEY` / `NEXT_PUBLIC_API_KEY` are optional. If unset, the API accepts all requests.  
> For production, replace with Amazon Cognito or another auth layer.

### Model

This sample uses `global.anthropic.claude-sonnet-4-6` (cross-region inference profile).  
Update `modelArn` in `src/lib/bedrock.ts` to use a different model.

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
│   │   ├── page.tsx               # Root page
│   │   └── api/
│   │       ├── chat/route.ts      # SSE streaming endpoint
│   │       └── session/route.ts   # Session management
│   ├── components/
│   │   ├── ChatWindow.tsx         # Main chat UI
│   │   ├── MessageBubble.tsx      # User / assistant bubbles
│   │   └── CitationCard.tsx       # Collapsible citation cards
│   └── lib/
│       ├── bedrock.ts             # Bedrock KB streaming client
│       └── session.ts             # DynamoDB session store
├── cdk/                           # CDK infrastructure (coming soon)
├── postcss.config.js
├── tailwind.config.js
└── next.config.mjs
```

## Contributing

PRs welcome. This project targets submission to [aws-samples](https://github.com/aws-samples).

## License

Apache 2.0 — see [LICENSE](LICENSE)
