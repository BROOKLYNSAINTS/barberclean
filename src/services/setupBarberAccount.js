import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL;

export async function setupBarberAccount(userId) {
  if (!userId) throw new Error("Missing userId");

  const response = await fetch(`${API_BASE_URL}/api/setup-barber`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Setup failed");
  }

  return data;
}