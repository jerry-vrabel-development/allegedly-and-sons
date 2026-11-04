import { withSecurityHeaders } from "./security-headers";

const TEXT = "text/plain; charset=utf-8";

/** Routes a request. Kept separate from `fetch` so it stays easy to test. */
export function route(request: Request): Response {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.\n", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Content-Type": TEXT },
    });
  }

  const { pathname } = new URL(request.url);

  switch (pathname) {
    case "/":
      return new Response(
        'Allegedly & Sons, Purveyors of Rare Objects. Est. "a long time ago."\nOpening soon. Allegedly.\n',
        { headers: { "Content-Type": TEXT } },
      );
    case "/healthz":
      return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    default:
      return new Response("Not found. The Bureau is still looking.\n", {
        status: 404,
        headers: { "Content-Type": TEXT },
      });
  }
}

export default {
  fetch(request): Response {
    return withSecurityHeaders(route(request));
  },
} satisfies ExportedHandler<Env>;
