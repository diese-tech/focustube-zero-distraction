export type VideoSession = {
  sessionId: string;
  videoId: string;
  title: string;
  sourceUrl: string;
  createdAt: string;
  expiresAt: string;
};

export type CreateDemoSessionResult =
  | {
      ok: true;
      session: VideoSession;
    }
  | {
      ok: false;
      message: string;
    };

type SessionResponse = {
  session: VideoSession;
};

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

export async function createDemoSession(): Promise<CreateDemoSessionResult> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/sessions`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ videoId: "demo-video-1" })
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Session API returned ${response.status}.`
      };
    }

    const body = (await response.json()) as SessionResponse;
    return {
      ok: true,
      session: body.session
    };
  } catch {
    return {
      ok: false,
      message: "Backend session unavailable. Local demo video is still available."
    };
  }
}
