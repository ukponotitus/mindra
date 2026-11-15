// A stand-in for the YouTube Data API, for the journey tests (backend.sh points the API at it): a Short's comments,
// with one more each time they're read after the first, its title and numbers, and a public channel with its videos
// to start an automation from. Nothing here leaves the machine.
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

// A channel to start an automation from (the API's automations/channel.py): 12 six-minute videos, out on Mondays
// and Thursdays at 16:00 UTC, the newest watched least.
const CHANNEL = "UCstandin0000000000000001";
const channelVideos = Array.from({ length: 12 }, (_, index) => {
  const published = new Date(Date.UTC(2026, 10, 9, 16) - (Math.floor(index / 2) * 7 + (index % 2 ? 4 : 0)) * 86_400_000);
  return {
    id: `history${String(index).padStart(4, "0")}`,
    snippet: { title: `A history story, part ${index + 1}`, description: "A story from history.", tags: ["history"], publishedAt: published.toISOString(), channelId: CHANNEL },
    contentDetails: { duration: "PT6M10S" },
    statistics: { viewCount: String(1000 + index * 250) },
  };
});

http
  .createServer((request, response) => {
    const url = new URL(request.url, `http://127.0.0.1:${port}`);
    const send = (status, body) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (url.pathname === "/youtube/v3/commentThreads") return send(200, threads());
    if (url.pathname === "/youtube/v3/comments") return send(200, { items: [] });
    if (url.pathname === "/youtube/v3/channels") {
      const known = url.searchParams.get("id") === CHANNEL || url.searchParams.get("forHandle") === "@historytold";
      return send(200, {
        items: known
          ? [{ id: CHANNEL, snippet: { title: "History Told", description: "Stories from history.", customUrl: "@historytold" }, contentDetails: { relatedPlaylists: { uploads: "UUstandin" } } }]
          : [],
      });
    }
    if (url.pathname === "/youtube/v3/playlistItems") return send(200, { items: channelVideos.map((video) => ({ contentDetails: { videoId: video.id } })) });
    if (url.pathname === "/youtube/v3/videos" && (url.searchParams.get("part") ?? "").includes("contentDetails")) return send(200, { items: channelVideos });
    if (url.pathname === "/youtube/v3/videos") {
      return send(200, {
        items: [{ id: url.searchParams.get("id"), snippet: { title: "Sunscreen every day #shorts", channelId: "UC-standin" }, statistics: { viewCount: "120", likeCount: "9", commentCount: "3" } }],
      });
    }
    send(404, { error: { code: 404, message: "Not in the stand-in", errors: [{ reason: "notFound" }] } });
  })
  .listen(port, "127.0.0.1");
