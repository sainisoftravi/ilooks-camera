// API Client for iLook Backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://ilook.labstackops.top/api/v1";

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

export const api = {
  // Auth
  async signup(data: { email: string; password: str; full_name?: string }) {
    const res = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Signup failed");
    return res.json();
  },

  async login(data: { email: string; password: str }) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
    return res.json();
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error("Unauthorized");
    return res.json();
  },

  // Cameras
  async getCameras(): Promise<Camera[]> {
    const res = await fetch(`${API_BASE_URL}/cameras`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error("Failed to load cameras");
    return res.json();
  },

  async createDirectCamera(data: { name: string; rtsp_source_url?: string }): Promise<Camera> {
    const res = await fetch(`${API_BASE_URL}/cameras/direct`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Failed to add camera");
    return res.json();
  },

  async getPlaybackAuth(cameraId: string): Promise<PlaybackAuth> {
    const res = await fetch(`${API_BASE_URL}/cameras/${cameraId}/playback`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error("Failed to get playback authorization");
    return res.json();
  },

  async deleteCamera(cameraId: string) {
    const res = await fetch(`${API_BASE_URL}/cameras/${cameraId}`, {
      method: "DELETE",
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error("Failed to delete camera");
    return res.json();
  },

  // Edge Pairing
  async generatePairCode(nodeName: string = "Local Edge Node") {
    const res = await fetch(`${API_BASE_URL}/edge/pair/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeader() },
      body: JSON.stringify({ node_name: nodeName }),
    });
    if (!res.ok) throw new Error("Failed to generate pairing code");
    return res.json();
  },

  async checkPairStatus(code: string) {
    const res = await fetch(`${API_BASE_URL}/edge/pair/status/${code}`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error("Failed to check pairing status");
    return res.json();
  },
};
