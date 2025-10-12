"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Download, 
  Loader2, 
  Plus, 
  Eye, 
  Users,
  Factory,
  Building2,
  ShoppingCart,
  Truck,
  Monitor,
  Heart,
  GraduationCap,
  School,
  Building,
  Plane
} from "lucide-react";
import Link from "next/link";

interface CompanyResult {
  title: string;
  url: string;
  text: string;
  score?: number; // scoreはオプショナルに変更
  id?: string;
}

interface LeadData {
  companyId: string;
  companyName: string;
  url: string;
  description: string;
  industry: string; // 業界情報を追加
  region: string; // 地域情報を追加
  phoneNumber?: string; // 電話番号を追加
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  nextAction?: string;
  nextActionDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const industries = [
  "製造業",
  "建設業",
  "小売業",
  "運輸業",
  "ITサービス業",
  "医療福祉",
  "教育",
  "学校",
  "行政",
  "観光",
];

const regions = [
  "北海道",
  "東北",
  "関東",
  "中部",
  "近畿",
  "中国",
  "四国",
  "九州",
];

const prefectures = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県",
  "三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"
];

const companySizes = [
  "すべて",
  "大企業",
  "中堅企業", 
  "中小企業",
  "ベンチャー企業",
];

// 業界アイコンのマッピング
const getIndustryIcon = (industry: string) => {
  const iconMap: { [key: string]: { component: any, color: string } } = {
    "製造業": { component: Factory, color: "text-blue-600" },
    "建設業": { component: Building2, color: "text-orange-600" },
    "小売業": { component: ShoppingCart, color: "text-green-600" },
    "運輸業": { component: Truck, color: "text-purple-600" },
    "ITサービス業": { component: Monitor, color: "text-cyan-600" },
    "医療福祉": { component: Heart, color: "text-red-600" },
    "教育": { component: GraduationCap, color: "text-indigo-600" },
    "学校": { component: School, color: "text-yellow-600" },
    "行政": { component: Building, color: "text-gray-600" },
    "観光": { component: Plane, color: "text-pink-600" },
  };
  
  const iconData = iconMap[industry];
  if (iconData) {
    const IconComponent = iconData.component;
    return <IconComponent className={`h-4 w-4 ${iconData.color}`} />;
  }
  return <Factory className="h-4 w-4 text-blue-600" />;
};

export default function Home() {
  const { data: session } = useSession();
  const [industry, setIndustry] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [companySize, setCompanySize] = useState<string>("all");
  const [searchLimit, setSearchLimit] = useState<number>(20);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<{[key: string]: CompanyResult[]}>({});
  const [selectedCompany, setSelectedCompany] = useState<CompanyResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [addedCompanies, setAddedCompanies] = useState<Set<string>>(new Set());

  // コンポーネントマウント時に追加済み企業をチェック
  useEffect(() => {
    const existingLeads = JSON.parse(localStorage.getItem('leads') || '[]');
    const addedSet = new Set<string>();
    existingLeads.forEach((lead: LeadData) => {
      addedSet.add(lead.companyName);
      addedSet.add(lead.url);
    });
    setAddedCompanies(addedSet);
  }, []);

  const handleSearch = async () => {
    if (!industry || !region) {
      setError("業界と地域を両方選択してください");
      return;
    }

    // キャッシュキーを作成
    const cacheKey = `${industry}_${region}_${companySize}_${searchLimit}`;
    
    // キャッシュされたデータがあるかチェック
    if (savedSearches[cacheKey]) {
      setResults(savedSearches[cacheKey]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/exa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ industry, region, companySize, limit: searchLimit }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "検索に失敗しました");
      }

      // 検索件数を制限
      const limitedResults = data.results.slice(0, searchLimit);
      
      // キャッシュに保存
      setSavedSearches(prev => ({
        ...prev,
        [cacheKey]: limitedResults
      }));
      
      setResults(limitedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLeads = (result: CompanyResult) => {
    // 既に追加されているかチェック（URLベース + 企業名ベース）
    const existingLeads = JSON.parse(localStorage.getItem('leads') || '[]');
    
    // 1. URLベースの重複チェック（最優先）
    const isAlreadyAddedByUrl = existingLeads.some((lead: LeadData) => lead.url === result.url);
    
    // 2. 企業名ベースの重複チェック（フォールバック）
    const isAlreadyAddedByName = existingLeads.some((lead: LeadData) => 
      lead.companyName.toLowerCase().replace(/[^\w]/g, '') === result.title.toLowerCase().replace(/[^\w]/g, '')
    );
    
    if (isAlreadyAddedByUrl || isAlreadyAddedByName) {
      const reason = isAlreadyAddedByUrl ? 'URL' : '企業名';
      alert(`この企業は既に営業リストに追加されています（${reason}重複）。`);
      return;
    }

    const newLead: LeadData = {
      companyId: result.id || `company_${Date.now()}`,
      companyName: result.title,
      url: result.url,
      description: result.text,
      industry: industry, // 現在選択されている業界
      region: region, // 現在選択されている地域
      phoneNumber: extractPhoneNumber(result.text), // 電話番号を抽出
      status: 'new',
      priority: 'medium',
      assignedTo: '',
      nextAction: '',
      nextActionDate: '',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // ローカルストレージに保存
    const updatedLeads = [...existingLeads, newLead];
    localStorage.setItem('leads', JSON.stringify(updatedLeads));
    
    // 状態を即座に更新して追加済み状態を反映
    setAddedCompanies(prev => {
      const newSet = new Set(prev);
      newSet.add(result.title);
      newSet.add(result.url);
      return newSet;
    });
  };

  // 営業リストに追加済みかチェックする関数（状態ベース）
  const isLeadAlreadyAdded = (companyUrl: string, companyName: string) => {
    return addedCompanies.has(companyUrl) || addedCompanies.has(companyName);
  };

  // 電話番号を抽出する関数
  const extractPhoneNumber = (text: string): string | undefined => {
    // 日本の電話番号のパターンにマッチ
    const phonePatterns = [
      /0\d{2,4}-\d{2,4}-\d{4}/g, // 03-1234-5678
      /0\d{9,10}/g, // 0312345678
      /\(\d{2,4}\)\s*\d{2,4}-\d{4}/g, // (03) 1234-5678
      /TEL[：:]\s*([0-9-]+)/gi, // TEL: 03-1234-5678
      /電話[：:]\s*([0-9-]+)/gi, // 電話: 03-1234-5678
      /Tel[：:]\s*([0-9-]+)/gi, // Tel: 03-1234-5678
    ];

    for (const pattern of phonePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].replace(/[^\d-]/g, '');
      }
    }
    return undefined;
  };

  const openCompanyModal = (company: CompanyResult) => {
    setSelectedCompany(company);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCompany(null);
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;

    const headers = ["企業名", "URL", "概要", "スコア"];
    const csvContent = [
      headers.join(","),
      ...results.map((row) =>
        [
          `"${row.title.replace(/"/g, '""')}"`,
          `"${row.url}"`,
          `"${row.text.replace(/"/g, '""').substring(0, 500)}"`,
          row.score ? row.score.toFixed(4) : 'N/A',
        ].join(",")
      ),
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `企業リスト_${industry}_${region}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-[95vw] px-4">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl">企業検索システム</CardTitle>
                <CardDescription>
                  業界と地域を選択して、企業情報を検索します
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/leads">
                  <Button variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    営業リスト管理
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  ログアウト
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">業界</label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger>
                    <SelectValue placeholder="業界を選択">
                      {industry ? (
                        <div className="flex items-center gap-2">
                          {getIndustryIcon(industry)}
                          <span>{industry}</span>
                        </div>
                      ) : (
                        "業界を選択"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind}>
                        <div className="flex items-center gap-2">
                          {getIndustryIcon(ind)}
                          <span>{ind}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">地域・都道府県</label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="地域または都道府県を選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100">地域</div>
                    {regions.map((reg) => (
                      <SelectItem key={reg} value={reg}>
                        {reg}
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 mt-2">都道府県</div>
                    {prefectures.map((pref) => (
                      <SelectItem key={pref} value={pref}>
                        {pref}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">企業規模</label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger>
                    <SelectValue placeholder="企業規模を選択">
                      {companySize !== "all" && companySize && (
                        <span>{companySizes.find(size => {
                          if (size === "すべて") return companySize === "all";
                          if (size === "大企業") return companySize === "large";
                          if (size === "中堅企業") return companySize === "medium";
                          if (size === "中小企業") return companySize === "small";
                          if (size === "ベンチャー企業") return companySize === "venture";
                          return false;
                        })}</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {companySizes.map((size) => {
                      let value = "all";
                      if (size === "大企業") value = "large";
                      else if (size === "中堅企業") value = "medium";
                      else if (size === "中小企業") value = "small";
                      else if (size === "ベンチャー企業") value = "venture";
                      
                      return (
                        <SelectItem key={size} value={value}>
                          {size}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">検索件数</label>
                <Select value={searchLimit.toString()} onValueChange={(value) => setSearchLimit(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="件数を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10件</SelectItem>
                    <SelectItem value="20">20件</SelectItem>
                    <SelectItem value="50">50件</SelectItem>
                    <SelectItem value="100">100件</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={loading || !industry || !region}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      検索中...
                    </>
                  ) : (
                    "確定"
                  )}
                </Button>
              </div>
            </div>
            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}
            
            {/* キャッシュ情報表示 */}
            {Object.keys(savedSearches).length > 0 && (
              <div className="mt-4 rounded-md bg-blue-50 p-4 text-sm text-blue-800">
                <div className="font-medium mb-2">保存された検索結果:</div>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(savedSearches).map(([key, data]) => (
                    <div key={key} className="flex justify-between items-center">
                      <span>{key.replace(/_/g, ' ')} ({data.length}件)</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResults(data)}
                      >
                        表示
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>検索結果</CardTitle>
                  <CardDescription>
                    {results.length}件の企業が見つかりました
                  </CardDescription>
                </div>
                <Button onClick={handleExportCSV} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  CSVエクスポート
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">企業名</TableHead>
                      <TableHead className="w-[250px]">URL</TableHead>
                      <TableHead className="w-[400px]">概要</TableHead>
                      <TableHead className="w-[80px] text-right">スコア</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {result.title}
                        </TableCell>
                        <TableCell>
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {result.url.substring(0, 50)}...
                          </a>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="line-clamp-2 text-sm text-gray-600">
                            {result.text}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {result.score ? result.score.toFixed(4) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openCompanyModal(result)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              詳細
                            </Button>
                            {isLeadAlreadyAdded(result.url, result.title) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                追加済み
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleAddToLeads(result)}
                                data-company={result.title}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                営業リスト
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 企業詳細モーダル */}
        {showModal && selectedCompany && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">企業詳細情報</h3>
                <Button variant="outline" onClick={closeModal}>
                  ✕
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-lg mb-2">{selectedCompany.title}</h4>
                  <div className="flex items-center gap-2 mb-2">
                    {getIndustryIcon(industry)}
                    <span className="text-sm text-gray-600">{industry} / {region}</span>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium mb-2">ウェブサイト</h5>
                  <a 
                    href={selectedCompany.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {selectedCompany.url}
                  </a>
                </div>

                {selectedCompany.score && (
                  <div>
                    <h5 className="font-medium mb-2">関連度スコア</h5>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {selectedCompany.score.toFixed(4)}
                    </span>
                  </div>
                )}

                <div>
                  <h5 className="font-medium mb-2">企業概要</h5>
                  <div className="bg-gray-50 p-3 rounded text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedCompany.text}
                  </div>
                </div>

                {extractPhoneNumber(selectedCompany.text) && (
                  <div>
                    <h5 className="font-medium mb-2">電話番号</h5>
                    <a 
                      href={`tel:${extractPhoneNumber(selectedCompany.text)}`}
                      className="text-blue-600 hover:underline font-mono"
                    >
                      {extractPhoneNumber(selectedCompany.text)}
                    </a>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={() => {
                      if (!isLeadAlreadyAdded(selectedCompany.url, selectedCompany.title)) {
                        handleAddToLeads(selectedCompany);
                      }
                    }}
                    disabled={isLeadAlreadyAdded(selectedCompany.url, selectedCompany.title)}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {isLeadAlreadyAdded(selectedCompany.url, selectedCompany.title) 
                      ? "追加済み" 
                      : "営業リストに追加"
                    }
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(selectedCompany.url, '_blank')}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    サイトを開く
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

