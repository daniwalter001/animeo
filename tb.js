const fetch = require("node-fetch");

class TB {
  static tbapikeys = ["85eed2e3-e04a-470f-9c16-3f9963b36fee"];
  static tbapikey =
    this.tbapikeys[Math.floor(Math.random() * this.tbapikeys.length)];

  static baseUrl = "https://api.torbox.app";
  static version = "v1";

  static headers = {
    Authorization: `Bearer ${this.tbapikey}`,
  };

  static checkTbRes = (res = {}) => {
    try {
      if ("success" in res) {
        return res["success"];
      }

      if ("error" in res) {
        return !!res["error"];
      }
    } catch (error) {
      return false;
    }
    return false;
  };

  static getUserData = async () => {
    let api = `${this.baseUrl}/${this.version}/api/user/me?settings=true`;

    try {
      const res = await fetch(api, {
        headers: this.headers,
      });

      const json = await res.json();

      if (this.checkTbRes(json)) {
        return json;
      }

      console.log({ status: res.status, statusText: res.statusText });
      return false;
    } catch (error) {
      console.log({ error });
      return false;
    }
  };

  static createTorrent = async ({ magnet, file }) => {
    try {
      let api = `${this.baseUrl}/${this.version}/api/torrents/createtorrent`;

      if (!file && !magnet) return false;

      const data = new URLSearchParams();

      if (magnet) {
        data.append("magnet", magnet);
      } else {
        data.append("file", file);
      }
      data.append("seed", "1");
      data.append("allow_zip", "true");

      const res = await fetch(api, {
        method: "POST",
        headers: {
          ...this.headers,
        },
        body: data,
      });

      if (res.status >= 400) {
        console.log({ status: res.status, statusText: res.statusText });
        return false;
      }

      const json = await res.json();

      if (this.checkTbRes(json)) {
        return json;
      }
      return false;
    } catch (error) {
      console.log({ error });
      return false;
    }
  };

  static getTorrentInfoById = async (id) => {
    const api = `${this.baseUrl}/${this.version}/api/torrents/mylist?bypass_cache=true&id=${id}`;

    try {
      const res = await fetch(api);

      if (res.status > 400) {
        console.log({ status: res.status, statusText: res.statusText });
        return false;
      }

      const json = await res.json();

      if (this.checkTbRes(json)) {
        return json;
      }
      return false;
    } catch (error) {
      console.log({ error });
      return false;
    }
  };

  static checkCachedTorrent = async (hashes = []) => {
    if (!hashes) return false;
    if (hashes.length == 0) return false;

    const api = `${this.baseUrl}/${
      this.version
    }/api/torrents/checkcached?hash=${hashes.join(
      ","
    )}&ormat=list&list_files=true`;

    const timeout = 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const res = await fetch(api, {
        headers: this.headers,
        signal: controller.signal,
      });

      if (res.status >= 400) {
        console.log({ status: res.status, statusText: res.statusText });
        return false;
      }

      const json = await res.json();

      if (this.checkTbRes(json)) {
        clearTimeout(timeoutId);
        return json;
      }

      clearTimeout(timeoutId);
      return false;
    } catch (error) {
      clearTimeout(timeoutId);
      console.log({ error });
      return false;
    }
  };

  static getTorrentFromList = async (torrent_id = "") => {
    if (torrent_id?.length == 0) return false;

    const api = `${this.baseUrl}/${this.version}/api/torrents/mylist?bypass_cache=true&id=${torrent_id}`;

    try {
      const res = await fetch(api, {
        headers: this.headers,
      });

      if (res.status >= 400) {
        console.log({ status: res.status, statusText: res.statusText });
        return false;
      }

      const json = await res.json();

      if (this.checkTbRes(json)) {
        return json?.data || [];
      }

      return false;
    } catch (error) {
      console.log({ error });
      return false;
    }
  };

  static requestDownloadLink = async ({ torrent_id, file_id }) => {
    if (torrent_id.length == 0 || file_id.length == 0) return false;

    const api = `${this.baseUrl}/${this.version}/api/torrents/requestdl?token=${this.tbapikey}&torrent_id=${torrent_id}&file_id=${file_id}&zip_link=false`;
    try {
      const res = await fetch(api, {
        headers: this.headers,
      });

      if (res.status >= 400) {
        console.log({ status: res.status, statusText: res.statusText });
        return false;
      }

      const json = await res.json();

      if (this.checkTbRes(json)) {
        return json;
      }

      return false;
    } catch (error) {
      console.log({ error });
      return false;
    }
  };
}

module.exports = TB;
