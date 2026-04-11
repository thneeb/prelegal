/**
 * @jest-environment jsdom
 */
import { getDocument, listDocuments, saveDocument } from "../app/utils/historyApi";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockToken(token = "test-token") {
  localStorage.setItem("prelegal_token", token);
}

function mockResponse(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("historyApi", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  it("saveDocument sends Authorization header", async () => {
    mockToken();
    mockResponse({ id: 1, document_type: "csa", document_name: "CSA: A / B", created_at: "2026-01-01T00:00:00" }, 201);
    await saveDocument("csa", "CSA: A / B", { governingLaw: "Delaware" });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer test-token");
  });

  it("saveDocument sends correct payload", async () => {
    mockToken();
    mockResponse({ id: 1, document_type: "csa", document_name: "CSA", created_at: "2026-01-01" }, 201);
    await saveDocument("csa", "CSA", { governingLaw: "Delaware" });
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.document_type).toBe("csa");
    expect(body.form_data.governingLaw).toBe("Delaware");
  });

  it("listDocuments sends GET to /api/documents with auth header", async () => {
    mockToken("list-token");
    mockResponse([]);
    await listDocuments();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/documents");
    expect(options.headers["Authorization"]).toBe("Bearer list-token");
  });

  it("getDocument sends GET to /api/documents/:id with auth header", async () => {
    mockToken("get-token");
    mockResponse({ id: 42, document_type: "dpa", document_name: "DPA", created_at: "2026-01-01", form_data: {} });
    await getDocument(42);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/documents/42");
    expect(options.headers["Authorization"]).toBe("Bearer get-token");
  });
});
