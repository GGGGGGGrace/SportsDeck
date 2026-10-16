const BASE_URL = "";

type RequestOptions = RequestInit & {
  auth?: boolean;
};

let refreshing: Promise<boolean> | null = null;

// Exchange the stored refresh token for a new access token.
// Concurrent callers share one in-flight refresh request.
function refreshAccessToken(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${BASE_URL}/api/users/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export async function apiFetch(
  endpoint: string,
  options: RequestOptions = {},
  retried = false
): Promise<any> {
  const { auth = false, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // Attach JWT if needed
  if (auth) {
    const token = localStorage.getItem("token");
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...rest,
    headers: finalHeaders,
  });

  // Access tokens expire after 30 minutes; refresh once and retry.
  if (res.status === 401 && auth && !retried) {
    if (await refreshAccessToken()) {
      return apiFetch(endpoint, options, true);
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || "Request failed");
  }

  return data;
}
