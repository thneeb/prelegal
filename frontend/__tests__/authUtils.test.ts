/**
 * @jest-environment jsdom
 */
import { clearAuth, getAuthHeaders, getToken, isAuthenticated, setToken } from "../app/utils/authUtils";

// Build a minimal JWT with given exp claim (no real signing — just base64 payloads)
function makeToken(exp: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ sub: "1", email: "test@test.com", exp }));
  return `${header}.${payload}.fake-signature`;
}

describe("authUtils", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("getToken returns null when nothing stored", () => {
    expect(getToken()).toBeNull();
  });

  it("setToken stores token and email", () => {
    setToken("abc.def.ghi", "user@test.com");
    expect(localStorage.getItem("prelegal_token")).toBe("abc.def.ghi");
    expect(localStorage.getItem("prelegal_user")).toBe("user@test.com");
  });

  it("clearAuth removes token, user, and selected_doc", () => {
    localStorage.setItem("prelegal_token", "tok");
    localStorage.setItem("prelegal_user", "u@u.com");
    localStorage.setItem("prelegal_selected_doc", "csa");
    clearAuth();
    expect(localStorage.getItem("prelegal_token")).toBeNull();
    expect(localStorage.getItem("prelegal_user")).toBeNull();
    expect(localStorage.getItem("prelegal_selected_doc")).toBeNull();
  });

  it("getAuthHeaders returns Authorization header when token present", () => {
    localStorage.setItem("prelegal_token", "mytoken");
    const headers = getAuthHeaders();
    expect(headers["Authorization"]).toBe("Bearer mytoken");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("getAuthHeaders returns no Authorization header when no token", () => {
    const headers = getAuthHeaders();
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("isAuthenticated returns false when no token", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("isAuthenticated returns true for a non-expired token", () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem("prelegal_token", makeToken(futureExp));
    expect(isAuthenticated()).toBe(true);
  });

  it("isAuthenticated returns false for an expired token", () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    localStorage.setItem("prelegal_token", makeToken(pastExp));
    expect(isAuthenticated()).toBe(false);
  });

  it("isAuthenticated returns false for a malformed token", () => {
    localStorage.setItem("prelegal_token", "not.a.valid.jwt");
    expect(isAuthenticated()).toBe(false);
  });
});
