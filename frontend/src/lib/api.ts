// API Client for iLook App (Unified Next.js Full-Stack)
const API_BASE_URL = typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL || "https://ilook.labstackops.top/api/v1");

export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface Camera {
  id: string;
  cam_uid: string;
  name: string;
  is_online: boolean;
  edge_node_id?: string;
  rtsp_source_url?: string;
  last_seen?: string;
  created_at: string;
  whep_url: string;
  rtsp_push_url: string;
}

export interface PlaybackAuth {
  cam_uid: string;
  stream_token: string;
  whep_url: string;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("ilook_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res: Response, fallbackMsg: string) {
  if (!res.ok) {
    let detail = fallbackMsg;
    try {
      const err = await res.json();
      detail = err.detail || fallbackMsg;
    } catch {
      try {
        const text = await res.text();
        detail = text || `${fallbackMsg} (HTTP ${res.status})`;
      } catch {}
    }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  // Auth
  async signup(data: { email: string; password: string; full_name?: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res, "Signup failed");
  },

  async login(data: { email: string; password: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(res, "Login failed");
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res, "Unauthorized");
  },

  // Cameras
  async getCameras(): Promise<Camera[]> {
    const res = await fetch(`${API_BASE_URL}/cameras`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res, "Failed to load cameras");
  },

  async createDirectCamera(data: { name: string; rtsp_source_url?: string }): Promise<Camera> {
    const res = await fetch(`${API_BASE_URL}/cameras`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse(res, "Failed to add camera");
  },

  async getPlaybackAuth(cameraId: string): Promise<PlaybackAuth> {
    const res = await fetch(`${API_BASE_URL}/cameras/${cameraId}/playback`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res, "Failed to get playback authorization");
  },

  async deleteCamera(cameraId: string) {
    const res = await fetch(`${API_BASE_URL}/cameras/${cameraId}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res, "Failed to delete camera");
  },

  // Edge Pairing
  async generatePairCode(nodeName: string = "Local Edge Node") {
    const res = await fetch(`${API_BASE_URL}/edge/pair/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ node_name: nodeName }),
    });
    return handleResponse(res, "Failed to generate pairing code");
  },

  async checkPairStatus(code: string) {
    const res = await fetch(`${API_BASE_URL}/edge/pair/status/${code}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse(res, "Failed to check pairing status");
  },
};
