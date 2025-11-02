import { MessagesList } from '@/components/MessagesList';

export default function Messages() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Messages</h1>
        <MessagesList />
      </div>
    </div>
  );
}
