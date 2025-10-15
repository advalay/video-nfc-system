# 📧 メール送信設定ガイド

## 🚨 重要な注意事項

承認管理でメール送信を行うには、**必ず確認メールをクリック**する必要があります。

## 📬 確認メールの処理手順

### 1. 申請作成時の確認メール

申請を作成すると、指定したメールアドレスに以下のようなメールが届きます：

```
件名: AWS Notification - Subscription Confirmation
送信者: no-reply@sns.amazonaws.com

内容:
You have chosen to subscribe to the topic:
arn:aws:sns:ap-northeast-1:271633506783:video-nfc-alerts-dev

To confirm this subscription, click or visit the link below:
[Confirm subscription] ← これをクリック！
```

### 2. 確認手順

1. **メールボックスを確認**（迷惑メールフォルダも含む）
2. **「Confirm subscription」リンクをクリック**
3. **確認完了後、承認管理のメール送信が機能します**

### 3. 確認後の動作

- ✅ 申請フォームURLの送信
- ✅ 承認待ち通知
- ✅ 承認完了通知
- ✅ 却下通知

## 🔧 トラブルシューティング

### 確認メールが見つからない場合

1. **迷惑メールフォルダを確認**
2. **プロモーションタブを確認**（Gmailの場合）
3. **別のメールアドレスで再設定**

### 確認メールをクリックしても機能しない場合

1. **ブラウザのキャッシュをクリア**
2. **ページをリロード**
3. **再度申請を作成**

## 📞 サポート

問題が解決しない場合は、システム管理者にお問い合わせください。




