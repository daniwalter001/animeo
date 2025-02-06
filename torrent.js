const crypto = require("crypto");
const fs = require("fs").promises;
const parseTorrent = require("parse-torrent");
const bencode = require("bencode");

class TorrentParser {
  constructor() {
    this.metadata = null;
    this.client = null;
  }

  async initialize() {
    const WebTorrent = await import("webtorrent");
    this.client = new WebTorrent.default();
  }

  async parse(input, extraHeaders = {}) {
    if (input.startsWith("magnet:")) {
      if (!this.client) {
        await this.initialize();
      }
      return await this.handleMagnet(input);
    }

    let buffer;
    if (input.startsWith("http")) {
      try {
        const response = await this.fetchTorrentWithRetry(input, extraHeaders);

        if (!response) {
          console.log("Fetch failed, aborting.");
          return null;
        }

        if (!response?.ok) {
          console.log("Invalid response:", response?.statusText);
          return null;
        }
        buffer = Buffer.from(await response?.arrayBuffer());
        if (buffer.length == 0) return null;
      } catch (error) {
        console.log({ error });
      }
    } else {
      buffer = await fs.readFile(input);
    }

    this.metadata = bencode.decode(buffer);
    return this.parseMetadata();
  }

  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  fetchTorrentWithRetry = async (url = "", extraHeaders = {}, retries = 4) => {
    if (!url) return null;
    for (let i = 0; i < retries; i++) {
      // console.log(`Attempt ${i + 1} for ${url}`);
      try {
        let r = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            ...extraHeaders,
          },
        });

        if (r.status === 429) {
          const waitTime = Math.pow(2, i) * 1000;
          await this.delay(waitTime);
          continue;
        }

        return r;
      } catch (error) {
        console.log(`Error fetching ${url}: ${error.toString()}`);
        if (error.status === 429) {
          const waitTime = Math.pow(2, i) * 1000;
          await this.delay(waitTime);
          continue;
        }
        // throw error;
        // return null;
        continue;
      }
    }
    return null;
  };

  async handleMagnet(magnetUri) {
    const parsed = parseTorrent(magnetUri);

    return new Promise((resolve, reject) => {
      this.client.add(magnetUri, { maxWebConns: 40 }, (torrent) => {
        const files = torrent.files.map((file) => ({
          path: file.path,
          length: file.length,
          name: file.name,
        }));

        const result = {
          infoHash: parsed.infoHash,
          name: decodeURIComponent(parsed.name),
          files,
          trackers: parsed.announce,
          magnetURI: decodeURIComponent(magnetUri),
          length: torrent.length,
          pieceLength: torrent.pieceLength,
        };

        console.log(result);

        torrent.destroy();
        // this.destroy();
        resolve(result);
      });

      //   Set timeout to avoid hanging
      setTimeout(() => {
        try {
          this.destroy();
        } catch (error) {
          console.log("hehehhe");
        }
        resolve({
          infoHash: parsed.infoHash,
          name: parsed.name,
          files: [],
          trackers: parsed.announce,
          magnetURI: magnetUri,
        });
      }, 20000);
    });
  }

  destroy() {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      console.log("Destroyed");
    }
  }

  parseMetadata() {
    return {
      infoHash: this.getInfoHash(),
      name: this.getName(),
      files: this.getFiles(),
      length: this.getLength(),
      pieceLength: this.getPieceLength(),
      lastPieceLength: this.getLastPieceLength(),
      pieces: this.getPieces(),
      trackers: this.getTrackers(),
    };
  }

  getInfoHash() {
    if (!this.metadata) return null;
    const info = bencode.encode(this.metadata?.info);
    return crypto.createHash("sha1").update(info).digest("hex");
  }

  getName() {
    return this.metadata?.info.name.toString();
  }

  getFiles() {
    if (!this.metadata?.info.files) {
      return [
        {
          path: this.getName(),
          name: this.getName(),
          length: this.metadata?.info.length,
        },
      ];
    }
    return this.metadata?.info.files
      .map((file) => {
        return {
          path: file.path.map((p) => p.toString()).join("/"),
          name: file.path.map((p) => p.toString()).join("/"),
          length: file.length,
        };
      })
      .filter((file) => !!file && !!file.path);
  }

  getLength() {
    return this.metadata?.info.length;
  }

  getPieceLength() {
    return this.metadata?.info["piece length"];
  }

  getLastPieceLength() {
    const pieceLength = this.getPieceLength();
    const totalLength = this.getLength();
    return totalLength % pieceLength || pieceLength;
  }

  getPieces() {
    return this.metadata?.info.pieces;
  }

  getTrackers() {
    const announce = this.metadata?.announce?.toString();
    const announceList =
      this.metadata && "announce-list" in this.metadata
        ? this.metadata["announce-list"]?.map((tracker) => tracker.toString())
        : [];
    return announceList || (announce ? [announce] : []);
  }
}

module.exports = TorrentParser;
