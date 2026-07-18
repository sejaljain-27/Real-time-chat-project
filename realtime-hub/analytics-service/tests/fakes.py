class FakeWebSocket:
    """Minimal stand-in for fastapi.WebSocket, just enough for
    ConnectionManager to exercise accept/send_json/disconnect paths
    without a real network connection."""

    def __init__(self, fail_on_send: bool = False):
        self.accepted = False
        self.sent_messages = []
        self.fail_on_send = fail_on_send

    async def accept(self):
        self.accepted = True

    async def send_json(self, message: dict):
        if self.fail_on_send:
            raise ConnectionError("client disconnected")
        self.sent_messages.append(message)
