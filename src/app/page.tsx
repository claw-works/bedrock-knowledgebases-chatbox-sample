import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  return (
    <main className="flex flex-col h-screen max-w-4xl mx-auto px-4">
      <header className="py-4 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-800">
          💬 Knowledge Base Chat
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Powered by Amazon Bedrock
        </p>
      </header>
      <ChatWindow />
    </main>
  );
}
