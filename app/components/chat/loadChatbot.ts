// The Chatbot chunk loader, in its own module so ChatLauncher can call it again on "Try again"
// (and tests can decide whether it resolves). The panel stays a separate chunk.
export const loadChatbot = () => import('../Chatbot');
