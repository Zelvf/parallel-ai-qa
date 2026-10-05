import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; file: string }> },
) {
  const { id, file } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id) || !/^(desktop|mobile|slow-network)\.(png|zip)$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readFile(path.join(process.cwd(), ".parallel", "artifacts", id, file));
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": file.endsWith(".png") ? "image/png" : "application/zip",
        "content-disposition": file.endsWith(".zip")
          ? `attachment; filename="${id}-${file}"`
          : "inline",
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
