// A stand-in for the YouTube Data API, for the journey tests (backend.sh points the API at it): a Short's comments,
// with one more each time they're read after the first, its title and numbers. Nothing here leaves the machine.
import http from "node:http";

const port = Number(process.argv[2] ?? 8130);
let reads = 0;

const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();
const comment = (id, text, author, channel, minutes, parentId) => ({
  id,
  snippet: {
    authorDisplayName: author,
    authorProfileImageUrl: "",
    authorChannelUrl: `https://www.youtube.com/channel/${channel}`,
    authorChannelId: { value: channel },
    textDisplay: text,
    likeCount: 2,
    publishedAt: ago(minutes),
    updatedAt: ago(minutes),
    ...(parentId ? { parentId } : {}),
  },
});
const thread = (top, replies = []) => ({
  id: top.id,
  snippet: { videoId: "standin0001", topLevelComment: top, totalReplyCount: replies.length },
  ...(replies.length ? { replies: { comments: replies } } : {}),
});

function threads() {
  reads += 1;
  const items = [
    thread(comment("c1", "Does this work for dark skin too?", "Chioma", "UC-chioma", 180), [
      comment("c1.r1", "Yes, every skin type needs it.", "Ada's channel", "UC-standin", 170, "c1"),
    ]),
    thread(comment("c2", "I never knew UV comes through windows!", "Tunde", "UC-tunde", 60)),
  ];
  if (reads > 1) items.unshift(thread(comment(`c${reads + 1}`, "Which SPF do you use?", "Bola", "UC-bola", 2)));
  return { items };
}

http
  .createServer((request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const send = (status, body) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (url.pathname === "/youtube/v3/commentThreads") return send(200, threads());
    if (url.pathname === "/youtube/v3/comments") return send(200, { items: [] });
    if (url.pathname === "/youtube/v3/videos") {
      return send(200, {
        items: [{ id: url.searchParams.get("id"), snippet: { title: "Sunscreen every day #shorts", channelId: "UC-standin" }, statistics: { viewCount: "120", likeCount: "9", commentCount: "3" } }],
      });
    }
    send(404, { error: { code: 404, message: "Not in the stand-in", errors: [{ reason: "notFound" }] } });
  })
  .listen(port, "127.0.0.1");
