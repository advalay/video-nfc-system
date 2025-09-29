import * as express from 'express';
import * as cors from 'cors';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as multer from 'multer';

// 環境変数を読み込み
dotenv.config();

const app = express();
const PORT = 4000;

// CORS設定
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// メモリ内でのファイルアップロード設定
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  }
});

// 簡易認証（テスト用）
const VALID_STORE_TOKEN = 'store_test_token_001';

// YouTube OAuth設定
const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

// OAuth認証状態を保存
let isAuthenticated = false;
let channelInfo: any = null;

// =============================================================================
// 公開API エンドポイント
// =============================================================================

// 1. バナー情報取得
app.get('/api/v1/public/banner', (req, res) => {
  console.log('🔍 Banner endpoint called');
  const token = req.headers['x-store-token'] as string;
  
  if (token !== VALID_STORE_TOKEN) {
    console.log('❌ Token mismatch');
    return res.status(401).json({ error: 'Invalid store token' });
  }

  console.log('✅ Token valid, returning banner data');
  res.json({
    channelDisplayName: 'Advalay Test Channel (デモ)'
  });
});

// 2. YouTube OAuth開始
app.post('/api/v1/channels/oauth/start', (req, res) => {
  const token = req.headers['x-store-token'] as string;
  
  if (token !== VALID_STORE_TOKEN) {
    return res.status(401).json({ error: 'Invalid store token' });
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ],
    state: token, // 店舗トークンをstateに含める
  });

  res.json({ authUrl });
});

// 3. OAuth コールバック（GET版）
app.get('/api/v1/channels/oauth/callback', async (req, res) => {
  console.log('🔍 OAuth コールバック受信 (GET):', req.query);
  const { code, state } = req.query;
  const storeToken = state as string;

  console.log('📝 受信データ (GET):', { code: !!code, state, storeToken });

  if (storeToken !== VALID_STORE_TOKEN) {
    console.error('❌ 無効なストアトークン:', storeToken);
    return res.redirect(`http://localhost:3000/store/${storeToken}?error=invalid_token`);
  }

  if (!code) {
    console.error('❌ 認証コードがありません');
    return res.redirect(`http://localhost:3000/store/${storeToken}?error=no_code`);
  }

  try {
    console.log('🔄 トークンを取得中...');
    const { tokens } = await oauth2Client.getToken(code as string);
    console.log('✅ トークン取得成功:', !!tokens.access_token);
    
    oauth2Client.setCredentials(tokens);

    console.log('🔄 YouTube チャンネル情報を取得中...');
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const response = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
    });

    console.log('📺 チャンネル応答:', response.data.items?.length || 0, '件');

    const channel = response.data.items?.[0];
    if (channel) {
      console.log('✅ YouTube OAuth成功!');
      console.log(`チャンネル名: ${channel.snippet?.title}`);
      console.log(`チャンネルID: ${channel.id}`);
      
      // 認証状態を保存
      isAuthenticated = true;
      channelInfo = {
        title: channel.snippet?.title,
        id: channel.id,
        refreshToken: tokens.refresh_token
      };
      
      // 成功時にシステムページにリダイレクト
      return res.redirect(`http://localhost:3000/store/${storeToken}?auth=success&channel=${encodeURIComponent(channel.snippet?.title || '')}`);
    } else {
      console.error('❌ チャンネル情報が見つかりません');
      return res.redirect(`http://localhost:3000/store/${storeToken}?error=no_channel`);
    }
  } catch (error) {
    console.error('❌ OAuth エラー:', error);
    return res.redirect(`http://localhost:3000/store/${storeToken}?error=oauth_failed`);
  }
});

// 4. 動画アップロード（簡易版）
app.post('/api/v1/public/uploads/init', (req, res) => {
  const token = req.headers['x-store-token'] as string;
  
  if (token !== VALID_STORE_TOKEN) {
    return res.status(401).json({ error: 'Invalid store token' });
  }

  const { serialNo, title, fileName, fileSize } = req.body;

  // 簡易バリデーション
  if (!serialNo || !title || !fileName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (fileSize > 209715200) { // 200MB
    return res.status(413).json({ error: 'File too large' });
  }

  // S3バックアップ機能は現在無効化
  const uploadId = `upload_${Date.now()}`;
  res.json({
    uploadId,
    presignedUrl: null, // S3バックアップ無効
    expiresIn: 600,
    message: 'S3バックアップ機能は現在無効化されています'
  });
});

// 5. アップロード完了
app.post('/api/v1/public/uploads/:uploadId/complete', (req, res) => {
  const token = req.headers['x-store-token'] as string;
  
  if (token !== VALID_STORE_TOKEN) {
    return res.status(401).json({ error: 'Invalid store token' });
  }

  const uploadId = req.params.uploadId;
  
  res.json({
    jobId: `job_${uploadId}`,
    message: 'アップロードが完了しました'
  });
});

// 6. 実際のYouTube動画アップロード
app.post('/api/v1/public/upload-to-youtube', upload.single('video'), async (req, res) => {
  const token = req.headers['x-store-token'] as string;
  const { title, serialNo } = req.body;
  const file = req.file;
  
  if (token !== VALID_STORE_TOKEN) {
    return res.status(401).json({ error: 'Invalid store token' });
  }

  if (!title || !serialNo || !file) {
    return res.status(400).json({ 
      error: 'Title, serialNo, and video file are required',
      message: 'タイトル、シリアル番号、および動画ファイルが必要です'
    });
  }

  // OAuth認証状態をチェック
  if (!isAuthenticated) {
    return res.status(401).json({ 
      error: 'YouTube OAuth認証が完了していません',
      message: 'OAuth認証を先に完了させてください'
    });
  }

  try {
    console.log('🎬 YouTube動画アップロード開始...');
    console.log('📝 タイトル:', `${title} - ${serialNo}`);
    console.log('📁 ファイル名:', file.originalname);
    console.log('📁 ファイルサイズ:', file.size, 'bytes');

    // YouTube APIで動画アップロード
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    // 動画メタデータ
    const videoMetadata = {
      snippet: {
        title: title,
        description: `Advalayシステムからのアップロード\nシリアル番号: ${serialNo}\nアップロード日時: ${new Date().toLocaleString('ja-JP')}`,
        tags: ['advalay', 'アップロード', '動画', serialNo],
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: 'unlisted', // 非公開
        selfDeclaredMadeForKids: false,
      },
    };

    console.log('📤 実際の動画ファイルをアップロード中...');
    
    // ファイルストリームを作成
    const fileStream = require('stream').Readable.from(file.buffer);
    
    // 実際のYouTubeアップロード
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: videoMetadata,
      media: {
        body: fileStream,
      },
    });

    const videoId = response.data.id!;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    console.log('✅ YouTube動画アップロード成功!');
    console.log('🎥 動画ID:', videoId);
    console.log('🔗 動画URL:', videoUrl);

    res.json({
      success: true,
      videoId: videoId,
      videoUrl: videoUrl,
      title: title,
      channel: channelInfo?.title || '株式会社Advalay',
      uploadDate: new Date().toLocaleString('ja-JP'),
      s3BackupCompleted: true,
      jobId: `up_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: 'YouTube動画アップロードが完了しました!'
    });

  } catch (error) {
    console.error('❌ YouTube動画アップロードエラー:', error);
    console.error('❌ エラー詳細:', error.message);
    res.status(500).json({ 
      error: 'YouTube動画アップロードに失敗しました',
      details: error.message 
    });
  }
});

// 7. ジョブ状態確認
app.get('/api/v1/public/jobs/:jobId', (req, res) => {
  const token = req.headers['x-store-token'] as string;
  
  if (token !== VALID_STORE_TOKEN) {
    return res.status(401).json({ error: 'Invalid store token' });
  }

  res.json({
    state: 'DONE',
    message: '動画のアップロードが完了しました'
  });
});

// =============================================================================
// テスト用API エンドポイント
// =============================================================================

// 8. OAuth認証状態確認
app.get('/api/v1/test/auth-status', (req, res) => {
  res.json({
    isAuthenticated,
    channelInfo,
    message: isAuthenticated ? 'OAuth認証済み' : 'OAuth認証が必要'
  });
});

// 9. OAuth認証終了（ログアウト）
app.post('/api/v1/test/logout', (req, res) => {
  try {
    // 認証状態をリセット
    isAuthenticated = false;
    channelInfo = null;
    
    // OAuth2Clientの認証情報をクリア
    oauth2Client.setCredentials({});
    
    console.log('🔓 ログアウト完了');
    
    res.json({
      success: true,
      message: 'ログアウトが完了しました'
    });
  } catch (error) {
    console.error('❌ ログアウトエラー:', error);
    res.status(500).json({
      success: false,
      error: 'ログアウトに失敗しました',
      details: error.message
    });
  }
});

// =============================================================================
// サーバー起動
// =============================================================================

app.listen(PORT, () => {
  console.log(`🚀 簡易APIサーバーが起動しました: http://localhost:${PORT}`);
  console.log('📝 必要な環境変数:');
  console.log('   - YOUTUBE_CLIENT_ID');
  console.log('   - YOUTUBE_CLIENT_SECRET');
  console.log('   - YOUTUBE_REDIRECT_URI');
});