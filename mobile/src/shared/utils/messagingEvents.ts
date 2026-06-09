type Handler = (payload?: any) => void;

class MessagingEvents {
  private handlers: Record<string, Handler[]> = {};

  on(event: string, cb: Handler) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(cb);
    return () => this.off(event, cb);
  }

  off(event: string, cb?: Handler) {
    if (!this.handlers[event]) return;
    if (!cb) { delete this.handlers[event]; return; }
    this.handlers[event] = this.handlers[event].filter(h => h !== cb);
  }

  emit(event: string, payload?: any) {
    const list = this.handlers[event];
    if (!list || list.length === 0) return;
    // copy to avoid mutation during iteration
    const copy = list.slice();
    for (const h of copy) {
      try { h(payload); } catch (e) { /* ignore listener errors */ }
    }
  }
}

export default new MessagingEvents();
