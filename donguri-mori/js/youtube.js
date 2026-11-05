'use strict';
// YouTube Data API v3 で直接アップロード(上級者向け・任意)
// 必要なもの: Google Cloud の OAuth クライアントID(ウェブアプリ)。手順は README.md を参照。
(function (DF) {
  const Y = { token: null, tokenExp: 0, client: null, clientId: '', gisLoading: null };
  const SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

  Y.loadGIS = function () {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    if (Y.gisLoading) return Y.gisLoading;
    Y.gisLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { Y.gisLoading = null; reject(new Error('Googleのログイン部品を読み込めませんでした(ネット接続を確認してください)')); };
      document.head.appendChild(s);
    });
    return Y.gisLoading;
  };

  // ボタンを押す前に準備しておく(ポップアップがブロックされないように)
  Y.prepare = async function (clientId) {
    if (!clientId) return false;
    await Y.loadGIS();
    if (Y.client && Y.clientId === clientId) return true;
    Y.clientId = clientId;
    Y.client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        const cb = Y._cb; Y._cb = null;
        if (!cb) return;
        if (resp && resp.access_token) {
          Y.token = resp.access_token;
          Y.tokenExp = Date.now() + (Number(resp.expires_in) || 3000) * 1000 - 60000;
          cb.resolve(Y.token);
        } else cb.reject(new Error((resp && resp.error_description) || (resp && resp.error) || 'ログインできませんでした'));
      },
      error_callback: (err) => {
        const cb = Y._cb; Y._cb = null;
        if (cb) cb.reject(new Error(err && err.type === 'popup_closed' ? 'ログインがキャンセルされました' : 'ログインできませんでした'));
      },
    });
    return true;
  };

  // クリックのイベント内で同期的に呼ぶこと
  Y.getToken = function () {
    if (Y.token && Date.now() < Y.tokenExp) return Promise.resolve(Y.token);
    if (!Y.client) return Promise.reject(new Error('クライアントIDの準備ができていません'));
    return new Promise((resolve, reject) => {
      Y._cb = { resolve, reject };
      Y.client.requestAccessToken({ prompt: Y.token ? '' : 'consent' });
    });
  };

  // 再開可能アップロード
  Y.upload = async function (blob, meta, onProgress) {
    const token = await Y.getToken();
    const type = (blob.type || 'video/webm').split(';')[0];
    const body = {
      snippet: {
        title: meta.title.slice(0, 100),
        description: meta.description.slice(0, 4900),
        tags: meta.tags || [],
        categoryId: '20', // ゲーム
      },
      status: { privacyStatus: meta.privacy || 'private', selfDeclaredMadeForKids: false },
    };
    const init = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': type,
        'X-Upload-Content-Length': String(blob.size),
      },
      body: JSON.stringify(body),
    });
    if (!init.ok) throw new Error(await apiError(init));
    const url = init.headers.get('Location');
    if (!url) throw new Error('アップロード先のURLを取得できませんでした');
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.setRequestHeader('Content-Type', type);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); } catch (e) { resolve({}); }
        } else {
          let msg = 'アップロードに失敗しました (' + xhr.status + ')';
          try { const j = JSON.parse(xhr.responseText); if (j.error && j.error.message) msg += ': ' + j.error.message; } catch (e) { /* noop */ }
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('通信エラーでアップロードできませんでした'));
      xhr.send(blob);
    });
  };

  async function apiError(res) {
    let msg = 'YouTube APIエラー (' + res.status + ')';
    try {
      const j = await res.json();
      const reason = j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason;
      if (reason === 'quotaExceeded') return '今日のアップロード上限(APIの割り当て)に達しました。明日もう一度ためしてください';
      if (reason === 'youtubeSignupRequired') return 'このGoogleアカウントにはYouTubeチャンネルがありません。先にチャンネルを作成してください';
      if (j.error && j.error.message) msg += ': ' + j.error.message;
    } catch (e) { /* noop */ }
    return msg;
  }

  DF.YT = Y;
})(window.DF);
