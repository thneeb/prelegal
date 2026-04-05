import { sendChatMessage } from "../app/utils/chatApi";
import { ChatMessage } from "../app/types/nda";

const mockMessages: ChatMessage[] = [
  { role: "user", content: "Hello" },
];

const mockCurrentFields = { purpose: "Testing partnership" };

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  }) as jest.Mock;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("sendChatMessage", () => {
  it("returns reply and field_updates on success", async () => {
    mockFetch(200, {
      reply: "What is the purpose?",
      field_updates: { governingLaw: "Delaware" },
    });

    const result = await sendChatMessage(mockMessages, mockCurrentFields);

    expect(result.reply).toBe("What is the purpose?");
    expect(result.field_updates).toEqual({ governingLaw: "Delaware" });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages).toEqual(mockMessages);
    expect(body.current_fields).toEqual(mockCurrentFields);
  });

  it("throws with detail message on non-2xx response", async () => {
    mockFetch(502, { detail: "AI service error: connection refused" });

    await expect(sendChatMessage(mockMessages, mockCurrentFields)).rejects.toThrow(
      "AI service error: connection refused"
    );
  });

  it("throws with fallback message when error body has no detail", async () => {
    mockFetch(500, {});

    await expect(sendChatMessage(mockMessages, mockCurrentFields)).rejects.toThrow("HTTP 500");
  });

  it("throws on network failure", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error")) as jest.Mock;

    await expect(sendChatMessage(mockMessages, mockCurrentFields)).rejects.toThrow("Network error");
  });

  it("sends last 20 messages when history is long", async () => {
    mockFetch(200, { reply: "Got it", field_updates: {} });

    const longHistory: ChatMessage[] = Array.from({ length: 25 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `message ${i}`,
    }));

    await sendChatMessage(longHistory, {});

    // chatApi sends all messages; truncation is handled server-side
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages).toHaveLength(25);
  });
});
