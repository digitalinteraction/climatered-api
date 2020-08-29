export function getCoffeeChatRoom(sessionId: string, channel: string) {
  return `coffee_chat_${sessionId}_${channel}`
}

export function getUserJoinedAckEvent(toUser: string) {
  return `user-joined-ack-${toUser}`
}

export function getUserOfferEvent(fromUser: string, toUser: string) {
  return `offer-${fromUser}-${toUser}`
}

export function getUserAnswerEvent(fromUser: string, toUser: string) {
  return `answer-${fromUser}-${toUser}`
}

export function getUserIceEvent(fromUser: string, toUser: string) {
  return `ice-${fromUser}-${toUser}`
}
