export type MessagingRole = 'user' | 'business';

export interface ConversationBusiness {
  id: string;
  name: string;
  image_url: string | null;
  category: string | null;
  verified: boolean;
  slug?: string | null;
}

export interface ConversationParticipant {
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

export interface ConversationListItem {
  id: string;
  user_id: string;
  owner_id: string | null;
  business_id: string | null;
  last_message_at: string;
  last_message_preview: string;
  unread_count: number;
  created_at: string;
  business: ConversationBusiness | null;
  participant: ConversationParticipant | null;
}

export interface ConversationsResponse {
  data: ConversationListItem[];
  role: MessagingRole;
  unread_total: number;
}

export type MessageStatus = 'sent' | 'delivered' | 'read';
export type MessageSenderType = 'user' | 'business';
export type MessageClientState = 'sending' | 'failed' | null;

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  body: string;
  status: MessageStatus;
  sender_type: MessageSenderType;
  sender_user_id: string;
  sender_business_id: string | null;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  client_state?: MessageClientState;
}

export interface MessagesPage {
  data: {
    conversation_id: string;
    messages: ConversationMessage[];
    has_more: boolean;
    next_cursor: string | null;
  };
}
