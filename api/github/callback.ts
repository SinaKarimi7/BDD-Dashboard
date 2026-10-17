import { handleGitHubCallback, type HttpResponse } from "../../server/github-callback.ts";

interface CallbackRequest {
  url?: string;
  headers: {
    host?: string;
    "x-forwarded-proto"?: string | string[];
  };
}

export default async function handler(req: CallbackRequest, res: HttpResponse): Promise<void> {
  const host = req.headers.host || "localhost";
  const forwarded = req.headers["x-forwarded-proto"];
  const proto = typeof forwarded === "string" && forwarded !== "" ? forwarded : "http";
  const url = new URL(req.url || "/", `${proto}://${host}`);
  await handleGitHubCallback(url, res);
}
