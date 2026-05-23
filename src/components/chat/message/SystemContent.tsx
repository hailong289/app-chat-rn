import React, { memo } from 'react';
import { SystemMessageBubble } from '../system-message-bubble';
import type { MessageType } from '../../../types/message.type';

type Props = { item: MessageType };

const SystemContent: React.FC<Props> = memo(
  ({ item }) => <SystemMessageBubble msg={item} />,
  (prev, next) => prev.item.id === next.item.id && prev.item.content === next.item.content,
);

export default SystemContent;
