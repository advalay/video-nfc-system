# 動画配信システム セキュリティ証明書

**発行日**: 2026年1月16日  
**発行者**: Advalay株式会社  
**対象システム**: NFCタグ付きキーホルダー向け動画配信システム

---

## 1. データ保管場所の証明

本システムのすべてのインフラストラクチャは、**AWS東京リージョン（ap-northeast-1）** に配置されています。
お客様のデータは日本国内のAWSデータセンターで処理・保管され、海外サーバーへの転送は発生しません。

---

## 2. リソース別リージョン証明

### 2.1 データストレージ（Amazon S3）

| 項目 | 値 |
|-----|-----|
| バケット名 | `video-nfc-videos-prod-271633506783` |
| リージョン | **ap-northeast-1（東京）** |

**AWS CLI出力:**
```json
{
    "LocationConstraint": "ap-northeast-1"
}
```

### 2.2 認証基盤（Amazon Cognito）

| 項目 | 値 |
|-----|-----|
| ユーザープール名 | `video-nfc-prod-users` |
| ユーザープールID | `ap-northeast-1_tRsVTmwXn` |
| ARN | `arn:aws:cognito-idp:ap-northeast-1:271633506783:userpool/ap-northeast-1_tRsVTmwXn` |
| リージョン | **ap-northeast-1（東京）** |

### 2.3 フロントエンドホスティング（AWS Amplify）

| 項目 | 値 |
|-----|-----|
| アプリ名 | `video-nfc-system` |
| ARN | `arn:aws:amplify:ap-northeast-1:271633506783:apps/d3vnoskfyyh2d2` |
| リージョン | **ap-northeast-1（東京）** |

### 2.4 API基盤（Amazon API Gateway）

| 項目 | 値 |
|-----|-----|
| API名 | `video-nfc-api-prod` |
| API ID | `7two0yvy5k` |
| リージョン | **ap-northeast-1（東京）** |

### 2.5 コンテンツ配信（Amazon CloudFront）

| 項目 | 値 |
|-----|-----|
| ドメイン | `d1zvysir546x0y.cloudfront.net` |
| オリジン | `video-nfc-videos-prod-271633506783.s3.ap-northeast-1.amazonaws.com` |
| オリジンリージョン | **ap-northeast-1（東京）** |

---

## 3. セキュリティ対策

### 3.1 通信の暗号化
- すべてのAPI通信はHTTPS（TLS 1.2以上）で暗号化
- CloudFront経由の動画配信もHTTPSで保護

### 3.2 保存データの暗号化
- S3バケット: サーバーサイド暗号化（SSE-S3）を適用
- DynamoDB: 保存時暗号化を有効化

### 3.3 アクセス制御
- AWS Cognitoによる認証・認可
- ロールベースアクセス制御（RBAC）
- 組織・販売店単位のデータ分離

---

## 4. AWSコンプライアンス

AWSは以下の認証・認定を取得しています：

- **ISO 27001** - 情報セキュリティマネジメント
- **ISO 27017** - クラウドセキュリティ
- **ISO 27018** - クラウドプライバシー
- **SOC 1, 2, 3** - サービス組織統制報告書
- **PCI DSS Level 1** - ペイメントカード業界データセキュリティ基準

詳細: https://aws.amazon.com/jp/compliance/

---

## 5. 東京リージョンについて

AWS東京リージョン（ap-northeast-1）は、日本国内に所在するデータセンター群です。

- **所在地**: 東京都およびその周辺
- **アベイラビリティゾーン**: 3つ以上
- **運用開始**: 2011年3月

公式情報: https://aws.amazon.com/jp/about-aws/global-infrastructure/regions_az/

---

**本証明書に関するお問い合わせ**  
Advalay株式会社  
担当: 柴山  
Email: k.shibayama@advalay.jp
